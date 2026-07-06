'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';

var STAGES = [
  { key: 'extracting', label: 'Extracting audio' },
  { key: 'transcribing', label: 'Transcribing' },
  { key: 'subtitling', label: 'Generating subtitles' },
  { key: 'burning', label: 'Burning subtitles' },
];

var STATUS_TO_STAGE = {
  queued: null, pending: null,
  processing: 'transcribing',
  extracting: 'extracting', extract: 'extracting',
  transcribing: 'transcribing', transcribe: 'transcribing',
  subtitling: 'subtitling', subtitle: 'subtitling', generating_subtitles: 'subtitling',
  burning: 'burning', burn: 'burning', burning_subtitles: 'burning',
  completed: 'completed', done: 'completed',
  failed: 'failed', cancelled: 'cancelled',
};

export default function JobDetailPage() {
  var { id } = useParams();
  var router = useRouter();
  var [job, setJob] = useState(null);
  var [progress, setProgress] = useState(null);
  var [files, setFiles] = useState([]);
  var [error, setError] = useState('');
  var intervalRef = useRef(null);
  var [fakePct, setFakePct] = useState(0);
  var fakeRef = useRef(null);

  var fetchJob = useCallback(async function() {
    try {
      var j = await api.getJob(id);
      if (!j) { setError('Job not found'); return; }
      setJob(j);
      var active = !['completed', 'done', 'failed', 'cancelled'].includes(j.status);
      if (active) {
        try { setProgress(await api.getProgress(id)); } catch (e) {}
      }
      try {
        var f = await api.listFiles(id);
        setFiles(Array.isArray(f) ? f : (f && f.files ? f.files : []));
      } catch (e) {}
      if (['completed', 'done', 'failed', 'cancelled'].includes(j.status) && intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    } catch (e) {
      var msg = (e && e.message) || '';
      if (msg.toLowerCase().indexOf('fetch') !== -1 || msg.toLowerCase().indexOf('network') !== -1) {
        setError('Having trouble reaching the server. Please wait a moment and try again.');
      } else {
        setError(msg || 'Something went wrong.');
      }
    }
  }, [id]);

  useEffect(function() {
    fetchJob();
    intervalRef.current = setInterval(fetchJob, 2000);
    return function() { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchJob]);

  // Fake progress that slowly climbs when real progress is 0
  useEffect(function() {
    var active = job && !['completed', 'done', 'failed', 'cancelled'].includes(job.status);
    if (active) {
      fakeRef.current = setInterval(function() {
        setFakePct(function(prev) { return Math.min(prev + 1, 90); });
      }, 3000);
    } else {
      if (fakeRef.current) clearInterval(fakeRef.current);
      setFakePct(0);
    }
    return function() { if (fakeRef.current) clearInterval(fakeRef.current); };
  }, [job && job.status]);

  var handleDownload = async function(file) {
    try {
      var res = await api.downloadFile(file.id || file.file_id);
      var url = res.url || res.download_url;
      if (url) window.open(url, '_blank');
    } catch (e) { setError(e.message); }
  };

  var handleCancel = async function() {
    try { await api.cancelJob(id); fetchJob(); }
    catch (e) { setError(e.message); }
  };

  var statusMap = {
    queued: { color: 'text-amber-500', label: 'Queued' },
    pending: { color: 'text-amber-500', label: 'Pending' },
    processing: { color: 'text-brand-400', label: 'Processing' },
    extracting: { color: 'text-brand-400', label: 'Extracting' },
    transcribing: { color: 'text-brand-400', label: 'Transcribing' },
    subtitling: { color: 'text-brand-400', label: 'Generating subtitles' },
    burning: { color: 'text-brand-400', label: 'Burning subtitles' },
    completed: { color: 'text-emerald-500', label: 'Completed' },
    done: { color: 'text-emerald-500', label: 'Completed' },
    failed: { color: 'text-red-400', label: 'Failed' },
    cancelled: { color: 'text-muted', label: 'Cancelled' },
  };

  var st = job ? (statusMap[job.status] || statusMap.queued) : statusMap.queued;
  var currentStageKey = job
    ? (STATUS_TO_STAGE[job.status] !== undefined ? STATUS_TO_STAGE[job.status] : (progress && STATUS_TO_STAGE[progress.stage] !== undefined ? STATUS_TO_STAGE[progress.stage] : null))
    : null;
  var currentStageIdx = STAGES.findIndex(function(s) { return s.key === currentStageKey; });
  var isDone = currentStageKey === 'completed';
  var isFailed = currentStageKey === 'failed';

  var realPct = (function() {
    var p = progress ? (progress.percentage || progress.progress || progress.pct) : undefined;
    if (typeof p === 'number') return Math.max(0, Math.min(100, Math.round(p)));
    if (progress && progress.chunks_total > 0) return Math.round((progress.chunks_done / progress.chunks_total) * 100);
    return 0;
  })();

  var activePct = realPct > 0 ? realPct : fakePct;

  var stagePct = function(idx) {
    if (isDone) return 100;
    if (isFailed && idx > currentStageIdx) return 0;
    if (currentStageIdx < 0) return 0;
    if (idx < currentStageIdx) return 100;
    if (idx === currentStageIdx) return activePct;
    return 0;
  };

  var stageState = function(idx) {
    if (isDone) return 'done';
    if (isFailed && idx === currentStageIdx) return 'failed';
    if (idx < currentStageIdx) return 'done';
    if (idx === currentStageIdx) return 'active';
    return 'pending';
  };

  var isProcessing = job && !['completed', 'done', 'failed', 'cancelled'].includes(job.status);

  return (
    <div className="animate-fade-in">
      <button onClick={function() { router.push('/jobs'); }}
        className="text-muted text-[13px] mb-5 hover:text-brand-400 transition-colors">
        &#8592; Back to jobs
      </button>

      {!job ? (
        <div className="text-center py-10 text-muted animate-pulse">Loading job...</div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-7">
            <div>
              <h2 className="text-xl font-bold mb-1">Job {id.slice(0, 8)}...</h2>
              <div className="flex items-center gap-2">
                <span className={'text-[13px] font-semibold ' + st.color}>{st.label}</span>
                {job.dialect && (
                  <span className="text-xs text-muted bg-surface px-2 py-0.5 rounded">{job.dialect}</span>
                )}
              </div>
            </div>
            {isProcessing && (
              <button onClick={handleCancel}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-[13px] hover:bg-red-500/20 transition-colors">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" />
                </svg>
                Cancel
              </button>
            )}
          </div>

          {(isProcessing || isDone || isFailed) && (
            <div className="bg-surface-card border border-line rounded-xl p-6 mb-5">
              <div className="flex flex-col gap-5">
                {STAGES.map(function(stage, idx) {
                  var state = stageState(idx);
                  var pct = stagePct(idx);
                  var labelColor = { done: 'text-emerald-500', active: 'text-brand-400', failed: 'text-red-400', pending: 'text-muted' }[state];
                  var barColor = { done: 'bg-emerald-500', active: 'bg-gradient-to-r from-brand-500 to-brand-400', failed: 'bg-red-500', pending: 'bg-line' }[state];

                  return (
                    <div key={stage.key}>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          {state === 'done' && <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" className="text-emerald-500"><path d="M20 6L9 17l-5-5" /></svg>}
                          {state === 'active' && <div className="w-3 h-3 rounded-full bg-brand-400 animate-pulse" />}
                          {state === 'failed' && <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" className="text-red-400"><path d="M18 6L6 18M6 6l12 12" /></svg>}
                          {state === 'pending' && <div className="w-3 h-3 rounded-full border-2 border-line" />}
                          <span className={'text-[13px] font-semibold ' + labelColor}>{stage.label}</span>
                        </div>
                        <span className={'text-[13px] font-mono ' + labelColor}>{state === 'pending' ? '\u2014' : pct + '%'}</span>
                      </div>
                      <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                        <div className={'h-full rounded-full transition-all duration-700 ' + barColor} style={{ width: pct + '%' }} />
                      </div>
                      {state === 'active' && stage.key === 'transcribing' && progress && progress.chunks_done !== undefined && (
                        <div className="text-xs text-muted mt-2">{progress.chunks_done} / {progress.chunks_total || '?'} chunks processed</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {files.length > 0 && (
            <div className="bg-surface-card border border-line rounded-xl p-6">
              <h3 className="text-[15px] font-semibold mb-4">Output Files</h3>
              <div className="flex flex-col gap-2.5">
                {files.map(function(f, i) {
                  return (
                    <div key={f.id || i} className="flex items-center justify-between px-4 py-3 bg-surface rounded-lg border border-line">
                      <div className="flex items-center gap-3">
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-brand-400"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /></svg>
                        <div>
                          <div className="text-[13px] font-medium">{f.filename || f.name || 'File ' + (i + 1)}</div>
                          <div className="text-[11px] text-muted">{f.type || f.mime_type || ''}</div>
                        </div>
                      </div>
                      <button onClick={function() { handleDownload(f); }}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-500/10 border border-brand-500/20 rounded-md text-brand-400 text-xs hover:bg-brand-500/20 transition-colors">
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                        Download
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {isFailed && (
            <div className="mt-4 px-4 py-3.5 bg-red-500/[0.08] border border-red-500/20 rounded-xl text-red-400 text-[13px]">
              {job.error || 'Job failed \u2014 check service logs for details'}
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