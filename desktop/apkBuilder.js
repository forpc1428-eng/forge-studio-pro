// One-click APK builder: turns a generated Android project (from the Publish engine) into a real,
// installable .apk on THIS computer. Used by the desktop app (Electron) and by local mode (Vite dev server).
// Needs Java 17+ and the Android SDK (both come with Android Studio).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

function findSdk() {
  const c = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT, path.join(os.homedir(), 'AppData', 'Local', 'Android', 'Sdk'), path.join(os.homedir(), 'Library', 'Android', 'sdk'), path.join(os.homedir(), 'Android', 'Sdk')];
  return c.find((p) => p && fs.existsSync(path.join(p, 'platforms'))) || null;
}

function findJava() {
  const exe = process.platform === 'win32' ? 'java.exe' : 'java';
  const c = [];
  if (process.env.JAVA_HOME) c.push(path.join(process.env.JAVA_HOME, 'bin', exe));
  // Android Studio ships its own Java runtime
  for (const base of ['C:\\Program Files\\Android\\Android Studio', '/Applications/Android Studio.app/Contents']) {
    c.push(path.join(base, 'jbr', 'bin', exe), path.join(base, 'jre', 'bin', exe));
  }
  const found = c.find((p) => fs.existsSync(p));
  if (found) return found;
  try { execFileSync(exe, ['-version'], { stdio: 'ignore' }); return exe; } catch { return null; }
}

/** Is this computer able to build APKs? Returns what is missing in plain words. */
function checkTools() {
  const sdk = findSdk();
  const java = findJava();
  const missing = [];
  if (!java) missing.push('Java');
  if (!sdk) missing.push('Android SDK');
  return { ok: missing.length === 0, sdk, java, missing };
}

function writeFiles(dir, files) {
  for (const [rel, v] of Object.entries(files)) {
    const file = path.join(dir, rel);
    if (!file.startsWith(dir)) continue; // never write outside the build folder
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const data = v && typeof v === 'object' && !(v instanceof Uint8Array) && 'data' in v ? v.data : v;
    if (data && typeof data === 'object' && data.b64 !== undefined) fs.writeFileSync(file, Buffer.from(data.b64, 'base64'));
    else fs.writeFileSync(file, typeof data === 'string' ? data : Buffer.from(data));
  }
}

/**
 * Build a release APK.
 * @param {{ files: Record<string, any>, appName: string, version: string, outDir?: string, onLog?: (line: string) => void }} o
 * @returns {Promise<{ apkPath: string, seconds: number }>}
 */
function buildApk({ files, appName = 'App', version = '1.0.0', outDir, onLog = () => {} }) {
  return new Promise((resolve, reject) => {
    const tools = checkTools();
    if (!tools.ok) return reject(new Error(`Missing on this computer: ${tools.missing.join(' and ')}. Install Android Studio (free) once; it includes both.`));
    const t0 = Date.now();
    const work = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-apk-'));
    onLog('Preparing project…');
    writeFiles(work, files);
    fs.writeFileSync(path.join(work, 'local.properties'), `sdk.dir=${tools.sdk.replace(/\\/g, '/')}\n`);
    const env = { ...process.env, JAVA_OPTS: '-Djava.net.preferIPv4Stack=true' };
    if (tools.java !== 'java' && tools.java !== 'java.exe') env.JAVA_HOME = path.dirname(path.dirname(tools.java));
    const isWin = process.platform === 'win32';
    const gradlew = path.join(work, isWin ? 'gradlew.bat' : 'gradlew');
    if (!isWin) fs.chmodSync(gradlew, 0o755);
    onLog('Building APK (the first build downloads build tools once, about 2–5 minutes)…');
    const run = (attempt) => {
      const child = spawn(isWin ? 'cmd.exe' : gradlew, isWin ? ['/d', '/c', gradlew, 'assembleRelease', '--console=plain'] : ['assembleRelease', '--console=plain'], { cwd: work, env, windowsHide: true });
      const feed = (buf) => String(buf).split(/\r?\n/).forEach((l) => { const s = l.trim(); if (s && !/^\s*$/.test(s)) onLog(s.slice(0, 200)); });
      child.stdout.on('data', feed);
      child.stderr.on('data', feed);
      child.on('error', (e) => reject(e));
      child.on('close', (code) => {
        if (code !== 0) {
          if (attempt === 1) { onLog('First attempt failed (often a slow download). Retrying once…'); return run(2); }
          return reject(new Error('The Android build failed. See the log above for the reason.'));
        }
        const apk = path.join(work, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
        if (!fs.existsSync(apk)) return reject(new Error('Build finished but no APK was produced.'));
        const dest = outDir || path.join(os.homedir(), 'Downloads');
        fs.mkdirSync(dest, { recursive: true });
        const safe = String(appName).replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'App';
        const out = path.join(dest, `${safe}-v${version}.apk`);
        fs.copyFileSync(apk, out);
        try { fs.rmSync(work, { recursive: true, force: true }); } catch { /* temp cleanup is best-effort */ }
        resolve({ apkPath: out, seconds: Math.round((Date.now() - t0) / 1000) });
      });
    };
    run(1);
  });
}

/** Open the file's folder with the file highlighted. */
function revealFile(p) {
  if (process.platform === 'win32') spawn('explorer.exe', ['/select,', p], { detached: true });
  else spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [path.dirname(p)], { detached: true });
}

module.exports = { checkTools, buildApk, revealFile };
