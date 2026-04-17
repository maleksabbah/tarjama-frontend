'use client';
import { useState, useRef, useEffect } from 'react';
import api from '@/lib/api';

export default function LivePage() {
  const [recording, setRecording] = useState(false);
  const [connected, setConnected] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [current, setCurrent] = useState('');
  const [error, setError] = useState('');
  const [duration, setDuration] = useState(0);
  const ws = useRef(null);
  const recorder = useRef(null);
  const stream = useRef(null);
  const endRef = useRef(null);
  const timer = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [transcript, current]);
  useEffect(() => () => { stopRecording(); if (timer.current) clearInterval(timer.current); }, []);

  const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  const getFreshToken = async () => {
    // Try to refresh token first to ensure it's valid
    try {
      api.loadTokens();
      if (api.refreshToken) {
        await api.refresh();
      }
      return api.token;
    } catch {
      return typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    }
  };

  const stopRecording = () => {
    recorder.current?.stop();
    stream.current?.getTracks().forEach(t => t.stop());
    ws.current?.close();
    if (timer.current) clearInterval(timer.current);
    setRecording(false);
    setConnected(false);
  };

  const startRecording = async () => {
    setError('');
    try {
      // Refresh token before connecting
      const token = await getFreshToken();
      if (!token) {
        setError('Not authenticated. Please log in again.');
        return;
      }

      const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const wsUrl = `wss://${host}/api/ws/live?token=${token}`;

      const s = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true } });
      stream.current = s;
      const socket = new WebSocket(wsUrl);
      ws.current = socket;
      socket.onopen = () => {
        setConnected(true);
        const mr = new MediaRecorder(s, { mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm' });
        recorder.current = mr;
        mr.ondataavailable = (e) => { if (e.data.size > 0 && socket.readyState === WebSocket.OPEN) socket.send(e.data); };
        mr.start(500);
        setRecording(true);
        setDuration(0);
        timer.current = setInterval(() => setDuration(d => d + 1), 1000);
      };
      socket.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'partial') setCurrent(data.text || '');
          else if (data.type === 'final') {
            if (data.text?.trim()) setTranscript(p => [...p, { text: data.text, time: new Date().toLocaleTimeString() }]);
            setCurrent('');
          } else if (data.type === 'error') setError(data.message || 'Error');
        } catch {}
      };
      socket.onerror = () => { setError('WebSocket connection failed'); stopRecording(); };
      socket.onclose = (e) => {
        setConnected(false);
        setRecording(false);
        if (e.code === 4001) setError('Session expired. Please refresh the page and try again.');
      };
    } catch (err) {
      setError('Microphone access denied. Please allow microphone access in your browser.');
    }
  };

  return (
    <div style={{ padding: 32, maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Live Transcription</h1>
      <p style={{ color: '#888', marginBottom: 24 }}>Speak into your microphone for real-time Arabic transcription.</p>

      {error && <div style={{ background: '#fee', border: '1px solid #fcc', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#c00' }}>{error}</div>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button
          onClick={recording ? stopRecording : startRecording}
          style={{ padding: '12px 28px', borderRadius: 8, border: 'none', background: recording ? '#dc2626' : '#7c3aed', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
        >
          {recording ? '⏹ Stop' : '🎤 Start Recording'}
        </button>
        {recording && <span style={{ color: '#888', fontSize: 14 }}>{fmt(duration)} · {connected ? '🟢 Connected' : '🔴 Connecting...'}</span>}
      </div>

      <div style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: 12, padding: 24, minHeight: 300, maxHeight: 500, overflowY: 'auto' }}>
        {transcript.length === 0 && !current && (
          <p style={{ color: '#555', textAlign: 'center', marginTop: 80 }}>Transcription will appear here...</p>
        )}
        {transcript.map((t, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <span style={{ color: '#555', fontSize: 11, marginRight: 8 }}>{t.time}</span>
            <span style={{ color: '#e2e8f0', fontSize: 15, direction: 'rtl' }}>{t.text}</span>
          </div>
        ))}
        {current && <div style={{ color: '#7c3aed', fontSize: 15, fontStyle: 'italic', direction: 'rtl' }}>{current}</div>}
        <div ref={endRef} />
      </div>

      {transcript.length > 0 && (
        <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
          <button onClick={() => { setTranscript([]); setCurrent(''); }} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #333', background: 'transparent', color: '#888', cursor: 'pointer' }}>Clear</button>
          <button onClick={() => navigator.clipboard.writeText(transcript.map(t => t.text).join('\n'))} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #7c3aed', background: 'transparent', color: '#7c3aed', cursor: 'pointer' }}>Copy All</button>
        </div>
      )}
    </div>
  );
}
