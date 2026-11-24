import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Local mode (Start Forge Pro.bat): lets the editor build real APKs on this PC, same as the desktop app.
// Only exists on the local dev server; the public website never has these endpoints.
function forgeLocalBuilder() {
  return {
    name: 'forge-local-builder',
    apply: 'serve',
    configureServer(server) {
      const apk = require('./desktop/apkBuilder.js');
      const readBody = (req) => new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        req.on('error', reject);
      });
      server.middlewares.use('/__forge/apk-tools', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(apk.checkTools()));
      });
      server.middlewares.use('/__forge/build-apk', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; return res.end(); }
        res.setHeader('Content-Type', 'application/x-ndjson');
        const send = (o) => res.write(JSON.stringify(o) + '\n');
        try {
          const opts = JSON.parse(await readBody(req));
          const out = await apk.buildApk({ ...opts, onLog: (line) => send({ log: line }) });
          send({ done: true, ...out });
        } catch (e) {
          send({ error: e.message });
        }
        res.end();
      });
      server.middlewares.use('/__forge/reveal', async (req, res) => {
        try { const { path } = JSON.parse(await readBody(req)); if (String(path).endsWith('.apk')) apk.revealFile(path); } catch { /* ignore */ }
        res.end('{}');
      });
    },
  };
}

export default defineConfig({
  // relative paths: works at any URL (GitHub Pages sub-path, custom domain, or opened offline)
  base: './',
  plugins: [react(), forgeLocalBuilder()],
  server: { port: 5199 },
  build: { chunkSizeWarningLimit: 4000 },
});
