// Forge Studio Pro: desktop edition (Electron).
// Serves the built editor from a private app:// origin so storage (IndexedDB), module scripts
// and the 3D engine behave exactly like the website, fully offline.
const { app, BrowserWindow, Menu, shell, protocol, net, session } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

const APP_DIR = path.join(__dirname, 'app');

// app:// is a standard, secure origin: persistent storage, service-worker-free, no CORS issues.
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

// one window only: launching again focuses the existing one
if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => {
  const w = BrowserWindow.getAllWindows()[0];
  if (w) { if (w.isMinimized()) w.restore(); w.focus(); }
});

// Use the discrete/high-performance GPU when the laptop has one; keep GPU acceleration on.
app.commandLine.appendSwitch('force_high_performance_gpu');

function createWindow() {
  const win = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1000,
    minHeight: 640,
    title: 'Forge Studio Pro',
    backgroundColor: '#0b0718',
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      backgroundThrottling: true,
    },
  });
  Menu.setApplicationMenu(null);
  win.once('ready-to-show', () => { win.maximize(); win.show(); });

  // links to other sites (docs, stock photos, GitHub) open in the normal browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('app://')) { e.preventDefault(); shell.openExternal(url); }
  });

  // F11 fullscreen, Ctrl+Shift+I devtools, Ctrl+R reload
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    if (input.control && input.shift && input.key.toLowerCase() === 'i') { win.webContents.toggleDevTools(); e.preventDefault(); }
    if (input.control && !input.shift && input.key.toLowerCase() === 'r') { win.webContents.reload(); e.preventDefault(); }
  });

  win.loadURL('app://forge/index.html');
}

app.whenReady().then(() => {
  protocol.handle('app', (req) => {
    const { pathname } = new URL(req.url);
    const rel = decodeURIComponent(pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.normalize(path.join(APP_DIR, rel));
    if (!file.startsWith(APP_DIR)) return new Response('Forbidden', { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });
  // allow camera / mic / notifications etc. for web APIs used inside designs and previews
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) => cb(true));
  createWindow();
});

app.on('window-all-closed', () => app.quit());
