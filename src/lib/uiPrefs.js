// Per-device interface preferences (look of the editor itself, not your designs).
const KEY = 'forge-ui-prefs';
const defaults = { ui: 'glass', motion: 'on' };

export function getPrefs() {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { ...defaults }; }
}

export function applyPrefs(p = getPrefs()) {
  const el = document.documentElement;
  el.dataset.ui = p.ui;
  el.dataset.motion = p.motion;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = p.ui === 'glass' ? '#120a2a' : '#101016';
}

export function setPref(k, v) {
  const p = { ...getPrefs(), [k]: v };
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* private mode: still applies for this visit */ }
  applyPrefs(p);
  return p;
}
