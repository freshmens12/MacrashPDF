const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const execFileAsync = promisify(execFile);

const GS_TIMEOUT_MS = 150_000;
const TARGET_TOTAL_BUDGET_MS = 210_000;
const MIN_TARGET_BYTES = 10 * 1024;

// Same compression strategy as the web server (server/server.js).
const PDF_SETTINGS = { low: '/printer', medium: '/ebook', high: '/screen' };
const TARGET_ATTEMPTS = [
  { preset: '/printer' },
  { preset: '/ebook' },
  { preset: '/screen' },
  { preset: '/screen', resolution: 100 },
  { preset: '/screen', resolution: 72 },
  { preset: '/screen', resolution: 50 },
];

// Packaged app: Ghostscript ships in resources/gs. Dev: use the ./gs copy.
function ghostscriptPath() {
  const base = app.isPackaged ? process.resourcesPath : __dirname;
  return path.join(base, 'gs', 'bin', 'gswin64c.exe');
}

async function removeQuietly(p) {
  if (!p) return;
  try {
    await fs.rm(p, { force: true });
  } catch {
    // best effort
  }
}

async function runGhostscript(inputPath, outputPath, preset, resolution) {
  const args = [
    '-sDEVICE=pdfwrite',
    '-dCompatibilityLevel=1.4',
    `-dPDFSETTINGS=${preset}`,
    '-dPDFSTOPONERROR',
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
  await execFileAsync(ghostscriptPath(), args, { timeout: GS_TIMEOUT_MS });
  const { size } = await fs.stat(outputPath);
  if (size === 0) {
    const err = new Error('empty output');
    err.emptyOutput = true;
    throw err;
  }
  return size;
}

function classifyGsError(err) {
  if (err.code === 'ENOENT') {
    return 'The bundled compression engine is missing. Please reinstall MacrashPDF.';
  }
  if (err.killed) {
    return 'Compression timed out. Please try a smaller or simpler PDF.';
  }
  const gsOutput = `${err.stderr || ''}\n${err.stdout || ''}`;
  if (/password/i.test(gsOutput)) {
    return 'This PDF is password-protected. Remove the password and try again.';
  }
  return 'This PDF appears to be corrupted or unsupported and could not be processed.';
}

// bytes: Uint8Array of the PDF; options: { mode, level, targetBytes }
ipcMain.handle('compress-pdf', async (event, bytes, options = {}) => {
  const buffer = Buffer.from(bytes);
  const originalSize = buffer.length;
  const tempFiles = [];
  const newTemp = () => {
    const p = path.join(os.tmpdir(), `macrash-${crypto.randomUUID()}.pdf`);
    tempFiles.push(p);
    return p;
  };

  try {
    if (buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
      return { error: 'Only PDF files are allowed' };
    }

    const inputPath = newTemp();
    await fs.writeFile(inputPath, buffer);

    let best = null;
    let targetBytes = null;
    const mode = String(options.mode || 'preset').toLowerCase();

    if (mode === 'target') {
      targetBytes = Number(options.targetBytes);
      if (!Number.isFinite(targetBytes) || targetBytes < MIN_TARGET_BYTES) {
        return { error: 'Invalid target size. The minimum target is 10 KB.' };
      }
      const ratio = targetBytes / originalSize;
      let attempts = TARGET_ATTEMPTS;
      if (ratio < 0.1) attempts = TARGET_ATTEMPTS.slice(2);
      else if (ratio < 0.35) attempts = TARGET_ATTEMPTS.slice(1);

      const startedAt = Date.now();
      let smallest = null;
      for (const attempt of attempts) {
        if (smallest && Date.now() - startedAt > TARGET_TOTAL_BUDGET_MS) break;
        const outPath = newTemp();
        let size;
        try {
          size = await runGhostscript(inputPath, outPath, attempt.preset, attempt.resolution);
        } catch (err) {
          if (smallest) break;
          return { error: classifyGsError(err) };
        }
        if (!smallest || size < smallest.size) smallest = { path: outPath, size };
        if (size <= targetBytes) {
          best = { path: outPath, size };
          break;
        }
      }
      if (!best) best = smallest;
    } else {
      const preset = PDF_SETTINGS[String(options.level || 'medium').toLowerCase()];
      if (!preset) return { error: 'Invalid compression level.' };
      const outPath = newTemp();
      try {
        const size = await runGhostscript(inputPath, outPath, preset);
        best = { path: outPath, size };
      } catch (err) {
        return { error: classifyGsError(err) };
      }
    }

    const alreadyOptimized = best.size >= originalSize;
    const data = alreadyOptimized ? buffer : await fs.readFile(best.path);
    const sendSize = alreadyOptimized ? originalSize : best.size;

    return {
      data,
      originalSize,
      compressedSize: sendSize,
      alreadyOptimized,
      targetMet: targetBytes === null ? true : sendSize <= targetBytes,
    };
  } catch (err) {
    console.error('compress-pdf failed:', err);
    return { error: 'Something went wrong while compressing. Please try again.' };
  } finally {
    for (const p of tempFiles) await removeQuietly(p);
  }
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    minWidth: 480,
    minHeight: 600,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  // Open external links (e.g. "Support the developer") in the system browser
  // instead of a new Electron window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
