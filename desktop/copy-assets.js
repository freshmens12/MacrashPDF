// Copies build assets into the desktop folder:
//   node copy-assets.js renderer  -> ../client/dist  => ./renderer
//   node copy-assets.js gs        -> local Ghostscript install => ./gs
const fs = require('node:fs');
const path = require('node:path');

const here = __dirname;
const what = process.argv[2];

function copyDir(src, dest) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true });
  console.log(`Copied ${src} -> ${dest}`);
}

if (what === 'renderer') {
  const dist = path.join(here, '..', 'client', 'dist');
  if (!fs.existsSync(path.join(dist, 'index.html'))) {
    console.error('client/dist not found - run "npm run build" in client/ first.');
    process.exit(1);
  }
  copyDir(dist, path.join(here, 'renderer'));
} else if (what === 'gs') {
  const target = path.join(here, 'gs');
  if (fs.existsSync(path.join(target, 'bin', 'gswin64c.exe'))) {
    console.log('gs/ already present - skipping copy.');
    process.exit(0);
  }
  const candidates = [
    process.env.GHOSTSCRIPT_HOME,
    path.join(process.env.LOCALAPPDATA || '', 'Ghostscript'),
  ].filter(Boolean);
  const src = candidates.find((c) => fs.existsSync(path.join(c, 'bin', 'gswin64c.exe')));
  if (!src) {
    console.error(
      'Ghostscript install not found. Install it (or set GHOSTSCRIPT_HOME to its folder) first.'
    );
    process.exit(1);
  }
  copyDir(src, target);
} else {
  console.error('Usage: node copy-assets.js <renderer|gs>');
  process.exit(1);
}
