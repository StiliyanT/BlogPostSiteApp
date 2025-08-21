import { useEffect, useState } from 'react';
import { API_BASE } from '../lib/urls';
import { useSearchParams, Link, Navigate } from 'react-router-dom';

export default function ConfirmAccount() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  const userId = params.get('userId');
  const token = params.get('token');

  useEffect(() => {
    const run = async () => {
      if (!userId || !token) {
        setStatus('error');
        setMessage('Invalid confirmation link');
        return;
      }
      try {
  const res = await fetch(`${API_BASE}/api/auth/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, token })
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || 'Confirmation failed');
        }
        setStatus('ok');
        setMessage('Your email has been confirmed. You can sign in now.');
      } catch (e: unknown) {
        setStatus('error');
        setMessage(e instanceof Error ? e.message : 'Confirmation failed');
      }
    };
    run();
  }, [userId, token]);

  if (!userId || !token) {
    return <Navigate to="/" replace />;
  }

  return (
    <main style={{ maxWidth: 560, margin: '48px auto', padding: 16 }}>
      <h2>Confirming your account…</h2>
      {status !== 'idle' && (
        <p style={{ color: status === 'ok' ? 'green' : 'crimson' }}>{message}</p>
      )}
      {status === 'ok' && (
        <p><Link to="/login">Go to Login</Link></p>
      )}
    </main>
  );
}
