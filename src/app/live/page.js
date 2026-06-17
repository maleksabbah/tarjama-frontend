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
    const base = process.env.NEXT_PUBLIC_WS_URL || 'wss://api.tarjma.app';
    return `${base}/api/ws/live?token=${encodeURIComponent(token || "")}`;
  }

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
        const samplesPerBatch = TARGET_SAMPLE_RATE / 2;

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
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    if (worklet.current) { try { worklet.current.disconnect(); } catch {} worklet.current = null; }
    if (audioCtx.current) { audioCtx.current.close().catch(() => {}); audioCtx.current = null; }
    if (stream.current) { stream.current.getTracks().forEach((t) => t.stop()); stream.current = null; }
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      try { ws.current.send(JSON.stringify({ type: "end" })); } catch {}
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
    <div className="animate-fade-in">
      <h1 className="text-[22px] font-bold mb-1.5">Live Transcription</h1>
      <p className="text-muted text-sm mb-7">
        Speak into your microphone for real-time Arabic transcription.
      </p>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3 mb-5">
          {error}
        </div>
      )}

      <div className="bg-surface-card border border-line rounded-xl p-5 mb-7">
        <div className="flex items-center gap-4">
          {!recording ? (
            <button
              onClick={startRecording}
              className="px-5 py-2.5 rounded-lg gradient-bg text-white text-sm font-medium flex items-center gap-2 transition-all hover:opacity-90"
            >
              <span className="w-2 h-2 rounded-full bg-white" />
              Start Recording
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="px-5 py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium flex items-center gap-2 transition-all hover:bg-red-600"
            >
              <span className="w-2 h-2 rounded-sm bg-white" />
              Stop Recording
            </button>
          )}

          {recording && (
            <span className="flex items-center gap-2 text-sm text-muted">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {formatDuration(duration)}
            </span>
          )}
          {connected && !recording && (
            <span className="text-sm text-green-400">Connected</span>
          )}
        </div>
      </div>

      {current && (
        <div className="bg-surface-card border border-line rounded-lg px-4 py-3 mb-4 text-muted italic text-sm" dir="rtl">
          {current}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {transcript.length === 0 && !current && (
          <div className="w-full py-10 border border-dashed border-line rounded-xl text-muted text-sm flex items-center justify-center">
            Your transcription will appear here.
          </div>
        )}
        {transcript.map((t, i) => (
          <div key={i} className="bg-surface-card border border-line rounded-lg px-4 py-3">
            <div className="text-[11px] text-muted font-mono mb-1">{t.time}</div>
            <div className="text-[15px]" dir="rtl">{t.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}