export const LEVELS = [
  {
    id: 'low',
    name: 'Low',
    tagline: 'Best quality',
    detail: 'Light compression, near-original quality (print-ready).',
  },
  {
    id: 'medium',
    name: 'Medium',
    tagline: 'Recommended',
    detail: 'Great balance of quality and size for everyday sharing.',
  },
  {
    id: 'high',
    name: 'High',
    tagline: 'Smallest size',
    detail: 'Maximum compression, good for email attachments.',
  },
];

export default function LevelSelector({ level, onChange, disabled }) {
  return (
    <fieldset disabled={disabled}>
      <legend className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
        Compression level
      </legend>
      <div className="grid gap-3 sm:grid-cols-3">
        {LEVELS.map((option) => {
          const selected = level === option.id;
          return (
            <label
              key={option.id}
              className={`relative flex cursor-pointer flex-col gap-1 rounded-xl border p-4 transition-colors duration-200 ${
                selected
                  ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500 dark:border-brand-400 dark:bg-brand-500/10 dark:ring-brand-400'
                  : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600'
              } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              <input
                type="radio"
                name="compression-level"
                value={option.id}
                checked={selected}
                onChange={() => onChange(option.id)}
                className="sr-only"
              />
              <span className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 dark:text-white">{option.name}</span>
                {option.id === 'medium' && (
                  <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Recommended
                  </span>
                )}
              </span>
              <span className="text-xs font-medium text-brand-600 dark:text-brand-400">
                {option.tagline}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{option.detail}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
