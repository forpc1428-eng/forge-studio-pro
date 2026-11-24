// Tells the editor it is running as the desktop app (window.forgeDesktop).
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('forgeDesktop', {
  platform: process.platform,
  version: '2.0.0',
});
