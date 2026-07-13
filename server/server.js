import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const execFileAsync = promisify(execFile);

const PORT = process.env.PORT || 5000;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const MIN_TARGET_BYTES = 10 * 1024; // refuse absurd targets below 10 KB
const GS_TIMEOUT_MS = 150_000; // kill Ghostscript after 2.5 minutes per pass
// Target mode runs several passes; on slow free-tier CPUs stop starting new
// passes once this much time has been spent and return the best result so far.
const TARGET_TOTAL_BUDGET_MS = 210_000;

// Ghostscript binary: override with GHOSTSCRIPT_PATH, otherwise use the
// platform default ("gswin64c" on Windows, "gs" everywhere else).
const GHOSTSCRIPT =
  process.env.GHOSTSCRIPT_PATH ||
  (process.platform === 'win32' ? 'gswin64c' : 'gs');

// Compression levels -> Ghostscript -dPDFSETTINGS presets.
// pdfwrite keeps text as text (selectable/searchable); it never rasterizes pages.
const PDF_SETTINGS = {
  low: '/printer', // best quality
  medium: '/ebook', // recommended
  high: '/screen', // smallest size
};

// Target-size mode: Ghostscript can't aim at an exact byte count, so we try
// passes from best quality to most aggressive and keep the highest-quality
// result that fits under the target.
const TARGET_ATTEMPTS = [
  { preset: '/printer' },
  { preset: '/ebook' },
  { preset: '/screen' },
  { preset: '/screen', resolution: 100 },
  { preset: '/screen', resolution: 72 },
  { preset: '/screen', resolution: 50 },
];

class NotPdfError extends Error {}

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || '*',
    exposedHeaders: [
      'X-Original-Size',
      'X-Compressed-Size',
      'X-Already-Optimized',
      'X-Target-Met',
    ],
  })
);

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (req, file, cb) => {
    const hasPdfExtension = path.extname(file.originalname).toLowerCase() === '.pdf';
    const hasPdfMime = file.mimetype === 'application/pdf';
    if (hasPdfExtension && hasPdfMime) return cb(null, true);
    cb(new NotPdfError('Only PDF files are allowed'));
  },
});

async function removeQuietly(filePath) {
  if (!filePath) return;
  try {
    await fs.rm(filePath, { force: true });
  } catch {
    // best effort — temp dir is cleaned by the OS anyway
  }
}

async function isRealPdf(filePath) {
  // Check the magic bytes so a renamed .exe/.jpg can't sneak past the
  // extension/MIME checks.
  const handle = await fs.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(5);
    await handle.read(buffer, 0, 5, 0);
    return buffer.toString('latin1') === '%PDF-';
  } finally {
    await handle.close();
  }
}

async function runGhostscript(inputPath, outputPath, preset, resolution) {
  const args = [
    '-sDEVICE=pdfwrite',
    '-dCompatibilityLevel=1.4',
    `-dPDFSETTINGS=${preset}`,
    // Without this, Ghostscript's PDF interpreter can swallow errors
    // (e.g. encrypted files) and emit a blank PDF with exit code 0.
    '-dPDFSTOPONERROR',
    // Image resolution overrides must come after -dPDFSETTINGS to win.
    ...(resolution
      ? [
          `-dColorImageResolution=${resolution}`,
          `-dGrayImageResolution=${resolution}`,
          `-dMonoImageResolution=${resolution}`,
        ]
      : []),
    '-dNOPAUSE',
    '-dBATCH',
    '-dQUIET',
    '-dSAFER',
    `-sOutputFile=${outputPath}`,
    inputPath,
  ];
  await execFileAsync(GHOSTSCRIPT, args, { timeout: GS_TIMEOUT_MS });
  const { size } = await fs.stat(outputPath);
  if (size === 0) {
    const err = new Error('Ghostscript produced an empty file');
    err.emptyOutput = true;
    throw err;
  }
  return size;
}

// Map a Ghostscript failure to an HTTP status + user-facing message.
function classifyGsError(err) {
  if (err.code === 'ENOENT') {
    console.error(`Ghostscript binary "${GHOSTSCRIPT}" not found on PATH.`);
    return { status: 500, error: 'The server is missing Ghostscript. Please try again later.' };
  }
  if (err.killed) {
    return { status: 504, error: 'Compression timed out. Please try a smaller or simpler PDF.' };
  }
  const gsOutput = `${err.stderr || ''}\n${err.stdout || ''}`;
  if (/password/i.test(gsOutput)) {
    return {
      status: 422,
      error: 'This PDF is password-protected. Remove the password and try again.',
    };
  }
  if (!err.emptyOutput) console.error('Ghostscript failed:', gsOutput.trim());
  return {
    status: 422,
    error: 'This PDF appears to be corrupted or unsupported and could not be processed.',
  };
}

// Friendly landing page so visiting the API URL directly doesn't look broken.
app.get('/', (req, res) => {
  res.json({
    name: 'MacrashPDF API',
    status: 'running',
    message: 'This is the compression backend. Use the web app to compress PDFs.',
    endpoints: {
      'GET /api/health': 'health check',
      'POST /api/compress': 'multipart form: file (PDF), mode (preset|target), level, targetBytes',
    },
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/compress', upload.single('file'), async (req, res) => {
  const inputPath = req.file?.path;
  const tempOutputs = [];
  const newOutputPath = () => {
    const p = path.join(os.tmpdir(), `macrash-${crypto.randomUUID()}.pdf`);
    tempOutputs.push(p);
    return p;
  };

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please attach a PDF.' });
    }

    if (!(await isRealPdf(inputPath))) {
      return res.status(400).json({ error: 'Only PDF files are allowed' });
    }

    const originalSize = req.file.size;
    const mode = String(req.body?.mode || 'preset').toLowerCase();

    // best = highest-quality result so far that we're willing to send
    let best = null; // { path, size }
    let targetBytes = null;

    if (mode === 'target') {
      targetBytes = Number(req.body?.targetBytes);
      if (!Number.isFinite(targetBytes) || targetBytes < MIN_TARGET_BYTES) {
        return res.status(400).json({ error: 'Invalid target size. The minimum target is 10 KB.' });
      }

      // Each pass costs a full Ghostscript run, so skip high-quality passes
      // that can't plausibly get anywhere near an aggressive target.
      const ratio = targetBytes / originalSize;
      let attempts = TARGET_ATTEMPTS;
      if (ratio < 0.1) attempts = TARGET_ATTEMPTS.slice(2); // start at /screen
      else if (ratio < 0.35) attempts = TARGET_ATTEMPTS.slice(1); // start at /ebook

      const passesStartedAt = Date.now();
      let smallest = null; // { path, size } — fallback if no pass meets the target
      for (const attempt of attempts) {
        // Out of time budget: settle for the best result we already have.
        if (smallest && Date.now() - passesStartedAt > TARGET_TOTAL_BUDGET_MS) break;
        const outputPath = newOutputPath();
        let size;
        try {
          size = await runGhostscript(inputPath, outputPath, attempt.preset, attempt.resolution);
        } catch (err) {
          if (smallest) break; // keep what we have from earlier passes
          const { status, error } = classifyGsError(err);
          return res.status(status).json({ error });
        }
        if (!smallest || size < smallest.size) smallest = { path: outputPath, size };
        if (size <= targetBytes) {
          // Passes run best-quality-first, so the first one under the
          // target is the highest quality that fits.
          best = { path: outputPath, size };
          break;
        }
      }
      if (!best) best = smallest;
    } else {
      const level = String(req.body?.level || 'medium').toLowerCase();
      const preset = PDF_SETTINGS[level];
      if (!preset) {
        return res.status(400).json({ error: 'Invalid compression level.' });
      }
      const outputPath = newOutputPath();
      try {
        const size = await runGhostscript(inputPath, outputPath, preset);
        best = { path: outputPath, size };
      } catch (err) {
        const { status, error } = classifyGsError(err);
        return res.status(status).json({ error });
      }
    }

    // Already-optimized PDFs can come out the same size or larger. In that
    // case return the untouched original so the user never downloads a
    // worse file.
    const alreadyOptimized = best.size >= originalSize;
    const sendPath = alreadyOptimized ? inputPath : best.path;
    const sendSize = alreadyOptimized ? originalSize : best.size;
    const targetMet = targetBytes === null ? true : sendSize <= targetBytes;

    const pdfBuffer = await fs.readFile(sendPath);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', sendSize);
    res.setHeader('X-Original-Size', String(originalSize));
    res.setHeader('X-Compressed-Size', String(sendSize));
    res.setHeader('X-Already-Optimized', alreadyOptimized ? 'true' : 'false');
    res.setHeader('X-Target-Met', targetMet ? 'true' : 'false');
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Unexpected error during compression:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Something went wrong on the server. Please try again.' });
    }
  } finally {
    // Privacy guarantee: delete every temp file immediately, success or not.
    await removeQuietly(inputPath);
    for (const p of tempOutputs) await removeQuietly(p);
  }
});

// Multer / validation error handler
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File is too large. The maximum size is 50 MB.' });
  }
  if (err instanceof NotPdfError) {
    return res.status(400).json({ error: 'Only PDF files are allowed' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server. Please try again.' });
});

app.listen(PORT, () => {
  console.log(`MacrashPDF server listening on port ${PORT}`);
  console.log(`Using Ghostscript binary: ${GHOSTSCRIPT}`);
});
