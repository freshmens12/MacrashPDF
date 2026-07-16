import ServerStatus from './ServerStatus.jsx';
import { IS_DESKTOP } from '../api.js';

const DESKTOP_DOWNLOAD_URL =
  'https://drive.google.com/file/d/1e3gjMYKfl2WaZlTtYCyyAV5zUMe17NSQ/view?usp=sharing';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 py-6 transition-colors duration-300 dark:border-slate-800">
      <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-4 px-4 sm:grid-cols-[1fr_auto_1fr]">
        {/* Left: desktop app download — web only */}
        <div className="flex justify-center sm:justify-start">
          {!IS_DESKTOP && (
            <a
              href={DESKTOP_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-brand-400 hover:text-brand-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand-400 dark:hover:text-brand-400"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                <rect
                  x="3"
                  y="4"
                  width="18"
                  height="12"
                  rx="1.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M8 20h8m-4-4v4M12 7v5m0 0-2-2m2 2 2-2"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Download Desktop App
            </a>
          )}
        </div>

        {/* Center: status + privacy + credit */}
        <div className="flex flex-col items-center gap-2 text-center text-sm text-slate-500 dark:text-slate-400">
          <ServerStatus />
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" aria-hidden="true">
              <path
                d="M12 3 5 6v5c0 4.4 3 8.4 7 9.5 4-1.1 7-5.1 7-9.5V6l-7-3Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path
                d="m9.5 12 1.8 1.8 3.2-3.6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Files are processed securely and deleted immediately. Nothing is stored.
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500">
            Developed by{' '}
            <a
              href="https://vincent-portfolio-zeta.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-slate-500 underline-offset-2 transition-colors hover:text-brand-600 hover:underline dark:text-slate-400 dark:hover:text-brand-400"
            >
              Vincent Enimedez
            </a>
          </div>
        </div>

        {/* Right: spacer to keep the center column truly centered */}
        <div className="hidden sm:block" />
      </div>
    </footer>
  );
}
