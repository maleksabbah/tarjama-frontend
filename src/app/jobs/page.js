'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => {
      api.listJobs()
        .then(data => setJobs(Array.isArray(data) ? data : data?.jobs || []))
        .catch(() => {})
        .finally(() => setLoading(false));
    };
    load();
    const i = setInterval(load, 10000);
    return () => clearInterval(i);
  }, []);

  const statusCls = {
    queued: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    processing: 'bg-brand-500/10 text-brand-400 border-brand-500/20',
    completed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    done: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    failed: 'bg-red-500/10 text-red-400 border-red-500/20',
    cancelled: 'bg-gray-500/10 text-muted border-gray-500/20',
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-[22px] font-bold mb-1.5">Job History</h2>
      <p className="text-muted text-sm mb-7">Track your transcription jobs</p>

      {loading ? (
        <div className="text-center py-10 text-muted animate-pulse">Loading jobs...</div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16 text-dim">
          <div className="text-4xl mb-3">📂</div>
          <div className="text-[15px] font-medium">No jobs yet</div>
          <div className="text-[13px] text-muted mt-1">Upload a video to get started</div>
          <button onClick={() => router.push('/upload')}
            className="mt-4 px-5 py-2 gradient-bg text-white text-sm rounded-lg font-medium">
            Upload Video
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {jobs.map((job, i) => (
            <div key={job.id || i}
              onClick={() => router.push(`/jobs/${job.id || job.job_id}`)}
              className="flex items-center justify-between px-5 py-4 bg-surface-card border border-line rounded-xl cursor-pointer transition-all hover:bg-surface-hover hover:border-brand-500/30 animate-slide-in"
              style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-lg">🎬</div>
                <div>
                  <div className="text-sm font-semibold mb-0.5">
                    {job.file_path ? job.file_path.split('/').pop() : `Job ${(job.id || job.job_id || '').slice(0, 8)}`}
                  </div>
                  <div className="text-[11px] text-muted font-mono">
                    {job.created_at ? new Date(job.created_at).toLocaleString() : ''}
                    {job.dialect && ` · ${job.dialect}`}
                  </div>
                </div>
              </div>
              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md border capitalize ${statusCls[job.status] || statusCls.queued}`}>
                {job.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
