'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

var dialects = [
  { value: 'lebanese', label: 'Lebanese' },
  { value: 'syrian', label: 'Syrian' },
  { value: 'egyptian', label: 'Egyptian' },
  { value: 'jordanian', label: 'Jordanian' },
  { value: 'gulf', label: 'Gulf' },
  { value: 'msa', label: 'MSA' },
  { value: 'auto', label: 'Auto-detect' },
];

export default function UploadPage() {
  var router = useRouter();
  var fileRef = useRef(null);
  var [file, setFile] = useState(null);
  var [dialect, setDialect] = useState('lebanese');
  var [outputType, setOutputType] = useState('all');
  var [subtitleFormat, setSubtitleFormat] = useState('srt');
  var [burnSubs, setBurnSubs] = useState(false);
  var [uploading, setUploading] = useState(false);
  var [progress, setProgress] = useState(0);
  var [statusMsg, setStatusMsg] = useState('');
  var [error, setError] = useState('');
  var [dragOver, setDragOver] = useState(false);

  var handleDrop = function(e) {
    e.preventDefault();
    setDragOver(false);
    var f = e.dataTransfer.files[0];
    if (f && (f.type.startsWith('video/') || f.name.match(/\.(mp4|mkv|avi|mov|webm)$/i))) {
      setFile(f);
      setError('');
    } else {
      setError('Please drop a video file');
    }
  };

  var sleep = function(ms) {
    return new Promise(function(resolve) { setTimeout(resolve, ms); });
  };

  var handleUpload = async function() {
    if (!file) return;
    setUploading(true);
    setError('');
    setStatusMsg('Uploading...');
    setProgress(10);
    try {
      setProgress(30);
      var uploadRes = await api.uploadFile(file, function(p) {
        setProgress(Math.min(60, 10 + Math.round(p * 0.5)));
      });
      setProgress(65);
      setStatusMsg('Creating job...');

      var jobRes = null;
      var maxRetries = 5;
      var attempt = 0;

      while (attempt < maxRetries) {
        try {
          jobRes = await api.createJob({
            file_path: uploadRes.s3_key,
            dialect: dialect,
            output_type: outputType,
            subtitle_format: subtitleFormat,
            burn_subtitles: burnSubs,
          });
          break;
        } catch (err) {
          attempt++;
          if (attempt >= maxRetries) {
            throw err;
          }
          setStatusMsg('GPU is warming up, retrying... (' + attempt + '/' + maxRetries + ')');
          setProgress(65 + attempt * 5);
          await sleep(5000);
        }
      }

      setProgress(100);
      setStatusMsg('Done!');
      setTimeout(function() {
        router.push('/jobs/' + (jobRes.id || jobRes.job_id));
      }, 400);
    } catch (e) {
      setError(e.message || 'Something went wrong. The GPU may still be warming up. Please try again in a minute.');
      setStatusMsg('');
      setUploading(false);
      setProgress(0);
    }
  };

  var formatSize = function(b) {
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    if (b < 1024 * 1024 * 1024) return (b / (1024 * 1024)).toFixed(1) + ' MB';
    return (b / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  var selectCls = "w-full px-3.5 py-2.5 bg-surface-input border border-line rounded-lg text-[13px] outline-none focus:border-brand-500 transition-colors appearance-none cursor-pointer bg-[length:12px] bg-[right_12px_center] bg-no-repeat";
  var selectBg = { backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236b6b80\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")' };

  return (
    <div className="animate-fade-in">
      <h2 className="text-[22px] font-bold mb-1.5">Upload Video</h2>
      <p className="text-muted text-sm mb-7">Upload an Arabic video to generate subtitles</p>

      <div
        onDragOver={function(e) { e.preventDefault(); setDragOver(true); }}
        onDragLeave={function() { setDragOver(false); }}
        onDrop={handleDrop}
        onClick={function() { if (fileRef.current) fileRef.current.click(); }}
        className={'border-2 border-dashed rounded-2xl cursor-pointer transition-all '
          + (file ? 'p-6 ' : 'py-12 px-6 ')
          + (dragOver ? 'border-brand-500 bg-brand-500/5 animate-drop-pulse' : 'border-line hover:border-muted')}
      >
        <input ref={fileRef} type="file" accept="video/*" className="hidden"
          onChange={function(e) { if (e.target.files[0]) setFile(e.target.files[0]); }} />

        {file ? (
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400 shrink-0">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold mb-1">{file.name}</div>
              <div className="text-xs text-muted">{formatSize(file.size)}</div>
            </div>
            <button onClick={function(e) { e.stopPropagation(); setFile(null); }}
              className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs cursor-pointer hover:bg-red-500/20 transition-colors">
              Remove
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-dim mb-4">
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" className="mx-auto">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
            </div>
            <div className="text-[15px] font-semibold mb-1.5">Drop your video here</div>
            <div className="text-[13px] text-muted">or click to browse — MP4, MKV, AVI, MOV</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mt-6">
        <div>
          <label className="text-xs text-muted mb-1.5 block font-medium">Dialect</label>
          <select value={dialect} onChange={function(e) { setDialect(e.target.value); }}
            className={selectCls} style={selectBg}>
            {dialects.map(function(d) { return <option key={d.value} value={d.value}>{d.label}</option>; })}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted mb-1.5 block font-medium">Output</label>
          <select value={outputType} onChange={function(e) { setOutputType(e.target.value); }}
            className={selectCls} style={selectBg}>
            <option value="all">All formats</option>
            <option value="transcript">Transcript only</option>
            <option value="subtitles">Subtitles only</option>
            <option value="video">Subtitled video</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted mb-1.5 block font-medium">Subtitle Format</label>
          <select value={subtitleFormat} onChange={function(e) { setSubtitleFormat(e.target.value); }}
            className={selectCls} style={selectBg}>
            <option value="srt">SRT</option>
            <option value="vtt">VTT</option>
            <option value="ass">ASS</option>
          </select>
        </div>
        <div className="flex items-end pb-0.5">
          <label className="flex items-center gap-2.5 cursor-pointer text-[13px]">
            <div onClick={function() { setBurnSubs(!burnSubs); }}
              className={'w-[42px] h-6 rounded-full p-0.5 transition-colors cursor-pointer '
                + (burnSubs ? 'bg-brand-500' : 'bg-line')}>
              <div className={'w-5 h-5 rounded-full bg-white transition-transform '
                + (burnSubs ? 'translate-x-[18px]' : 'translate-x-0')} />
            </div>
            Burn subtitles onto video
          </label>
        </div>
      </div>

      {uploading && (
        <div className="mt-6">
          <div className="flex justify-between mb-2">
            <span className="text-[13px] text-muted">
              {statusMsg || 'Processing...'}
            </span>
            <span className="text-[13px] text-brand-400 font-mono">{progress}%</span>
          </div>
          <div className="h-1 bg-line rounded-full overflow-hidden">
            <div className="h-full rounded-full progress-bar transition-all duration-500"
              style={{ width: progress + '%' }} />
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 px-3.5 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-[13px]">
          {error}
        </div>
      )}

      <button onClick={handleUpload} disabled={!file || uploading}
        className={'w-full mt-6 py-3.5 rounded-xl text-white text-[15px] font-semibold transition-all '
          + (!file || uploading ? 'bg-dim opacity-50 cursor-not-allowed' : 'gradient-bg hover:opacity-90 cursor-pointer')}>
        {uploading ? 'Processing...' : 'Start Transcription'}
      </button>
    </div>
  );
}
