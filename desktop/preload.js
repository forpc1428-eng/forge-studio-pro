// Desktop bridge for the editor (window.forgeDesktop).
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('forgeDesktop', {
  platform: process.platform,
  version: '2.1.0',
  apkTools: () => ipcRenderer.invoke('forge:apk-tools'),
  buildApk: (opts, onLog) => {
    const h = (_e, line) => onLog && onLog(line);
    ipcRenderer.on('forge:apk-log', h);
    return ipcRenderer.invoke('forge:build-apk', opts).finally(() => ipcRenderer.removeListener('forge:apk-log', h));
  },
  reveal: (p) => ipcRenderer.invoke('forge:reveal', p),
});
