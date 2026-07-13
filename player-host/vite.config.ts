// Builds the player host into the app's public/ directory as a plain static asset
// (served at /player-host/index.html in dev, preview, and production - Vite copies
// public/ into dist/). base './' keeps every asset reference relative so the page
// works from any mount path.

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: '../public/player-host',
    emptyOutDir: true,
  },
});
