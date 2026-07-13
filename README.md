# MacrashPDF

A free, no-login PDF compression tool. Upload a PDF, pick a compression level, preview the
result, and download — files are deleted from the server the moment processing finishes.
Text stays selectable: compression uses Ghostscript's `pdfwrite` device, which never
rasterizes pages.

```
macrashpdf/
├── client/   → React + Vite + Tailwind CSS (deploy to Vercel)
└── server/   → Node.js + Express + Ghostscript (deploy to Render via Docker)
```

## Features

- Drag-and-drop or browse upload, **PDF only** (extension + MIME + magic-byte validation), 50 MB max
- **Target size mode** — pick "compress to at most 2 MB" (quick chips for 500 KB / 1 MB /
  2 MB / 5 MB or a custom KB/MB value). The server tries passes from best quality to most
  aggressive and returns the highest-quality result under your target; if the target is
  unreachable it returns the smallest result with `X-Target-Met: false`.
- Animated MACRASHPDF scramble intro on page load
- Footer server-status indicator — pings `/api/health` on load with a 90-second wake-up
  countdown (free Render instances sleep when idle; the ping itself wakes them), then shows
  a green "Server is online" pill, or a red "Server is offline" pill with a Retry button
- Three compression levels mapped to Ghostscript presets:
  | Level | Ghostscript preset | Best for |
  |--------|--------------------|----------|
  | Low | `/printer` | Best quality |
  | Medium | `/ebook` | Recommended balance |
  | High | `/screen` | Smallest size |
- Results screen with original vs compressed size, % saved, and a **MB / KB / Bytes** unit toggle
- Inline preview of the compressed PDF before downloading
- **Recompress** the same file at a different level without re-uploading
- Dark/light mode (follows system preference, toggle in header)
- Already-optimized PDFs are detected — you get the untouched original back, never a larger file
- Clear errors for non-PDFs, oversized files, password-protected/corrupted PDFs, and timeouts
- **No database, no storage** — temp files are deleted immediately after every request

---

## 1. Install Ghostscript (required for the server)

The server shells out to Ghostscript, so it must be on your PATH (or pointed to via
`GHOSTSCRIPT_PATH`).

### Windows

Option A — winget:

```powershell
winget install ArtifexSoftware.GhostscriptAGPL
```

Option B — download the installer from https://ghostscript.com/releases/gsdnld.html
(choose *Ghostscript AGPL Release* for 64-bit Windows).

Then verify (open a **new** terminal after installing):

```powershell
gswin64c --version
```

If the command isn't found, add the Ghostscript `bin` folder (e.g.
`C:\Program Files\gs\gs10.03.1\bin`) to your PATH, **or** set an env var before starting
the server:

```powershell
$env:GHOSTSCRIPT_PATH = "C:\Program Files\gs\gs10.03.1\bin\gswin64c.exe"
```

### macOS

```bash
brew install ghostscript
gs --version
```

### Linux (Debian/Ubuntu)

```bash
sudo apt-get update && sudo apt-get install -y ghostscript
gs --version
```

---

## 2a. One-click local launch (Windows)

Double-click **`start.bat`** in the project root. It checks Node.js, installs dependencies
on first run, finds Ghostscript, starts the server and client in two windows, waits until
the app answers, and opens http://localhost:5173 in your browser. Everything runs fully
offline at full CPU speed. To shut down, close the two MacrashPDF windows or run
**`stop.bat`**.

## 2. Run locally

### Server (port 5000)

```bash
cd server
npm install
npm run dev        # or: npm start
```

Environment variables (all optional locally):

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `5000` | Server port |
| `GHOSTSCRIPT_PATH` | `gswin64c` (Windows) / `gs` (elsewhere) | Full path to the Ghostscript binary |
| `CLIENT_ORIGIN` | `*` | CORS allowlist — set to your Vercel URL in production |

Quick check: http://localhost:5000/api/health should return `{"status":"ok"}`.

### Client (port 5173)

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173. The client calls `http://localhost:5000` by default; to point
elsewhere, copy `.env.example` to `.env` and set `VITE_API_URL`.

---

## 3. Deploy the server to Render

Render's native Node environment does **not** include Ghostscript, so the server ships
with a `Dockerfile` (Node 20 slim + Ghostscript).

1. Push this repository to GitHub.
2. On [Render](https://render.com) → **New → Web Service** → connect the repo.
3. Settings:
   - **Root Directory:** `server`
   - **Runtime/Language:** `Docker` (Render detects `server/Dockerfile` automatically)
   - **Instance type:** Free tier works for testing (note: free instances sleep when idle,
     so the first request after a while can take ~30–60 s).
4. Environment variables:
   - `CLIENT_ORIGIN` = your Vercel URL, e.g. `https://macrashpdf.vercel.app`
5. Deploy, then verify `https://<your-service>.onrender.com/api/health`.

## 4. Deploy the client to Vercel

1. On [Vercel](https://vercel.com) → **Add New → Project** → import the same repo.
2. Settings:
   - **Root Directory:** `client`
   - **Framework Preset:** Vite (build command `npm run build`, output `dist` — auto-detected)
3. Environment variable:
   - `VITE_API_URL` = your Render URL, e.g. `https://macrashpdf-server.onrender.com`
     (no trailing slash)
4. Deploy. If you set `CLIENT_ORIGIN` on Render *after* noting your final Vercel domain,
   redeploy the server so CORS picks it up.

---

## API

### `POST /api/compress`

`multipart/form-data` with fields:

- `file` — the PDF (≤ 50 MB, must be `application/pdf` with a `.pdf` extension)
- `mode` — `preset` (default) or `target`
- `level` — `low` | `medium` | `high` (default `medium`, used when `mode=preset`)
- `targetBytes` — desired maximum size in bytes (used when `mode=target`, minimum 10240)

**Success (200):** the compressed PDF bytes, plus headers:

- `X-Original-Size` / `X-Compressed-Size` — sizes in bytes
- `X-Already-Optimized` — `true` when compression couldn't shrink the file
  (the response body is then the untouched original)
- `X-Target-Met` — `false` when `mode=target` and even the most aggressive pass
  couldn't get under `targetBytes` (the smallest result is returned anyway)

**Errors (JSON `{ "error": "..." }`):** `400` invalid file/level, `413` over 50 MB,
`422` corrupted or password-protected PDF, `504` Ghostscript timeout, `500` server error.

### `GET /api/health`

Returns `{"status":"ok"}` — used to verify deployment.

## Privacy

Uploaded and compressed files live only in the OS temp directory for the duration of a
single request and are deleted in a `finally` block — on success, on failure, and on
every error path. Nothing is logged about file contents and there is no database.

---

Developed by **Vincent Enimedez**.
