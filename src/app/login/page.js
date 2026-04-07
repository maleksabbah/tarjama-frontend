'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, username);
      }
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-5">
      <div className="w-full max-w-[400px] animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-2">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-brand-500">
              <rect x="2" y="10" width="3" height="12" rx="1.5" fill="currentColor" opacity="0.6">
                <animate attributeName="height" values="12;20;12" dur="1s" repeatCount="indefinite" />
                <animate attributeName="y" values="10;6;10" dur="1s" repeatCount="indefinite" />
              </rect>
              <rect x="8" y="6" width="3" height="20" rx="1.5" fill="currentColor" opacity="0.8">
                <animate attributeName="height" values="20;8;20" dur="1.2s" repeatCount="indefinite" />
                <animate attributeName="y" values="6;12;6" dur="1.2s" repeatCount="indefinite" />
              </rect>
              <rect x="14" y="4" width="3" height="24" rx="1.5" fill="currentColor">
                <animate attributeName="height" values="24;14;24" dur="0.8s" repeatCount="indefinite" />
                <animate attributeName="y" values="4;9;4" dur="0.8s" repeatCount="indefinite" />
              </rect>
              <rect x="20" y="8" width="3" height="16" rx="1.5" fill="currentColor" opacity="0.8">
                <animate attributeName="height" values="16;24;16" dur="1.1s" repeatCount="indefinite" />
                <animate attributeName="y" values="8;4;8" dur="1.1s" repeatCount="indefinite" />
              </rect>
              <rect x="26" y="11" width="3" height="10" rx="1.5" fill="currentColor" opacity="0.6">
                <animate attributeName="height" values="10;18;10" dur="0.9s" repeatCount="indefinite" />
                <animate attributeName="y" values="11;7;11" dur="0.9s" repeatCount="indefinite" />
              </rect>
            </svg>
            <h1 className="text-3xl font-bold gradient-text">Tarjama</h1>
          </div>
          <p className="text-muted text-sm">Arabic Speech Recognition Platform</p>
        </div>

        {/* Card */}
        <div className="bg-surface-card border border-line rounded-2xl p-8">
          {/* Toggle */}
          <div className="flex bg-surface rounded-xl p-0.5 mb-7">
            {['Sign In', 'Sign Up'].map((label, i) => (
              <button
                key={label}
                onClick={() => { setIsLogin(i === 0); setError(''); }}
                className={`flex-1 py-2.5 rounded-[10px] text-sm font-semibold transition-all
                  ${(i === 0 ? isLogin : !isLogin)
                    ? 'bg-brand-500 text-white'
                    : 'text-muted'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {!isLogin && (
              <input
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="px-4 py-3 bg-surface-input border border-line rounded-xl text-sm outline-none focus:border-brand-500 transition-colors"
              />
            )}
            <input
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-4 py-3 bg-surface-input border border-line rounded-xl text-sm outline-none focus:border-brand-500 transition-colors"
              required
            />
            <input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="px-4 py-3 bg-surface-input border border-line rounded-xl text-sm outline-none focus:border-brand-500 transition-colors"
              required
            />

            {error && (
              <div className="px-3.5 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-[13px]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full mt-2 py-3.5 rounded-xl text-white text-[15px] font-semibold transition-all
                ${loading ? 'bg-dim opacity-70 cursor-wait' : 'gradient-bg hover:opacity-90 cursor-pointer'}`}
            >
              {loading ? '...' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
