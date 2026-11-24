import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { ready } from './store.js';
import './styles.css';
import './motion.css';

// Load the project from device storage first (a few ms), then render — no flash of default content.
ready.finally(() => createRoot(document.getElementById('root')).render(<App />));

// Offline + instant reloads: cache the app on the device (production builds only).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
