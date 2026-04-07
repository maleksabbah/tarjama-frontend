'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [quota, setQuota] = useState(null);
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    Promise.all([
      api.quota().catch(() => null),
      api.listJobs().catch(() => []),
    ]).then(([q, j]) => {
      setQuota(q);
      setJobs(Array.isArray(j) ? j : j?.jobs || []);
    });
  }, []);

  const stats = {
    total: jobs.length,
    completed: jobs.filter(j => ['completed', 'done'].includes(j.status)).length,
    processing: jobs.filter(j => ['processing', 'queued', 'pending'].includes(j.status)).length,
    failed: jobs.filter(j => j.status === 'failed').length,
  };

  const cards = [
    { label: 'Total Jobs', value: stats.total, color: 'text-brand-500' },
    { label: 'Completed', value: stats.completed, color: 'text-emerald-500' },
    { label: 'In Progress', value: stats.processing, color: 'text-amber-500' },
    { label: 'Failed', value: stats.failed, color: 'text-red-400' },
  ];

  return (
    <div className="animate-fade-in">
      <h2 className="text-[22px] font-bold mb-1.5">
        Welcome{user?.username ? `, ${user.username}` : ''}
      </h2>
      <p className="text-muted text-sm mb-7">Your ASR platform overview</p>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-7">
        {cards.map((c, i) => (
          <div key={i} className="bg-surface-card border border-line rounded-xl p-5"
            style={{ animationDelay: `${i * 0.08}s` }}>
            <div className={`text-[28px] font-bold font-mono ${c.color}`}>{c.value}</div>
            <div className="text-xs text-muted mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Quota */}
      {quota && (
        <div className="bg-surface-card border border-line rounded-xl p-5 mb-7">
          <div className="text-sm font-semibold mb-3">Usage Quota</div>
          <div className="h-1.5 bg-surface rounded-full overflow-hidden">
            <div className="h-full rounded-full gradient-bg transition-all duration-500"
              style={{ width: `${Math.min(100, ((quota.used || 0) / (quota.limit || 1)) * 100)}%` }} />
          </div>
          <div className="text-xs text-muted mt-2">
            {quota.used || 0} / {quota.limit || '∞'} jobs used
          </div>
        </div>
      )}

      {/* Quick Upload */}
      <button onClick={() => router.push('/upload')}
        className="w-full py-4 border border-dashed border-line rounded-xl text-muted text-sm flex items-center justify-center gap-2 transition-all hover:border-brand-500 hover:text-brand-400 hover:bg-brand-500/5">
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
        </svg>
        Upload a new video
      </button>

      {/* Recent Jobs */}
      {jobs.length > 0 && (
        <div className="mt-7">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Recent Jobs</h3>
            <button onClick={() => router.push('/jobs')} className="text-xs text-brand-400 hover:text-brand-500">
              View all →
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {jobs.slice(0, 5).map((job, i) => (
              <div key={job.id || i}
                onClick={() => router.push(`/jobs/${job.id || job.job_id}`)}
                className="flex items-center justify-between px-4 py-3 bg-surface-card border border-line rounded-lg cursor-pointer hover:bg-surface-hover hover:border-brand-500/30 transition-all">
                <div className="flex items-center gap-3">
                  <span className="text-lg">🎬</span>
                  <div>
                    <div className="text-[13px] font-medium">
                      {job.file_path ? job.file_path.split('/').pop() : `Job ${(job.id || '').slice(0, 8)}`}
                    </div>
                    <div className="text-[11px] text-muted font-mono">
                      {job.created_at ? new Date(job.created_at).toLocaleString() : ''}
                    </div>
                  </div>
                </div>
                <StatusBadge status={job.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    queued: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    processing: 'bg-brand-500/10 text-brand-400 border-brand-500/20',
    completed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    done: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    failed: 'bg-red-500/10 text-red-400 border-red-500/20',
    cancelled: 'bg-gray-500/10 text-muted border-gray-500/20',
  };
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md border capitalize ${map[status] || map.queued}`}>
      {status}
    </span>
  );
}
