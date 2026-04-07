'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';

export default function JobDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [job, setJob] = useState(null);
  const [progress, setProgress] = useState(null);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const intervalRef = useRef(null);

  const fetchJob = useCallback(async () => {
    try {
      const j = await api.getJob(id);
      setJob(j);

      if (['processing', 'queued', 'pending'].includes(j.status)) {
        try { setProgress(await api.getProgress(id)); } catch {}
      }

      if (['completed', 'done'].includes(j.status)) {
        try {
          const f = await api.listFiles(id);
          setFiles(Array.isArray(f) ? f : f?.files || []);
        } catch {}
        if (intervalRef.current) clearInterval(intervalRef.current);
      }

      if (j.status === 'failed' && intervalRef.current) clearInterval(intervalRef.current);
    } catch (e) {
      setError(e.message);
    }
  }, [id]);

  useEffect(() => {
    fetchJob();
    intervalRef.current = setInterval(fetchJob, 3000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchJob]);

  const handleDownload = async (fileId) => {
    try {
      const res = await api.downloadFile(fileId);
      const url = res.url || res.download_url;
      if (url) window.open(url, '_blank');
    } catch (e) { setError(e.message); }
  };

  const handleCancel = async () => {
    try { await api.cancelJob(id); fetchJob(); }
    catch (e) { setError(e.message); }
  };

  const statusMap = {
    queued: { color: 'text-amber-500', label: 'Queued' },
    pending: { color: 'text-amber-500', label: 'Pending' },
    processing: { color: 'text-brand-400', label: 'Processing' },
    completed: { color: 'text-emerald-500', label: 'Completed' },
    done: { color: 'text-emerald-500', label: 'Completed' },
    failed: { color: 'text-red-400', label: 'Failed' },
    cancelled: { color: 'text-muted', label: 'Cancelled' },
  };

  const st = job ? (statusMap[job.status] || statusMap.queued) : statusMap.queued;
  const pct = progress?.percentage || progress?.progress || 0;

  return (
    <div className="animate-fade-in">
      <button onClick={() => router.push('/jobs')}
        className="text-muted text-[13px] mb-5 hover:text-brand-400 transition-colors">
        ← Back to jobs
      </button>

      {!job ? (
        <div className="text-center py-10 text-muted animate-pulse">Loading job...</div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-7">
            <div>
              <h2 className="text-xl font-bold mb-1">Job {id.slice(0, 8)}...</h2>
              <div className="flex items-center gap-2">
                <span className={`text-[13px] font-semibold ${st.color}`}>{st.label}</span>
                {job.dialect && (
                  <span className="text-xs text-muted bg-surface px-2 py-0.5 rounded">{job.dialect}</span>
                )}
              </div>
            </div>
            {['processing', 'queued', 'pending'].includes(job.status) && (
              <button onClick={handleCancel}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-[13px] hover:bg-red-500/20 transition-colors">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" />
                </svg>
                Cancel
              </button>
            )}
          </div>

          {/* Progress Bar */}
          {['processing', 'queued', 'pending'].includes(job.status) && (
            <div className="bg-surface-card border border-line rounded-xl p-6 mb-5">
              <div className="flex justify-between mb-3">
                <span className="text-sm font-semibold">
                  {progress?.stage || progress?.current_stage || 'Waiting...'}
                </span>
                <span className="text-sm font-mono text-brand-400">{pct}%</span>
              </div>
              <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                <div className="h-full rounded-full progress-bar transition-all duration-700"
                  style={{ width: `${pct}%` }} />
              </div>
              {progress?.chunks_done !== undefined && (
                <div className="text-xs text-muted mt-2">
                  {progress.chunks_done} / {progress.chunks_total || '?'} chunks processed
                </div>
              )}
            </div>
          )}

          {/* Output Files */}
          {files.length > 0 && (
            <div className="bg-surface-card border border-line rounded-xl p-6">
              <h3 className="text-[15px] font-semibold mb-4">Output Files</h3>
              <div className="flex flex-col gap-2.5">
                {files.map((f, i) => (
                  <div key={f.id || i}
                    className="flex items-center justify-between px-4 py-3 bg-surface rounded-lg border border-line">
                    <div className="flex items-center gap-3">
                      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-brand-400">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" />
                      </svg>
                      <div>
                        <div className="text-[13px] font-medium">{f.filename || f.name || `File ${i + 1}`}</div>
                        <div className="text-[11px] text-muted">{f.type || f.mime_type || ''}</div>
                      </div>
                    </div>
                    <button onClick={() => handleDownload(f.id || f.file_id)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-500/10 border border-brand-500/20 rounded-md text-brand-400 text-xs hover:bg-brand-500/20 transition-colors">
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                      </svg>
                      Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error state */}
          {job.status === 'failed' && (
            <div className="mt-4 px-4 py-3.5 bg-red-500/[0.08] border border-red-500/20 rounded-xl text-red-400 text-[13px]">
              {job.error || 'Job failed — check service logs for details'}
            </div>
          )}

          {error && (
            <div className="mt-4 px-3.5 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-[13px]">
              {error}
            </div>
          )}
        </>
      )}
    </div>
  );
}
