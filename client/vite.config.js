import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative asset paths so the same build works on Vercel and inside the
  // Electron desktop app (which loads it from the local filesystem).
  base: './',
  plugins: [react()],
});
