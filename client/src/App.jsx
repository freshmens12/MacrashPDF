import { useCallback, useEffect, useRef, useState } from 'react';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import Toasts from './components/Toasts.jsx';
import DropZone from './components/DropZone.jsx';
import CompressionOptions, { targetToBytes } from './components/CompressionOptions.jsx';
import IntroSplash from './components/IntroSplash.jsx';
import Results from './components/Results.jsx';
import { compressPdf } from './api.js';
import { formatSize } from './utils/format.js';

const TOAST_DURATION_MS = 4500;

export default function App() {
  // Theme: initial value from the system preference, kept in memory for the session.
  const [dark, setDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  // idle -> ready (file selected) -> compressing -> done
  const [status, setStatus] = useState('idle');
  const [showIntro, setShowIntro] = useState(true);
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('preset'); // 'preset' | 'target'
  const [level, setLevel] = useState('medium');
  const [targetValue, setTargetValue] = useState('2');
  const [targetUnit, setTargetUnit] = useState('MB');
  const [result, setResult] = useState(null);
  const [toasts, setToasts] = useState([]);
  const previewUrlRef = useRef(null);

  const addToast = useCallback((message, type = 'info') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_DURATION_MS);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  function releasePreview() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }

  function handleFileSelected(selected) {
    releasePreview();
    setFile(selected);
    setResult(null);
    setStatus('ready');
  }

  async function handleCompress() {
    if (!file) return;

    let options = { mode: 'preset', level };
    if (mode === 'target') {
      const targetBytes = targetToBytes(targetValue, targetUnit);
      if (!targetBytes) {
        addToast('Please enter a valid target size.', 'error');
        return;
      }
      if (targetBytes < 10 * 1024) {
        addToast('That target is too small — the minimum is 10 KB.', 'error');
        return;
      }
      if (targetBytes >= file.size) {
        addToast(
          `Your PDF is already smaller than ${formatSize(targetBytes, targetUnit === 'MB' ? 'MB' : 'KB')}.`,
          'info'
        );
        return;
      }
      options = { mode: 'target', targetBytes };
    }

    setStatus('compressing');
    try {
      const data = await compressPdf(file, options);
      releasePreview();
      const previewUrl = URL.createObjectURL(data.blob);
      previewUrlRef.current = previewUrl;
      setResult({ ...data, previewUrl });
      setStatus('done');
      if (data.alreadyOptimized) {
        addToast("This PDF is already optimized — compression won't reduce it further.", 'info');
      } else if (!data.targetMet) {
        addToast("We couldn't reach your exact target, but here's the smallest we could get.", 'info');
      } else {
        addToast('Your PDF was compressed successfully!', 'success');
      }
    } catch (err) {
      setStatus('ready');
      addToast(err.message || 'Compression failed. Please try again.', 'error');
    }
  }

  function handleDownload() {
    if (!result) return;
    const link = document.createElement('a');
    link.href = result.previewUrl;
    const base = file.name.replace(/\.pdf$/i, '');
    link.download = result.alreadyOptimized ? file.name : `${base}-compressed.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  // Keep the same original file and let the user pick a new level.
  function handleRecompress() {
    setResult(null);
    releasePreview();
    setStatus('ready');
  }

  function handleReset() {
    releasePreview();
    setFile(null);
    setResult(null);
    setMode('preset');
    setLevel('medium');
    setTargetValue('2');
    setTargetUnit('MB');
    setStatus('idle');
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 transition-colors duration-300 dark:bg-slate-950">
      {showIntro && <IntroSplash onDone={() => setShowIntro(false)} />}
      <Header dark={dark} onToggleTheme={() => setDark((d) => !d)} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {status === 'idle' && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                Compress your PDF in seconds
              </h1>
              <p className="mx-auto mt-3 max-w-xl text-slate-500 dark:text-slate-400">
                Free, no sign-up, and your files are deleted the moment we&apos;re done. Text stays
                selectable — we never turn your pages into images.
              </p>
            </div>
            <DropZone onFileSelected={handleFileSelected} onError={(msg) => addToast(msg, 'error')} />
          </div>
        )}

        {(status === 'ready' || status === 'compressing') && file && (
          <div className="space-y-6">
            {/* Selected file card */}
            <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
                  <path
                    d="M7 3h7l4 4v14H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900 dark:text-white" title={file.name}>
                  {file.name}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Original size: {formatSize(file.size, 'MB')}
                </p>
              </div>
              {status === 'ready' && (
                <button
                  type="button"
                  onClick={handleReset}
                  aria-label="Remove file"
                  className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                    <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>

            <CompressionOptions
              mode={mode}
              onModeChange={setMode}
              level={level}
              onLevelChange={setLevel}
              targetValue={targetValue}
              targetUnit={targetUnit}
              onTargetChange={(value, unit) => {
                setTargetValue(value);
                setTargetUnit(unit);
              }}
              fileSize={file.size}
              disabled={status === 'compressing'}
            />

            {status === 'compressing' ? (
              <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-8 text-center transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900">
                <svg
                  className="h-10 w-10 animate-spin text-brand-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
                  <path
                    d="M22 12a10 10 0 0 0-10-10"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Compressing your PDF…</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    This usually takes a few seconds. Large files can take up to a minute.
                  </p>
                </div>
                <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full w-1/3 animate-pulse rounded-full bg-brand-500" />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleCompress}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                  <path
                    d="M6 4h12M6 20h12M12 8v8m0-8L9.5 10.5M12 8l2.5 2.5m-2.5 5.5L9.5 13.5m2.5 2.5 2.5-2.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Compress PDF
              </button>
            )}
          </div>
        )}

        {status === 'done' && result && file && (
          <Results
            result={result}
            fileName={file.name}
            onDownload={handleDownload}
            onRecompress={handleRecompress}
            onReset={handleReset}
          />
        )}
      </main>

      <Footer />
      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
