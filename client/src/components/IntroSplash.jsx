import { useEffect, useRef, useState } from 'react';

const WORD = 'MACRASHPDF';
const GLYPHS = '!<>-_\\/[]{}=+*^?#ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

const TICK_MS = 45;
const IN_PER_LETTER = 100; // ms between letters locking in
const SCRAMBLE_LEAD = 350; // how long a letter scrambles before locking
const HOLD_MS = 750; // fully-formed word on screen
const OUT_PER_LETTER = 70; // ms between letters disappearing
const FADE_MS = 450; // overlay fade-out

function randomGlyph() {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
}

// Intro effect: MACRASHPDF scrambles in letter by letter, holds, then the
// letters flicker and disappear one by one before the overlay fades away.
export default function IntroSplash({ onDone }) {
  const [display, setDisplay] = useState(() => WORD.split('').map(() => ''));
  const [fading, setFading] = useState(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const start = performance.now();
    const inEnd = SCRAMBLE_LEAD + WORD.length * IN_PER_LETTER;
    const outStart = inEnd + HOLD_MS;
    const outEnd = outStart + WORD.length * OUT_PER_LETTER + 150;
    let fadeTimer;

    const interval = setInterval(() => {
      const t = performance.now() - start;

      if (t >= outEnd) {
        clearInterval(interval);
        setDisplay(WORD.split('').map(() => ''));
        setFading(true);
        fadeTimer = setTimeout(() => doneRef.current?.(), FADE_MS);
        return;
      }

      setDisplay(
        WORD.split('').map((letter, i) => {
          if (t >= outStart) {
            // disappear right-to-left with a brief flicker
            const goneAt = outStart + (WORD.length - 1 - i) * OUT_PER_LETTER + 100;
            if (t >= goneAt) return '';
            if (t >= goneAt - 160) return randomGlyph();
            return letter;
          }
          // scramble in left-to-right
          const lockAt = SCRAMBLE_LEAD + i * IN_PER_LETTER;
          if (t >= lockAt) return letter;
          if (t >= lockAt - SCRAMBLE_LEAD) return randomGlyph();
          return '';
        })
      );
    }, TICK_MS);

    return () => {
      clearInterval(interval);
      clearTimeout(fadeTimer);
    };
  }, []);

  const renderLetters = () =>
    display.map((char, i) => (
      <span
        key={i}
        className={`inline-block w-[1.1em] text-center ${
          i >= WORD.length - 3
            ? 'text-brand-500 dark:text-brand-400'
            : 'text-slate-900 dark:text-white'
        } ${char === WORD[i] ? '' : 'opacity-70'}`}
      >
        {char || ' '}
      </span>
    ));

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-50 transition-opacity duration-500 dark:bg-slate-950 ${
        fading ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex select-none flex-col items-center font-mono text-3xl font-bold tracking-[0.25em] sm:text-5xl">
        {/* The word, with a light glow */}
        <span className="[text-shadow:0_2px_6px_rgba(15,23,42,0.18),0_5px_20px_rgba(59,104,246,0.3)] dark:[text-shadow:0_2px_8px_rgba(0,0,0,0.5),0_0_24px_rgba(59,104,246,0.4)]">
          {renderLetters()}
        </span>
        {/* Subtle mirror reflection below the word */}
        <span className="text-reflection mt-1">{renderLetters()}</span>
      </div>
    </div>
  );
}
