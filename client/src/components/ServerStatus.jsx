import { useCallback, useEffect, useRef, useState } from 'react';
import { checkHealth } from '../api.js';

const WAKE_WINDOW_S = 90; // free-tier cold starts (Render) can take ~30-60s
const RETRY_EVERY_MS = 4000;

export default function ServerStatus() {
  const [status, setStatus] = useState('checking'); // checking | online | offline
  const [countdown, setCountdown] = useState(WAKE_WINDOW_S);
  const runIdRef = useRef(0);

  const startChecking = useCallback(() => {
    const runId = ++runIdRef.current;
    setStatus('checking');
    setCountdown(WAKE_WINDOW_S);

    const startedAt = Date.now();

    const tick = setInterval(() => {
      const left = WAKE_WINDOW_S - Math.floor((Date.now() - startedAt) / 1000);
      setCountdown(Math.max(0, left));
    }, 1000);

    let retryTimer;
    const stop = () => {
      clearInterval(tick);
      clearTimeout(retryTimer);
    };

    async function attempt() {
      const ok = await checkHealth();
      if (runId !== runIdRef.current) return; // a newer retry run took over
      if (ok) {
        stop();
        setStatus('online');
        return;
      }
      if (Date.now() - startedAt >= WAKE_WINDOW_S * 1000) {
        stop();
        setStatus('offline');
        return;
      }
      retryTimer = setTimeout(attempt, RETRY_EVERY_MS);
    }
    attempt();

    return stop;
  }, []);

  useEffect(() => startChecking(), [startChecking]);

  if (status === 'online') {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        Server is online
      </span>
    );
  }

  if (status === 'offline') {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
        <span className="inline-flex h-2 w-2 rounded-full bg-red-500" />
        Server is offline
        <button
          type="button"
          onClick={startChecking}
          className="rounded-full border border-red-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors hover:bg-red-100 dark:border-red-500/40 dark:hover:bg-red-500/20"
        >
          Retry
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
      <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
        <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      Waking up the server…
      <span className="inline-flex min-w-[2.5rem] justify-center rounded-full bg-amber-100 px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums dark:bg-amber-500/20">
        {countdown}s
      </span>
    </span>
  );
}
