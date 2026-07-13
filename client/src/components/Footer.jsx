import ServerStatus from './ServerStatus.jsx';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 py-6 transition-colors duration-300 dark:border-slate-800">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 px-4 text-center text-sm text-slate-500 dark:text-slate-400">
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
    </footer>
  );
}
