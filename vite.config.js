import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // relative paths: works at any URL (GitHub Pages sub-path, custom domain, or opened offline)
  base: './',
  plugins: [react()],
  server: { port: 5199 },
  build: { chunkSizeWarningLimit: 4000 },
});
