export const defaultPublish = () => ({
  source: 'design', // design | html | url
  html: '', htmlFiles: null, url: '',
  appName: '', shortName: '', packageId: 'com.forge.myapp', version: '1.0.0', versionCode: 0,
  description: 'Made with Forge Studio Pro', author: 'Forge Developer', website: 'https://example.com',
  icon: null, iconBg: '#7c5cff', iconGlyph: 'Zap', iconPadding: 18, iconShape: 'squircle',
  splash: true, splashBg: '#0b0b12', splashDuration: 1200, splashText: true,
  themeColor: '#0b0b12', statusBar: 'dark', orientation: 'unspecified', fullscreen: false, immersive: false, keepAwake: false,
  minSdk: 24, targetSdk: 34, pullToRefresh: false, zoom: false, allowExternal: 'browser', userAgent: '', cache: true, backButton: 'history',
  fileUpload: true, downloads: true, geolocation: false, javascript: true, domStorage: true, hardware: true, debuggable: false,
  permissions: ['INTERNET', 'ACCESS_NETWORK_STATE'],
  // desktop
  winWidth: 1280, winHeight: 820, resizable: true, frame: true, alwaysOnTop: false, kiosk: false, menuBar: false, devTools: false, targets: ['win', 'mac', 'linux'], tray: false, singleInstance: true,
  // web
  pwa: true, offline: true, seoTitle: '', seoDesc: '', ogImage: '', analytics: '', lang: 'en', robots: true, sitemap: true, netlify: true, vercel: true,
});
