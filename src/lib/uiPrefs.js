// Per-device interface preferences: the look of the editor itself (not your designs).
// A tiny observable store so the background and panels update live while you edit settings.
import { useSyncExternalStore } from 'react';

const KEY = 'forge-ui-prefs';

export const BG_MODES = [
  ['liquid', 'Liquid blobs', 'Droplets'],
  ['bubbles', 'Many bubbles', 'CircleDot'],
  ['aurora', 'Aurora', 'Wind'],
  ['flow', 'Moving gradient', 'Waves'],
  ['gradient', 'Gradient', 'Blend'],
  ['radial', 'Radial glow', 'Sun'],
  ['mesh', 'Mesh', 'Grid2x2'],
  ['solid', 'One colour', 'Square'],
  ['image', 'Image', 'Image'],
];

export const DEFAULT_BG = {
  mode: 'liquid',
  color: '#0b0718',
  colors: ['#7b5cff', '#ff4fa3', '#2ad4ff', '#a78bfa'],
  angle: 135,
  speed: 1,
  count: 4,
  size: 46,
  opacity: 0.55,
  image: '',
  dim: 0.35,
};

export const BG_PRESETS = {
  'Midnight Liquid': { bg: { ...DEFAULT_BG }, accent: '#9d7bff', tint: '#16102c' },
  'Ocean Deep': { bg: { ...DEFAULT_BG, color: '#020d1f', colors: ['#0ea5e9', '#2563eb', '#14b8a6', '#38bdf8'], mode: 'liquid' }, accent: '#38bdf8', tint: '#0a1830' },
  'Sunset Lava': { bg: { ...DEFAULT_BG, color: '#1a0508', colors: ['#ff6a3d', '#ff2d6f', '#ffc93c', '#c2185b'], mode: 'bubbles', count: 9, size: 26 }, accent: '#ff7a45', tint: '#2a0d12' },
  Aurora: { bg: { ...DEFAULT_BG, color: '#020814', colors: ['#22d3ee', '#a3e635', '#8b5cf6'], mode: 'aurora' }, accent: '#5eead4', tint: '#0b1724' },
  'Neon Night': { bg: { ...DEFAULT_BG, color: '#05010d', colors: ['#ff00e5', '#00fff0', '#7c3aed'], mode: 'flow', angle: 120, speed: 1.4 }, accent: '#ff3df2', tint: '#120625' },
  'Forest Mist': { bg: { ...DEFAULT_BG, color: '#06110c', colors: ['#22c55e', '#0f766e', '#84cc16'], mode: 'radial' }, accent: '#4ade80', tint: '#0d1d16' },
  'Rose Gold': { bg: { ...DEFAULT_BG, color: '#1a0f12', colors: ['#f4a6b8', '#d4a373', '#b5838d', '#ffcdb2'], mode: 'mesh' }, accent: '#f4a6b8', tint: '#2a1a1f' },
  'Pure Black': { bg: { ...DEFAULT_BG, color: '#000000', mode: 'solid' }, accent: '#ffffff', tint: '#111111' },
  'Royal Gradient': { bg: { ...DEFAULT_BG, color: '#0d0b1f', colors: ['#1e1b4b', '#6d28d9', '#db2777'], mode: 'gradient', angle: 145 }, accent: '#f5c542', tint: '#1a1640' },
};

// v2: 'smooth' quality by default — solid-tinted panels with no live blur (fast on built-in graphics)
const defaults = { v: 2, ui: 'glass', motion: 'on', quality: 'smooth', bg: DEFAULT_BG, accent: '#9d7bff', tint: '#16102c', panelOpacity: 0.88, panelBlur: 0 };

function load() {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || '{}');
    // older saved settings used heavy live blur; move them to the fast default once
    if (!p.v) { delete p.panelBlur; delete p.panelOpacity; delete p.quality; }
    return { ...defaults, ...p, v: 2, bg: { ...DEFAULT_BG, ...(p.bg || {}) } };
  } catch { return { ...defaults }; }
}

let state = load();
const subs = new Set();

export const getPrefs = () => state;
export const subscribe = (f) => { subs.add(f); return () => subs.delete(f); };
export const usePrefs = () => useSyncExternalStore(subscribe, getPrefs);

const rgba = (hex, a) => {
  const h = String(hex || '#000000').replace('#', '').slice(0, 6).padEnd(6, '0');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) || 0);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

export function applyPrefs(p = state) {
  const el = document.documentElement;
  el.dataset.ui = p.ui;
  el.dataset.motion = p.motion;
  const vars = {
    '--panel': rgba(p.tint, p.panelOpacity),
    '--glass-blur': p.panelBlur > 0 ? `blur(${p.panelBlur}px) saturate(175%)` : 'none',
    '--acc': p.accent,
    '--acc-soft': rgba(p.accent, 0.2),
    '--bg': p.bg.color,
  };
  for (const [k, v] of Object.entries(vars)) {
    if (p.ui === 'glass') el.style.setProperty(k, v); else el.style.removeProperty(k);
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = p.ui === 'glass' ? p.bg.color : '#101016';
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode: still applies this visit */ }
}

export function setPref(k, v) {
  state = { ...state, [k]: v };
  save();
  applyPrefs(state);
  subs.forEach((f) => f());
  return state;
}

export const setBg = (patch) => setPref('bg', { ...state.bg, ...patch });

/** Smooth = fast (no live blur). Beautiful = real frosted glass (uses more graphics power). */
export function setQuality(q) {
  state = { ...state, quality: q, ...(q === 'beautiful' ? { panelBlur: 24, panelOpacity: 0.55 } : { panelBlur: 0, panelOpacity: 0.88 }) };
  save(); applyPrefs(state); subs.forEach((f) => f());
}

export function applyPreset(name) {
  const pr = BG_PRESETS[name];
  if (!pr) return;
  state = { ...state, ui: 'glass', bg: { ...pr.bg, colors: [...pr.bg.colors] }, accent: pr.accent, tint: pr.tint };
  save(); applyPrefs(state); subs.forEach((f) => f());
}

export function resetPrefs() {
  state = { ...defaults, bg: { ...DEFAULT_BG, colors: [...DEFAULT_BG.colors] } };
  save(); applyPrefs(state); subs.forEach((f) => f());
}
