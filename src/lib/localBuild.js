// Decides HOW an APK can be built from where Forge Pro is running:
//  - 'desktop': the Windows app builds it on this PC (Electron)
//  - 'local':   Start Forge Pro.bat's local server builds it on this PC
//  - null:      public website — browsers can't run Android tools, so we download the project zip instead
import { androidProject } from './publish.js';

const isLocalHost = () => ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);

export async function detectBuilder() {
  try {
    if (window.forgeDesktop?.apkTools) return { mode: 'desktop', tools: await window.forgeDesktop.apkTools() };
    if (isLocalHost()) {
      const r = await fetch('/__forge/apk-tools', { cache: 'no-store' });
      if (r.ok && (r.headers.get('content-type') || '').includes('json')) return { mode: 'local', tools: await r.json() };
    }
  } catch { /* not available */ }
  return { mode: null, tools: null };
}

function b64(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
}
const forTransport = (files) => Object.fromEntries(Object.entries(files).map(([k, v]) => {
  const d = v && typeof v === 'object' && !(v instanceof Uint8Array) && 'data' in v ? v.data : v;
  return [k, d instanceof Uint8Array ? { data: { b64: b64(d) } } : d];
}));

/** Build a real .apk on this computer. Resolves { apkPath, seconds }. */
export async function buildApkHere(mode, project, cfg, onLog) {
  onLog?.('Generating Android project…');
  const files = await androidProject(project, cfg);
  const opts = { appName: cfg.appName || project.name, version: cfg.version || '1.0.0' };
  if (mode === 'desktop') return window.forgeDesktop.buildApk({ ...opts, files }, onLog);
  const res = await fetch('/__forge/build-apk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...opts, files: forTransport(files) }) });
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i); buf = buf.slice(i + 1);
      if (!line.trim()) continue;
      const m = JSON.parse(line);
      if (m.log) onLog?.(m.log);
      if (m.error) throw new Error(m.error);
      if (m.done) return { apkPath: m.apkPath, seconds: m.seconds };
    }
  }
  throw new Error('The build stopped unexpectedly.');
}

export function revealApk(mode, p) {
  if (mode === 'desktop') return window.forgeDesktop.reveal(p);
  return fetch('/__forge/reveal', { method: 'POST', body: JSON.stringify({ path: p }) });
}
