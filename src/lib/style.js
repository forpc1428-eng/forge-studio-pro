// Node -> CSS. Shared by canvas, preview and every code exporter, so what you see is what ships.
import { EASINGS } from './constants.js';

export function fillCSS(fill) {
  if (!fill || fill.type === 'none') return null;
  const stops = (fill.stops || []).map((s) => `${s.c} ${s.p}%`).join(', ');
  switch (fill.type) {
    case 'solid': return fill.color;
    case 'linear': return `linear-gradient(${fill.angle ?? 135}deg, ${stops})`;
    case 'radial': return `radial-gradient(circle at center, ${stops})`;
    case 'conic': return `conic-gradient(from ${fill.angle ?? 0}deg, ${stops})`;
    case 'mesh': {
      const s = fill.stops || [];
      const c = (i) => s[i % s.length]?.c || '#7c5cff';
      return `radial-gradient(at 20% 20%, ${c(0)} 0, transparent 55%), radial-gradient(at 80% 10%, ${c(1)} 0, transparent 50%), radial-gradient(at 70% 80%, ${c(2)} 0, transparent 55%), radial-gradient(at 10% 90%, ${c(3)} 0, transparent 50%), ${fill.color || '#0b0b12'}`;
    }
    case 'image': return fill.image ? `url("${fill.image}") center / ${fill.fit || 'cover'} no-repeat` : null;
    default: return null;
  }
}

export function shadowCSS(shadows) {
  if (!shadows || !shadows.length) return null;
  return shadows.filter((s) => !s.hidden).map((s) => `${s.inset ? 'inset ' : ''}${s.x}px ${s.y}px ${s.blur}px ${s.spread}px ${s.color}`).join(', ') || null;
}

export function radiusCSS(n) {
  if (n.radii) return n.radii.map((r) => `${r}px`).join(' ');
  return n.radius ? `${n.radius}px` : null;
}

export function filterCSS(n) {
  const f = n.filters || {};
  const parts = [];
  if (n.blur) parts.push(`blur(${n.blur}px)`);
  if (f.brightness != null && f.brightness !== 100) parts.push(`brightness(${f.brightness}%)`);
  if (f.contrast != null && f.contrast !== 100) parts.push(`contrast(${f.contrast}%)`);
  if (f.saturate != null && f.saturate !== 100) parts.push(`saturate(${f.saturate}%)`);
  if (f.hue) parts.push(`hue-rotate(${f.hue}deg)`);
  if (f.grayscale) parts.push(`grayscale(${f.grayscale}%)`);
  return parts.length ? parts.join(' ') : null;
}

const ALIGN = { start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch', between: 'space-between', around: 'space-around', evenly: 'space-evenly', baseline: 'baseline' };

/**
 * Outer style for a node.
 * @param n node
 * @param parent parent node (null for page level)
 */
export function nodeStyle(n, parent) {
  const s = {};
  const flow = parent && parent.layout && parent.layout.mode !== 'none';
  if (flow) {
    s.position = 'relative';
    s.flexShrink = 0;
    const row = parent.layout.mode === 'row';
    const mainFill = row ? n.sizeW === 'fill' : n.sizeH === 'fill';
    if (mainFill) { s.flex = '1 1 0'; s.minWidth = 0; }
    if (n.sizeW === 'fixed') s.width = n.w;
    else if (n.sizeW === 'fill') { if (!row) s.alignSelf = 'stretch'; }
    if (n.sizeH === 'fixed') s.height = n.h;
    else if (n.sizeH === 'fill') { if (row) s.alignSelf = 'stretch'; }
  } else {
    s.position = 'absolute';
    s.left = n.x;
    s.top = n.y;
    s.width = n.sizeW === 'hug' ? 'auto' : n.w;
    s.height = n.sizeH === 'hug' ? 'auto' : n.h;
    if (n.sizeW === 'hug') s.whiteSpace = 'nowrap';
  }
  if (n.rotation) s.transform = `rotate(${n.rotation}deg)`;
  if (n.opacity !== 1 && n.opacity != null) s.opacity = n.opacity;

  const bg = n.type === 'text' && !n.gradText ? fillCSS(n.fill) : n.type === 'text' ? null : fillCSS(n.fill);
  if (bg && !['toggle', 'checkbox', 'slider', 'progress'].includes(n.type)) s.background = bg;
  const r = radiusCSS(n);
  if (r) s.borderRadius = r;
  if (n.border && n.border.w) s.border = `${n.border.w}px ${n.border.style} ${n.border.color}`;
  const sh = shadowCSS(n.shadows);
  if (sh) s.boxShadow = sh;
  const f = filterCSS(n);
  if (f) s.filter = f;
  if (n.backdrop) { s.backdropFilter = `blur(${n.backdrop}px) saturate(160%)`; s.WebkitBackdropFilter = s.backdropFilter; }
  if (n.blend && n.blend !== 'normal') s.mixBlendMode = n.blend;
  if (n.clip || n.type === 'image' || n.type === 'video' || n.type === 'three' || n.type === 'code') s.overflow = 'hidden';
  if (n.cursor && n.cursor !== 'auto') s.cursor = n.cursor;
  if (n.action && n.action.type !== 'none' && (!n.cursor || n.cursor === 'auto')) s.cursor = 'pointer';
  s.boxSizing = 'border-box';

  if (n.children && n.layout && n.layout.mode !== 'none') {
    const L = n.layout;
    s.display = 'flex';
    s.flexDirection = L.mode === 'row' ? 'row' : 'column';
    if (L.wrap) s.flexWrap = 'wrap';
    s.gap = L.gap;
    const [pt, pr, pb, pl] = L.pad;
    if (pt || pr || pb || pl) s.padding = `${pt}px ${pr}px ${pb}px ${pl}px`;
    s.alignItems = ALIGN[L.align] || 'center';
    s.justifyContent = ALIGN[L.justify] || 'flex-start';
  }

  if (n.type === 'text') Object.assign(s, textStyle(n));
  if (n.type === 'input') {
    Object.assign(s, { fontFamily: fontStack(n.font), fontSize: n.fs, color: n.color, padding: `0 ${n.padX ?? 14}px`, outline: 'none' });
  }
  // motion custom props
  const a = n.anim || {};
  if (a.enter && a.enter !== 'none') {
    s['--fx-dur'] = `${a.dur}ms`;
    s['--fx-delay'] = `${a.delay}ms`;
    s['--fx-ease'] = EASINGS[a.ease] || EASINGS.smooth;
  }
  if (a.loop && a.loop !== 'none') s['--fx-loop'] = `${a.loopDur || 3000}ms`;
  return s;
}

export function fontStack(f) {
  if (!f) return 'Inter, system-ui, sans-serif';
  const mono = /Mono|Code/.test(f);
  return `'${f}', ${mono ? 'ui-monospace, monospace' : 'system-ui, sans-serif'}`;
}

export function textStyle(n) {
  const s = {
    fontFamily: fontStack(n.font), fontSize: n.fs, fontWeight: n.fw, lineHeight: n.lh, color: n.color,
    textAlign: n.align, display: 'flex', flexDirection: 'column',
    justifyContent: n.valign === 'top' ? 'flex-start' : n.valign === 'bottom' ? 'flex-end' : 'center',
    whiteSpace: n.sizeW === 'hug' ? 'pre' : 'pre-wrap', wordBreak: 'break-word',
  };
  if (n.ls) s.letterSpacing = `${n.ls}px`;
  if (n.italic) s.fontStyle = 'italic';
  if (n.deco && n.deco !== 'none') s.textDecoration = n.deco;
  if (n.transform && n.transform !== 'none') s.textTransform = n.transform;
  if (n.gradText) {
    s.background = fillCSS(n.fill.type === 'none' || n.fill.type === 'solid' ? { ...n.fill, type: 'linear' } : n.fill);
    s.WebkitBackgroundClip = 'text';
    s.backgroundClip = 'text';
    s.WebkitTextFillColor = 'transparent';
  }
  if (n.textShadow) s.textShadow = n.textShadow;
  return s;
}

export function motionClasses(n, { enter = true } = {}) {
  const a = n.anim || {};
  const c = [];
  if (enter && a.enter && a.enter !== 'none') c.push(`fx-in-${a.enter}`);
  if (a.hover && a.hover !== 'none') c.push(`fx-h-${a.hover}`);
  if (a.loop && a.loop !== 'none') c.push(`fx-l-${a.loop}`);
  return c.join(' ');
}

// camelCase style object -> css text
export function cssText(obj, indent = '  ') {
  return Object.entries(obj)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => {
      const prop = k.startsWith('--') ? k : k.replace(/^Webkit/, '-webkit-').replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
      const unitless = ['opacity', 'fontWeight', 'lineHeight', 'zIndex', 'flex', 'flexShrink', 'flexGrow'].includes(k);
      const val = typeof v === 'number' && !unitless ? `${v}px` : v;
      return `${indent}${prop}: ${val};`;
    })
    .join('\n');
}
