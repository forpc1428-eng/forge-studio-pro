// Node model + tree utilities. Every element on the canvas is a node.
// Containers ("frame") have children and optional auto-layout (flex).

export const uid = () => Math.random().toString(36).slice(2, 9);

export const TYPES = {
  frame: { label: 'Frame', icon: 'Frame', container: true },
  text: { label: 'Text', icon: 'Type' },
  image: { label: 'Image', icon: 'Image' },
  icon: { label: 'Icon', icon: 'Smile' },
  input: { label: 'Input', icon: 'TextCursorInput' },
  toggle: { label: 'Toggle', icon: 'ToggleRight' },
  checkbox: { label: 'Checkbox', icon: 'SquareCheck' },
  slider: { label: 'Slider', icon: 'SlidersHorizontal' },
  progress: { label: 'Progress', icon: 'Loader' },
  chart: { label: 'Chart', icon: 'ChartColumn' },
  three: { label: '3D Scene', icon: 'Box' },
  code: { label: 'Custom code', icon: 'Code' },
  video: { label: 'Video', icon: 'Video' },
};

export const BASE = {
  x: 0, y: 0, w: 100, h: 100, rotation: 0, opacity: 1, visible: true, locked: false,
  fill: { type: 'none', color: '#ffffff', stops: [{ c: '#7c5cff', p: 0 }, { c: '#ff4fa3', p: 100 }], angle: 135, image: '', fit: 'cover' },
  radius: 0, radii: null, // radii = [tl,tr,br,bl] when individual
  border: { w: 0, color: '#ffffff33', style: 'solid' },
  shadows: [],
  blur: 0, backdrop: 0, blend: 'normal',
  filters: { brightness: 100, contrast: 100, saturate: 100, hue: 0, grayscale: 0 },
  clip: false,
  layout: { mode: 'none', gap: 8, pad: [0, 0, 0, 0], align: 'center', justify: 'start', wrap: false },
  sizeW: 'fixed', sizeH: 'fixed', // fixed | fill | hug (inside auto-layout)
  anim: { enter: 'none', dur: 600, delay: 0, ease: 'smooth', hover: 'none', loop: 'none', loopDur: 3000 },
  action: { type: 'none', target: '' },
  cursor: 'auto',
};

export const TEXT_DEFAULTS = {
  text: 'Text', font: 'Inter', fs: 16, fw: 400, lh: 1.4, ls: 0, color: '#f5f5f7',
  align: 'left', valign: 'center', italic: false, deco: 'none', transform: 'none', gradText: false,
};

const TYPE_DEFAULTS = {
  frame: { w: 200, h: 140, fill: { type: 'solid', color: '#1c1c26' } },
  text: { w: 200, h: 28, ...TEXT_DEFAULTS, sizeW: 'fixed', sizeH: 'hug' },
  image: { w: 240, h: 160, src: '', fit: 'cover', radius: 12 },
  icon: { w: 24, h: 24, icon: 'Heart', color: '#f5f5f7', stroke: 2 },
  input: { w: 260, h: 44, placeholder: 'Type here…', inputType: 'text', value: '', font: 'Inter', fs: 15, color: '#f5f5f7', radius: 10, padX: 14,
    fill: { type: 'solid', color: '#16161e' }, border: { w: 1, color: '#2e2e3c', style: 'solid' } },
  toggle: { w: 46, h: 26, checked: true, color: '#7c5cff', offColor: '#3a3a48' },
  checkbox: { w: 22, h: 22, checked: true, color: '#7c5cff', radius: 6 },
  slider: { w: 220, h: 20, value: 60, color: '#7c5cff', track: '#2e2e3c' },
  progress: { w: 220, h: 8, value: 65, color: '#7c5cff', track: '#2e2e3c', radius: 99, ring: false },
  chart: { w: 320, h: 180, kind: 'bar', data: [32, 48, 40, 66, 54, 80, 72], labels: '', color: '#7c5cff', color2: '#ff4fa3', grid: true, smooth: true },
  three: { w: 300, h: 300, shape: 'torusKnot', material: 'physical', color: '#7c5cff', color2: '#ff4fa3', metalness: 0.3, roughness: 0.15,
    distort: 0.4, speed: 2, autoRotate: true, float: true, wireframe: false, light: 1.2, scale: 1, env: 'studio', count: 1, transmission: 0 },
  code: { w: 300, h: 160, html: '<div class="box">Custom <b>HTML</b></div>', css: '.box{height:100%;display:grid;place-items:center;color:#fff;font:600 20px Inter;background:linear-gradient(135deg,#7c5cff,#ff4fa3);border-radius:16px}' },
  video: { w: 320, h: 180, src: '', autoplay: true, loopVideo: true, muted: true, radius: 12, fill: { type: 'solid', color: '#000000' } },
};

const clone = (o) => JSON.parse(JSON.stringify(o));

export function createNode(type, props = {}, children) {
  const d = clone(BASE);
  const td = clone(TYPE_DEFAULTS[type] || {});
  const n = { id: uid(), type, name: props.name || TYPES[type]?.label || type, ...d, ...td };
  // deep-merge the known object props
  for (const k of Object.keys(props)) {
    const v = props[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && n[k] && typeof n[k] === 'object' && !Array.isArray(n[k])) n[k] = { ...n[k], ...v };
    else n[k] = v;
  }
  if (TYPES[type]?.container) n.children = children || props.children || [];
  return n;
}

// ---------- tree helpers (pure) ----------
export function walk(nodes, fn, parent = null) {
  for (const n of nodes) {
    if (fn(n, parent) === false) return false;
    if (n.children && walk(n.children, fn, n) === false) return false;
  }
}

export function findNode(nodes, id) {
  let out = null;
  walk(nodes, (n) => { if (n.id === id) { out = n; return false; } });
  return out;
}

export function findParent(nodes, id) {
  let out = null;
  walk(nodes, (n, p) => { if (n.id === id) { out = p; return false; } });
  return out; // null => top level
}

export function pathTo(nodes, id, acc = []) {
  for (const n of nodes) {
    if (n.id === id) return [...acc, n.id];
    if (n.children) {
      const r = pathTo(n.children, id, [...acc, n.id]);
      if (r) return r;
    }
  }
  return null;
}

export function siblingsOf(nodes, id) {
  const p = findParent(nodes, id);
  return p ? p.children : nodes;
}

export function removeNodes(nodes, ids) {
  const set = new Set(ids);
  return nodes.filter((n) => !set.has(n.id)).map((n) => (n.children ? { ...n, children: removeNodes(n.children, ids) } : n));
}

export function reid(node) {
  const n = { ...node, id: uid() };
  if (n.children) n.children = n.children.map(reid);
  return n;
}

export function cloneTree(node) {
  return reid(clone(node));
}

// mutable (used inside immer drafts)
export function draftFind(nodes, id) {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const r = draftFind(n.children, id);
      if (r) return r;
    }
  }
  return null;
}

export function draftSiblings(nodes, id) {
  for (const n of nodes) if (n.id === id) return nodes;
  for (const n of nodes) {
    if (n.children) {
      const r = draftSiblings(n.children, id);
      if (r) return r;
    }
  }
  return null;
}

export function draftParent(nodes, id, parent = null) {
  for (const n of nodes) {
    if (n.id === id) return parent;
    if (n.children) {
      const r = draftParent(n.children, id, n);
      if (r !== undefined) return r;
    }
  }
  return undefined;
}

export function countNodes(nodes) {
  let c = 0;
  walk(nodes, () => { c++; });
  return c;
}

// bounding box of a list of sibling nodes
export function bbox(list) {
  if (!list.length) return { x: 0, y: 0, w: 0, h: 0 };
  const x = Math.min(...list.map((n) => n.x));
  const y = Math.min(...list.map((n) => n.y));
  const r = Math.max(...list.map((n) => n.x + n.w));
  const b = Math.max(...list.map((n) => n.y + n.h));
  return { x, y, w: r - x, h: b - y };
}
