"use client";

import { useState, useRef } from "react";

export default function LivePage() {
  const [recording, setRecording] = useState(false);
  const [connected, setConnected] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [current, setCurrent] = useState("");
  const [error, setError] = useState("");
  const [duration, setDuration] = useState(0);

  const ws = useRef(null);
  const audioCtx = useRef(null);
  const stream = useRef(null);
  const worklet = useRef(null);
  const timer = useRef(null);

  const TARGET_SAMPLE_RATE = 16000;

  function getWsUrl() {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const host = window.location.host;
    const base = host.startsWith("app.") ? host.replace("app.", "api.") : host;
    return `${protocol}://${base}/api/ws/live?token=${encodeURIComponent(token || "")}`;
  }

  // Float32 [-1, 1] -> Int16 PCM, with proper clamping
  function downsampleAndQuantize(float32, sourceRate) {
    let samples;
    if (sourceRate === TARGET_SAMPLE_RATE) {
      samples = float32;
    } else {
      const ratio = sourceRate / TARGET_SAMPLE_RATE;
      const outLen = Math.floor(float32.length / ratio);
      samples = new Float32Array(outLen);
      for (let i = 0; i < outLen; i++) {
        const startIdx = Math.floor(i * ratio);
        const endIdx = Math.min(Math.floor((i + 1) * ratio), float32.length);
        let sum = 0;
        for (let j = startIdx; j < endIdx; j++) sum += float32[j];
        samples[i] = sum / Math.max(1, endIdx - startIdx);
      }
    }

    const out = new Int16Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      out[i] = Math.round(s * 32767);
    }
    return out;
  }

  const startRecording = async () => {
    setError("");
    try {
      // IMPORTANT: disable AGC/noise suppression/echo cancellation.
      // Chrome's default mic pipeline clips speech into saturation before
      // it reaches our Float32 samples, which breaks Whisper transcription.
      const s = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: TARGET_SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      stream.current = s;

      const socket = new WebSocket(getWsUrl());
      socket.binaryType = "arraybuffer";
      ws.current = socket;

      socket.onopen = async () => {
        setConnected(true);

        const ctx = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: TARGET_SAMPLE_RATE,
        });
        audioCtx.current = ctx;

        const source = ctx.createMediaStreamSource(s);

        const bufferSize = 4096;
        const processor = ctx.createScriptProcessor(bufferSize, 1, 1);
        worklet.current = processor;

        let batchBuffer = [];
        let batchSamples = 0;
        const samplesPerBatch = TARGET_SAMPLE_RATE / 2; // 500ms

        processor.onaudioprocess = (e) => {
          if (socket.readyState !== WebSocket.OPEN) return;
          const input = e.inputBuffer.getChannelData(0);
          batchBuffer.push(new Float32Array(input));
          batchSamples += input.length;

          if (batchSamples >= samplesPerBatch) {
            const combined = new Float32Array(batchSamples);
            let offset = 0;
            for (const part of batchBuffer) {
              combined.set(part, offset);
              offset += part.length;
            }
            batchBuffer = [];
            batchSamples = 0;

            const pcm = downsampleAndQuantize(combined, ctx.sampleRate);
            socket.send(pcm.buffer);
          }
        };

        source.connect(processor);
        processor.connect(ctx.destination);

        setRecording(true);
        setDuration(0);
        timer.current = setInterval(() => setDuration((d) => d + 1), 1000);
      };

      socket.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === "partial") setCurrent(data.text || "");
          else if (data.type === "final") {
            if (data.text?.trim()) {
              setTranscript((p) => [
                ...p,
                { text: data.text, time: new Date().toLocaleTimeString() },
              ]);
            }
            setCurrent("");
          } else if (data.type === "error") {
            setError(data.message || "Error");
          }
        } catch {}
      };
      socket.onerror = () => {
        setError("WebSocket connection failed");
        stopRecording();
      };
      socket.onclose = () => {
        setConnected(false);
        setRecording(false);
      };
    } catch (err) {
      setError("Microphone access denied. Please allow microphone access in your browser.");
    }
  };

  const stopRecording = () => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    if (worklet.current) {
      try {
        worklet.current.disconnect();
      } catch {}
      worklet.current = null;
    }
    if (audioCtx.current) {
      audioCtx.current.close().catch(() => {});
      audioCtx.current = null;
    }
    if (stream.current) {
      stream.current.getTracks().forEach((t) => t.stop());
      stream.current = null;
    }
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      try {
        ws.current.send(JSON.stringify({ type: "end" }));
      } catch {}
      ws.current.close();
    }
    setRecording(false);
    setConnected(false);
  };

  const formatDuration = (s) => {
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return `${m}:${ss.toString().padStart(2, "0")}`;
  };

  return (
    <div style={{ padding: 32, maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Live Transcription</h1>
      <p style={{ color: "#888", marginBottom: 24 }}>
        Speak into your microphone for real-time Arabic transcription.
      </p>

      {error && (
        <div
          style={{
            background: "#fee",
            border: "1px solid #fcc",
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 16,
            color: "#c00",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        {!recording ? (
          <button
            onClick={startRecording}
            style={{
              padding: "10px 20px",
              background: "#0070f3",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            style={{
              padding: "10px 20px",
              background: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            Stop Recording
          </button>
        )}
        {recording && <span style={{ color: "#888" }}>🔴 {formatDuration(duration)}</span>}
        {connected && !recording && <span style={{ color: "#0a0" }}>Connected</span>}
      </div>

      {current && (
        <div
          style={{
            background: "#f5f5f5",
            padding: 16,
            borderRadius: 8,
            marginBottom: 16,
            fontStyle: "italic",
            color: "#666",
          }}
        >
          {current}
        </div>
      )}

      <div>
        {transcript.map((t, i) => (
          <div
            key={i}
            style={{
              padding: 12,
              background: "#fafafa",
              border: "1px solid #eee",
              borderRadius: 8,
              marginBottom: 8,
            }}
          >
            <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>{t.time}</div>
            <div>{t.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
