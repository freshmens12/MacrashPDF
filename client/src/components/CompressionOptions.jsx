import LevelSelector from './LevelSelector.jsx';
import { formatSize } from '../utils/format.js';

const QUICK_TARGETS = [
  { label: '500 KB', bytes: 500 * 1024 },
  { label: '1 MB', bytes: 1 * 1024 * 1024 },
  { label: '2 MB', bytes: 2 * 1024 * 1024 },
  { label: '5 MB', bytes: 5 * 1024 * 1024 },
];

export function targetToBytes(value, unit) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * (unit === 'MB' ? 1024 * 1024 : 1024));
}

export default function CompressionOptions({
  mode,
  onModeChange,
  level,
  onLevelChange,
  targetValue,
  targetUnit,
  onTargetChange,
  fileSize,
  disabled,
}) {
  const targetBytes = targetToBytes(targetValue, targetUnit);

  return (
    <div className="space-y-4">
      {/* Mode tabs */}
      <div
        role="tablist"
        aria-label="Compression mode"
        className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
      >
        {[
          { id: 'preset', label: 'Quality preset' },
          { id: 'target', label: 'Target size' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={mode === tab.id}
            disabled={disabled}
            onClick={() => onModeChange(tab.id)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              mode === tab.id
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-600 dark:text-white'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mode === 'preset' ? (
        <LevelSelector level={level} onChange={onLevelChange} disabled={disabled} />
      ) : (
        <fieldset disabled={disabled}>
          <legend className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Compress to at most…
          </legend>

          {/* Quick picks */}
          <div className="mb-3 flex flex-wrap gap-2">
            {QUICK_TARGETS.map((quick) => {
              const selected = targetBytes === quick.bytes;
              const tooBig = fileSize != null && quick.bytes >= fileSize;
              return (
                <button
                  key={quick.label}
                  type="button"
                  disabled={disabled || tooBig}
                  title={tooBig ? 'Your PDF is already smaller than this' : undefined}
                  onClick={() => {
                    const [value, unit] = quick.label.split(' ');
                    onTargetChange(value, unit);
                  }}
                  className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                    selected
                      ? 'border-brand-500 bg-brand-500 text-white dark:border-brand-400 dark:bg-brand-500'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-brand-400 hover:text-brand-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand-400 dark:hover:text-brand-400'
                  } ${tooBig ? 'cursor-not-allowed opacity-40' : ''}`}
                >
                  {quick.label}
                </button>
              );
            })}
          </div>

          {/* Custom value + unit */}
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={targetValue}
              onChange={(e) => onTargetChange(e.target.value, targetUnit)}
              placeholder="e.g. 2"
              aria-label="Target size value"
              className="w-32 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-400"
            />
            <div
              role="group"
              aria-label="Target size unit"
              className="flex rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800"
            >
              {['KB', 'MB'].map((u) => (
                <button
                  key={u}
                  type="button"
                  aria-pressed={targetUnit === u}
                  onClick={() => onTargetChange(targetValue, u)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    targetUnit === u
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-600 dark:text-white'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {fileSize != null && (
              <>
                Your PDF is <span className="font-semibold">{formatSize(fileSize, 'MB')}</span>.{' '}
              </>
            )}
            We&apos;ll aim for the best quality that fits under your target — exact sizes
            can&apos;t be guaranteed, but we get as close as possible.
          </p>
        </fieldset>
      )}
    </div>
  );
}
