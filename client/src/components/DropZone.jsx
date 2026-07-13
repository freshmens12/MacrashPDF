import { useRef, useState } from 'react';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export default function DropZone({ onFileSelected, onError }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(file) {
    if (!file) return;

    // Validate both the extension and the MIME type.
    const hasPdfExtension = file.name.toLowerCase().endsWith('.pdf');
    const hasPdfMime = file.type === 'application/pdf';
    if (!hasPdfExtension || !hasPdfMime) {
      onError('Only PDF files are allowed');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      onError('File is too large. The maximum size is 50 MB.');
      return;
    }
    if (file.size === 0) {
      onError('That file is empty. Please choose a valid PDF.');
      return;
    }
    onFileSelected(file);
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    handleFile(event.dataTransfer.files?.[0]);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors duration-300 sm:py-20 ${
        dragging
          ? 'border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-500/10'
          : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900'
      }`}
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
        <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" aria-hidden="true">
          <path
            d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </span>

      <div>
        <p className="text-lg font-semibold text-slate-900 dark:text-white">
          {dragging ? 'Drop your PDF here' : 'Drag & drop your PDF here'}
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          PDF files only · up to 50 MB · free, no account needed
        </p>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
      >
        Browse Files
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = ''; // allow re-selecting the same file
        }}
      />
    </div>
  );
}
