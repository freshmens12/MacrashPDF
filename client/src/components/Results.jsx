import { useState } from 'react';
import { SIZE_UNITS, formatSize, percentSaved } from '../utils/format.js';

export default function Results({ result, fileName, onDownload, onRecompress, onReset }) {
  const [unit, setUnit] = useState('MB');
  const { originalSize, compressedSize, alreadyOptimized, targetMet, previewUrl } = result;
  const saved = percentSaved(originalSize, compressedSize);

  return (
    <div className="space-y-6">
      {/* Outcome banner */}
      {alreadyOptimized ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
            <path d="M12 8v5m0 3h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <p>
            <span className="font-semibold">
              This PDF is already optimized — compression won&apos;t reduce it further.
            </span>{' '}
            This usually happens when the file was compressed before (including by this tool) —
            compressing it again won&apos;t make it smaller. You can still download the original
            file below.
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
              <path
                d="m5 12.5 4.5 4.5L19 7.5"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Reduced by {saved}%
          </h2>
          <p className="max-w-full truncate text-sm text-slate-500 dark:text-slate-400" title={fileName}>
            {fileName}
          </p>
        </div>
      )}

      {!alreadyOptimized && targetMet === false && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
            <path d="M12 8v5m0 3h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <p>
            <span className="font-semibold">We couldn&apos;t reach your exact target size.</span>{' '}
            This is the smallest this PDF can get without losing its text — you can still
            download it below.
          </p>
        </div>
      )}

      {/* Size comparison + unit toggle */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Size comparison
          </span>
          <div
            role="group"
            aria-label="Size unit"
            className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800"
          >
            {SIZE_UNITS.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                aria-pressed={unit === u}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                  unit === u
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-600 dark:text-white'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {u === 'B' ? 'Bytes' : u}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-800/60">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Original
            </p>
            <p className="mt-1 break-all text-lg font-bold text-slate-900 dark:text-white">
              {formatSize(originalSize, unit)}
            </p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-4 text-center dark:bg-emerald-500/10">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              Compressed
            </p>
            <p className="mt-1 break-all text-lg font-bold text-emerald-700 dark:text-emerald-300">
              {formatSize(compressedSize, unit)}
            </p>
          </div>
        </div>
      </div>

      {/* PDF preview */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900 sm:p-6">
        <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
          Preview — check the quality before downloading
        </p>
        <iframe
          src={previewUrl}
          title="Compressed PDF preview"
          className="h-96 w-full rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
        />
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
          If the preview doesn&apos;t load, your browser may not support inline PDFs — the download
          will still work.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onDownload}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
            <path
              d="M12 4v12m0 0 4.5-4.5M12 16l-4.5-4.5M4 20h16"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {alreadyOptimized ? 'Download Original PDF' : 'Download Compressed PDF'}
        </button>
        <button
          type="button"
          onClick={onRecompress}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
            <path
              d="M20 11a8 8 0 0 0-14.9-3M4 13a8 8 0 0 0 14.9 3M5 4v4h4m10 12v-4h-4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Recompress
        </button>
        <button
          type="button"
          onClick={onReset}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
            <path d="M12 5v14m-7-7h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          Compress Another File
        </button>
      </div>
    </div>
  );
}
