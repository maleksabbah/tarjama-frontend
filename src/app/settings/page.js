'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';

export default function SettingsPage() {
  const { user } = useAuth();
  const [quota, setQuota] = useState(null);

  useEffect(() => {
    api.quota().then(setQuota).catch(() => {});
  }, []);

  return (
    <div className="animate-fade-in">
      <h2 className="text-[22px] font-bold mb-1.5">Settings</h2>
      <p className="text-muted text-sm mb-7">Manage your account and configuration</p>

      {/* Account */}
      <div className="bg-surface-card border border-line rounded-xl p-6 mb-4">
        <h3 className="text-[15px] font-semibold mb-4">Account</h3>
        {user && (
          <div className="flex flex-col gap-3">
            {[
              ['Username', user.username || '—'],
              ['Email', user.email || '—'],
              ['Member since', user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-[13px]">
                <span className="text-muted">{label}</span>
                <span>{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quota */}
      {quota && (
        <div className="bg-surface-card border border-line rounded-xl p-6 mb-4">
          <h3 className="text-[15px] font-semibold mb-4">Usage</h3>
          <div className="h-1.5 bg-surface rounded-full overflow-hidden mb-2">
            <div className="h-full rounded-full gradient-bg transition-all duration-500"
              style={{ width: `${Math.min(100, ((quota.used || 0) / (quota.limit || 1)) * 100)}%` }} />
          </div>
          <div className="text-xs text-muted">{quota.used || 0} / {quota.limit || '∞'} jobs used</div>
        </div>
      )}

      {/* API Config */}
      <div className="bg-surface-card border border-line rounded-xl p-6">
        <h3 className="text-[15px] font-semibold mb-4">API Configuration</h3>
        <label className="text-xs text-muted mb-1.5 block">Gateway URL</label>
        <input
          defaultValue={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}
          readOnly
          className="w-full px-3.5 py-2.5 bg-surface-input border border-line rounded-lg text-[13px] font-mono outline-none text-muted"
        />
        <p className="text-[11px] text-dim mt-2">
          Set via NEXT_PUBLIC_API_URL environment variable. Change when deploying to a remote server.
        </p>
      </div>
    </div>
  );
}
