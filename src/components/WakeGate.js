'use client';

import { useEffect, useState } from 'react';

// Lambda Function URL that starts the backend EC2 box.
const WAKE_URL = 'https://pd7atkm7p67oamta36jhkdx5fm0njcye.lambda-url.eu-west-2.on.aws/';
// Backend health endpoint to poll until it's up.
const HEALTH_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api\/?$/, '') + '/health';

const POLL_INTERVAL_MS = 4000;
const MAX_WAIT_MS = 150000; // 2.5 min

export default function WakeGate({ children }) {
  const [ready, setReady] = useState(false);
  const [waking, setWaking] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkHealth() {
      try {
        const res = await fetch(HEALTH_URL, { method: 'GET', cache: 'no-store' });
        return res.ok || res.status === 405; // 405 = up (HEAD/GET mismatch)
      } catch {
        return false;
      }
    }

    async function run() {
      // 1. Backend already up? Skip the whole thing.
      if (await checkHealth()) {
        if (!cancelled) setReady(true);
        return;
      }

      // 2. Backend down — wake it.
      if (!cancelled) setWaking(true);
      try {
        await fetch(WAKE_URL, { method: 'GET', cache: 'no-store' });
      } catch {
        // best-effort; we still poll below
      }

      // 3. Poll health until up or timeout.
      const start = Date.now();
      while (!cancelled && Date.now() - start < MAX_WAIT_MS) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        if (await checkHealth()) {
          if (!cancelled) setReady(true);
          return;
        }
      }
      if (!cancelled) setError(true);
    }

    run();
    return () => { cancelled = true; };
  }, []);

  if (ready) return children;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '1.25rem',
      fontFamily: 'system-ui, sans-serif', color: '#1a202c', padding: '2rem',
      textAlign: 'center',
    }}>
      <div style={{
        width: 44, height: 44, border: '4px solid #e2e8f0',
        borderTopColor: '#2d3748', borderRadius: '50%',
        animation: 'wg-spin 0.9s linear infinite',
      }} />
      <style>{`@keyframes wg-spin { to { transform: rotate(360deg); } }`}</style>
      {error ? (
        <>
          <h2 style={{ margin: 0 }}>Backend is taking longer than usual</h2>
          <p style={{ margin: 0, color: '#4a5568', maxWidth: 420 }}>
            The server is still starting up. Refresh the page in a moment to try again.
          </p>
          <button onClick={() => window.location.reload()} style={{
            padding: '0.6rem 1.2rem', borderRadius: 8, border: 'none',
            background: '#2d3748', color: '#fff', cursor: 'pointer', fontSize: '1rem',
          }}>Retry</button>
        </>
      ) : (
        <>
          <h2 style={{ margin: 0 }}>Starting up…</h2>
          <p style={{ margin: 0, color: '#4a5568', maxWidth: 420 }}>
            {waking
              ? 'Waking the server — this takes about a minute on first visit.'
              : 'Connecting…'}
          </p>
        </>
      )}
    </div>
  );
}