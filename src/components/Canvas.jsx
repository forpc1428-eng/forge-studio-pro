import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useStore } from '../store.js';
import { NodeView } from './NodeView.jsx';
import { fillCSS } from '../lib/style.js';
import { createNode, findNode, findParent } from '../lib/nodes.js';
import { LIBRARY } from '../lib/library.js';
import { IconBtn, Icon, Menu } from '../ui/controls.jsx';
import { contextItems } from './contextMenu.js';

const SNAP = 6;

// Run a pointer handler at most once per frame (latest event wins); flush() applies a pending one now.
function rafThrottle(fn) {
  let raf = 0, last = null;
  const run = (ev) => { last = ev; if (!raf) raf = requestAnimationFrame(() => { raf = 0; fn(last); }); };
  run.flush = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; fn(last); } };
  return run;
}

export default function Canvas() {
  const stageRef = useRef(null);
  const pageRef = useRef(null);
  const page = useStore((s) => s.page());
  const zoom = useStore((s) => s.zoom);
  const pan = useStore((s) => s.pan);
  const selection = useStore((s) => s.selection);
  const editingId = useStore((s) => s.editingId);
  const tool = useStore((s) => s.tool);
  const explode = useStore((s) => s.explode);
  const ea = useStore((s) => s.explodeAngle);
  const grid = useStore((s) => s.grid);
  const playKey = useStore((s) => s.playKey);
  const theme = useStore((s) => s.project.theme.tokens);
  const set = useStore((s) => s.set);
  const [ov, setOv] = useState({ sel: [], hover: null });
  const [guides, setGuides] = useState([]);
  const [marquee, setMarquee] = useState(null);
  const [draw, setDraw] = useState(null);
  const [menu, setMenu] = useState(null);
  const [spaceDown, setSpaceDown] = useState(false);
  const [dropLine, setDropLine] = useState(null);
  const hoverRef = useRef(null);

  // ---------- coordinate helpers ----------
  const stageRect = () => stageRef.current.getBoundingClientRect();
  const toPage = useCallback((cx, cy) => {
    const r = stageRect();
    const { pan: p, zoom: z } = useStore.getState();
    return { x: (cx - r.left - p.x) / z, y: (cy - r.top - p.y) / z };
  }, []);
  const elOf = (id) => pageRef.current?.querySelector(`[data-nid="${id}"]`);
  const rectOf = (id) => {
    const el = elOf(id);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const s = stageRect();
    return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height };
  };

  // ---------- fit ----------
  const fit = useCallback(() => {
    const st = stageRef.current;
    if (!st) return;
    const pg = useStore.getState().page();
    const W = st.clientWidth, H = st.clientHeight;
    const z = Math.min((W - 120) / pg.w, (H - 120) / Math.min(pg.h, pg.w * 1.6), 2);
    const zz = Math.max(0.05, +z.toFixed(3));
    set({ zoom: zz, pan: { x: Math.round((W - pg.w * zz) / 2), y: 60 } });
  }, [set]);
  useLayoutEffect(() => {
    fit();
    // refit once the stage gets a real size (first layout, panel/window resizes)
    let lastW = stageRef.current?.clientWidth || 0;
    const ro = new ResizeObserver(() => {
      const w = stageRef.current?.clientWidth || 0;
      if (lastW < 100 && w >= 100) fit();
      lastW = w;
    });
    if (stageRef.current) ro.observe(stageRef.current);
    return () => ro.disconnect();
  }, [page.id, fit]);
  useEffect(() => {
    useStore.setState({
      viewCenter: () => {
        const st = stageRef.current;
        if (!st) return { x: 200, y: 200 };
        const { pan: p, zoom: z } = useStore.getState();
        return { x: (st.clientWidth / 2 - p.x) / z, y: (st.clientHeight / 2 - p.y) / z };
      },
      fitView: fit,
      zoomTo: (nz) => {
        const st = stageRef.current;
        const { pan: p, zoom: z } = useStore.getState();
        const cx = st.clientWidth / 2, cy = st.clientHeight / 2;
        const k = nz / z;
        useStore.setState({ zoom: nz, pan: { x: cx - (cx - p.x) * k, y: cy - (cy - p.y) * k } });
      },
    });
  }, [fit]);

  // ---------- overlay measurement (event-driven: only runs when something changes) ----------
  // Measures selection/hover boxes for a short burst of frames after any change
  // (so entrance animations and layout settle correctly), then goes fully idle.
  const remeasure = useRef(() => {});
  useEffect(() => {
    let raf = 0;
    let framesLeft = 0;
    let last = '';
    const measure = () => {
      const st = useStore.getState();
      if (stageRef.current && pageRef.current) {
        const sel = st.explode ? [] : st.selection.map((id) => { const r = rectOf(id); return r && { id, ...r }; }).filter(Boolean);
        const hv = hoverRef.current && !st.selection.includes(hoverRef.current) && !st.explode ? rectOf(hoverRef.current) : null;
        const key = sel.map((r) => `${r.id}${r.x | 0},${r.y | 0},${r.w | 0},${r.h | 0}`).join('|') + (hv ? `#${hv.x | 0},${hv.y | 0},${hv.w | 0},${hv.h | 0}` : '');
        if (key !== last) { last = key; setOv({ sel, hover: hv }); }
      }
    };
    const loop = () => {
      measure();
      raf = --framesLeft > 0 ? requestAnimationFrame(loop) : 0;
    };
    remeasure.current = (frames = 2) => {
      framesLeft = Math.max(framesLeft, frames);
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const unsub = useStore.subscribe((s, prev) => {
      if (s.selection !== prev.selection || s.project !== prev.project || s.pageId !== prev.pageId || s.playKey !== prev.playKey) remeasure.current(45);
      else if (s.zoom !== prev.zoom || s.pan !== prev.pan || s.explode !== prev.explode || s.editingId !== prev.editingId) remeasure.current(2);
    });
    const onResize = () => remeasure.current(4);
    window.addEventListener('resize', onResize);
    remeasure.current(45);
    return () => { unsub(); window.removeEventListener('resize', onResize); cancelAnimationFrame(raf); };
  }, []);

  // ---------- wheel zoom / pan ----------
  useEffect(() => {
    const st = stageRef.current;
    const onWheel = (e) => {
      e.preventDefault();
      const { zoom: z, pan: p } = useStore.getState();
      if (e.ctrlKey || e.metaKey) {
        const r = st.getBoundingClientRect();
        const cx = e.clientX - r.left, cy = e.clientY - r.top;
        const nz = Math.min(8, Math.max(0.03, z * Math.exp(-e.deltaY * 0.0022)));
        const k = nz / z;
        set({ zoom: nz, pan: { x: cx - (cx - p.x) * k, y: cy - (cy - p.y) * k } });
      } else {
        set({ pan: { x: p.x - (e.shiftKey ? e.deltaY : e.deltaX), y: p.y - (e.shiftKey ? 0 : e.deltaY) } });
      }
    };
    st.addEventListener('wheel', onWheel, { passive: false });
    return () => st.removeEventListener('wheel', onWheel);
  }, [set]);

  useEffect(() => {
    const d = (e) => { if (e.code === 'Space' && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName) && !document.activeElement?.isContentEditable) { setSpaceDown(true); e.preventDefault(); } };
    const u = (e) => { if (e.code === 'Space') setSpaceDown(false); };
    window.addEventListener('keydown', d);
    window.addEventListener('keyup', u);
    return () => { window.removeEventListener('keydown', d); window.removeEventListener('keyup', u); };
  }, []);

  // ---------- picking ----------
  const chainFor = (target) => {
    const ids = [];
    let el = target;
    while (el && el !== pageRef.current) {
      if (el.dataset?.nid) ids.unshift(el.dataset.nid);
      el = el.parentElement;
    }
    const pg = useStore.getState().page();
    return ids.filter((id) => { const n = findNode(pg.nodes, id); return n && !n.locked; });
  };
  const pick = (chain, deep) => {
    if (!chain.length) return null;
    if (deep) return chain[chain.length - 1];
    const { selection: sel } = useStore.getState();
    const pg = useStore.getState().page();
    let depth = 0;
    for (const s of sel) {
      const i = chain.indexOf(s);
      if (i >= 0) { depth = Math.max(depth, i); continue; }
      const p = findParent(pg.nodes, s);
      if (p) { const j = chain.indexOf(p.id); if (j >= 0) depth = Math.max(depth, j + 1); }
    }
    return chain[Math.min(depth, chain.length - 1)];
  };

  // ---------- pan ----------
  const startPan = (e) => {
    const sx = e.clientX, sy = e.clientY;
    const p0 = useStore.getState().pan;
    const move = rafThrottle((ev) => set({ pan: { x: p0.x + ev.clientX - sx, y: p0.y + ev.clientY - sy } }));
    stageRef.current.style.cursor = 'grabbing';
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); move.flush(); stageRef.current.style.cursor = ''; };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const startOrbit = (e) => {
    const sx = e.clientX, sy = e.clientY;
    const a0 = useStore.getState().explodeAngle;
    const move = (ev) => set({ explodeAngle: { x: Math.max(0, Math.min(85, a0.x - (ev.clientY - sy) * 0.3)), z: a0.z + (ev.clientX - sx) * 0.3 } });
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // ---------- main pointer down ----------
  const onPointerDown = (e) => {
    if (menu) setMenu(null);
    if (e.button === 1 || spaceDown || tool === 'hand') { e.preventDefault(); return startPan(e); }
    if (e.button === 2) return;
    if (explode) return startOrbit(e);
    const st = useStore.getState();
    if (st.editingId) { document.activeElement?.blur?.(); }

    if (['frame', 'rect', 'ellipse', 'text', 'image', 'three'].includes(tool)) return startDraw(e);

    const target = e.target.closest('[data-nid]');
    const chain = target ? chainFor(target) : [];
    const id = pick(chain, e.ctrlKey || e.metaKey);
    if (!id) {
      if (!e.shiftKey) set({ selection: [] });
      // empty space around the page: drag to move the view. On the page itself: drag to select.
      if (!pageRef.current.contains(e.target)) return startPan(e);
      return startMarquee(e);
    }
    let sel = st.selection;
    if (e.shiftKey) sel = sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id];
    else if (!sel.includes(id)) sel = [id];
    set({ selection: sel, editingId: null });
    if (sel.includes(id)) startMove(e, sel, id);
  };

  // ---------- move ----------
  const startMove = (e, sel, primary) => {
    const st = useStore.getState();
    const pg = st.page();
    const nodes = sel.map((id) => findNode(pg.nodes, id)).filter((n) => n && !n.locked);
    if (!nodes.length) return;
    const parent = findParent(pg.nodes, nodes[0].id);
    const flow = parent && parent.layout.mode !== 'none';
    const start = Object.fromEntries(nodes.map((n) => [n.id, { x: n.x, y: n.y }]));
    const sx = e.clientX, sy = e.clientY;
    const rects = nodes.map((n) => rectOf(n.id)).filter(Boolean);
    if (!rects.length) return;
    const union = {
      x: Math.min(...rects.map((r) => r.x)), y: Math.min(...rects.map((r) => r.y)),
      r: Math.max(...rects.map((r) => r.x + r.w)), b: Math.max(...rects.map((r) => r.y + r.h)),
    };
    // snap targets: siblings + parent box (screen coords)
    const sibs = (parent ? parent.children : pg.nodes).filter((n) => !sel.includes(n.id) && n.visible);
    const tx = [], ty = [];
    for (const s of sibs) { const r = rectOf(s.id); if (!r) continue; tx.push(r.x, r.x + r.w / 2, r.x + r.w); ty.push(r.y, r.y + r.h / 2, r.y + r.h); }
    const pr = parent ? rectOf(parent.id) : (() => { const r = pageRef.current.getBoundingClientRect(); const s = stageRect(); return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height }; })();
    if (pr) { tx.push(pr.x, pr.x + pr.w / 2, pr.x + pr.w); ty.push(pr.y, pr.y + pr.h / 2, pr.y + pr.h); }
    let moved = false;
    const ids = Object.keys(start);
    const els = Object.fromEntries(ids.map((id) => [id, elOf(id)]));
    let last = { dx: 0, dy: 0 };
    let lastGuides = '';
    let lastIdx = -1;
    hoverRef.current = null;
    st.begin();

    const move = (ev) => {
      let dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (!moved && Math.hypot(dx, dy) < 3) return;
      moved = true;
      if (flow) {
        // reorder preview inside auto layout
        const row = parent.layout.mode === 'row';
        const kids = parent.children.filter((c) => c.id !== primary);
        let idx = kids.length;
        for (let i = 0; i < kids.length; i++) {
          const r = rectOf(kids[i].id);
          if (!r) continue;
          const mid = row ? r.x + r.w / 2 : r.y + r.h / 2;
          const s = stageRect();
          if ((row ? ev.clientX - s.left : ev.clientY - s.top) < mid) { idx = i; break; }
        }
        const ref = kids[idx] ? rectOf(kids[idx].id) : kids.length ? rectOf(kids[kids.length - 1].id) : null;
        if (ref && idx !== lastIdx) {
          lastIdx = idx;
          const after = !kids[idx];
          setDropLine(row ? { x: after ? ref.x + ref.w + 2 : ref.x - 3, y: ref.y, w: 2, h: ref.h, idx } : { x: ref.x, y: after ? ref.y + ref.h + 2 : ref.y - 3, w: ref.w, h: 2, idx });
        }
        return;
      }
      if (ev.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
      const g = [];
      if (useStore.getState().snap && !ev.altKey) {
        const xs = [union.x + dx, (union.x + union.r) / 2 + dx, union.r + dx];
        const ys = [union.y + dy, (union.y + union.b) / 2 + dy, union.b + dy];
        let bx = null, by = null;
        for (const x of xs) for (const t of tx) { const d = t - x; if (Math.abs(d) < SNAP && (bx === null || Math.abs(d) < Math.abs(bx.d))) bx = { d, t }; }
        for (const y of ys) for (const t of ty) { const d = t - y; if (Math.abs(d) < SNAP && (by === null || Math.abs(d) < Math.abs(by.d))) by = { d, t }; }
        if (bx) { dx += bx.d; g.push({ type: 'v', x: bx.t }); }
        if (by) { dy += by.d; g.push({ type: 'h', y: by.t }); }
      }
      const gk = g.map((x) => `${x.type}${x.x ?? x.y}`).join();
      if (gk !== lastGuides) { lastGuides = gk; setGuides(g); }
      // Move the elements directly on screen (no app-wide re-render per mouse move);
      // the real position is saved once on release.
      const z = useStore.getState().zoom;
      last = { dx: dx / z, dy: dy / z };
      for (const id of ids) {
        const el = els[id];
        if (!el) continue;
        el.style.left = `${Math.round(start[id].x + last.dx)}px`;
        el.style.top = `${Math.round(start[id].y + last.dy)}px`;
      }
      remeasure.current(1);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setGuides([]);
      if (!flow && moved) {
        useStore.getState().update(ids, (n) => { n.x = Math.round(start[n.id].x + last.dx); n.y = Math.round(start[n.id].y + last.dy); }, false);
      }
      if (flow && moved) {
        setDropLine((dl) => {
          if (dl) {
            const kids = parent.children.filter((c) => c.id !== primary);
            const targetIdx = dl.idx;
            setTimeout(() => { useStore.getState().reparent(primary, parent.id, targetIdx); useStore.getState().commit(); }, 0);
          } else setTimeout(() => useStore.getState().commit(), 0);
          return null;
        });
      } else useStore.getState().commit();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // ---------- marquee ----------
  const startMarquee = (e) => {
    const s = stageRect();
    const x0 = e.clientX - s.left, y0 = e.clientY - s.top;
    const base = e.shiftKey ? useStore.getState().selection : [];
    const move = (ev) => {
      const x1 = ev.clientX - s.left, y1 = ev.clientY - s.top;
      const m = { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) };
      setMarquee(m);
      if (m.w < 3 && m.h < 3) return;
      const pg = useStore.getState().page();
      const hit = pg.nodes.filter((n) => n.visible && !n.locked).filter((n) => {
        const r = rectOf(n.id);
        return r && r.x < m.x + m.w && r.x + r.w > m.x && r.y < m.y + m.h && r.y + r.h > m.y;
      }).map((n) => n.id);
      set({ selection: [...new Set([...base, ...hit])] });
    };
    const up = () => { setMarquee(null); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // ---------- draw tools ----------
  const startDraw = (e) => {
    const p0 = toPage(e.clientX, e.clientY);
    const t = tool;
    const move = (ev) => {
      const p1 = toPage(ev.clientX, ev.clientY);
      let w = Math.abs(p1.x - p0.x), h = Math.abs(p1.y - p0.y);
      if (ev.shiftKey) { w = h = Math.max(w, h); }
      setDraw({ x: Math.min(p0.x, p1.x), y: Math.min(p0.y, p1.y), w, h });
    };
    const up = (ev) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      const p1 = toPage(ev.clientX, ev.clientY);
      let w = Math.round(Math.abs(p1.x - p0.x)), h = Math.round(Math.abs(p1.y - p0.y));
      if (ev.shiftKey) w = h = Math.max(w, h);
      const x = Math.round(Math.min(p0.x, p1.x)), y = Math.round(Math.min(p0.y, p1.y));
      setDraw(null);
      const small = w < 4 && h < 4;
      const th = useStore.getState().project.theme.tokens;
      let n;
      if (t === 'text') n = createNode('text', { x, y, text: 'Type something', color: th.text, fs: 24, sizeW: small ? 'hug' : 'fixed', w: small ? 200 : w });
      else if (t === 'ellipse') n = createNode('frame', { name: 'Ellipse', x, y, w: small ? 120 : w, h: small ? 120 : h, radius: 9999, fill: { type: 'solid', color: th.accent } });
      else if (t === 'rect') n = createNode('frame', { name: 'Rectangle', x, y, w: small ? 160 : w, h: small ? 100 : h, fill: { type: 'solid', color: th.surface2 } });
      else if (t === 'image') n = createNode('image', { x, y, w: small ? 320 : w, h: small ? 220 : h, src: `https://picsum.photos/seed/${Math.random().toString(36).slice(2, 6)}/800/600` });
      else if (t === 'three') n = createNode('three', { x, y, w: small ? 300 : w, h: small ? 300 : h, color: th.accent, color2: th.accent2 });
      else n = createNode('frame', { name: 'Frame', x, y, w: small ? 320 : w, h: small ? 200 : h, fill: { type: 'solid', color: th.surface }, radius: 12 });
      useStore.getState().insert(n, { keepIds: true, at: { x, y }, parentId: null });
      set({ tool: 'select', editingId: t === 'text' ? n.id : null });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // ---------- resize & rotate ----------
  const startResize = (e, dir) => {
    e.stopPropagation();
    e.preventDefault();
    const st = useStore.getState();
    const pg = st.page();
    const n = findNode(pg.nodes, st.selection[0]);
    if (!n || n.locked) return;
    const parent = findParent(pg.nodes, n.id);
    const flow = parent && parent.layout.mode !== 'none';
    const r0 = rectOf(n.id);
    const z = st.zoom;
    const s0 = { x: n.x, y: n.y, w: n.sizeW === 'fixed' ? n.w : r0.w / z, h: n.sizeH === 'fixed' ? n.h : r0.h / z };
    const ratio = s0.w / (s0.h || 1);
    const sx = e.clientX, sy = e.clientY;
    st.begin();
    const move = rafThrottle((ev) => {
      const dx = (ev.clientX - sx) / z, dy = (ev.clientY - sy) / z;
      let { x, y, w, h } = s0;
      if (dir.includes('e')) w = s0.w + dx;
      if (dir.includes('s')) h = s0.h + dy;
      if (dir.includes('w')) { w = s0.w - dx; x = s0.x + dx; }
      if (dir.includes('n')) { h = s0.h - dy; y = s0.y + dy; }
      if (ev.shiftKey || n.lockRatio) {
        if (dir.length === 2 || dir === 'e' || dir === 'w') { const nh = w / ratio; if (dir.includes('n')) y = s0.y + (s0.h - nh); h = nh; } else { const nw = h * ratio; if (dir.includes('w')) x = s0.x + (s0.w - nw); w = nw; }
      }
      if (ev.altKey) { // resize from centre
        if (dir.includes('e') || dir.includes('w')) x = s0.x - (w - s0.w) / 2;
        if (dir.includes('n') || dir.includes('s')) y = s0.y - (h - s0.h) / 2;
      }
      w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
      useStore.getState().update(n.id, (d) => {
        if (dir.includes('e') || dir.includes('w')) { d.w = w; d.sizeW = 'fixed'; if (!flow) d.x = Math.round(x); }
        if (dir.includes('n') || dir.includes('s')) { d.h = h; d.sizeH = 'fixed'; if (!flow) d.y = Math.round(y); }
        if ((ev.shiftKey || n.lockRatio)) { d.w = w; d.h = h; d.sizeW = 'fixed'; d.sizeH = 'fixed'; if (!flow) { d.x = Math.round(x); d.y = Math.round(y); } }
      }, false);
    });
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); move.flush(); useStore.getState().commit(); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const startRotate = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const st = useStore.getState();
    const id = st.selection[0];
    const r = rectOf(id);
    const s = stageRect();
    const cx = s.left + r.x + r.w / 2, cy = s.top + r.y + r.h / 2;
    const n = findNode(st.page().nodes, id);
    const a0 = Math.atan2(e.clientY - cy, e.clientX - cx);
    const r0 = n.rotation || 0;
    st.begin();
    const move = rafThrottle((ev) => {
      let a = r0 + ((Math.atan2(ev.clientY - cy, ev.clientX - cx) - a0) * 180) / Math.PI;
      if (ev.shiftKey) a = Math.round(a / 15) * 15;
      a = Math.round(((a % 360) + 540) % 360 - 180);
      useStore.getState().update(id, { rotation: a }, false);
    });
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); move.flush(); useStore.getState().commit(); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // ---------- double click ----------
  const onDoubleClick = (e) => {
    const target = e.target.closest('[data-nid]');
    if (!target) return;
    const st = useStore.getState();
    const chain = chainFor(target);
    const cur = st.selection[0];
    const n = findNode(st.page().nodes, cur);
    if (n && n.type === 'text') return set({ editingId: n.id });
    const i = chain.indexOf(cur);
    if (i >= 0 && i < chain.length - 1) {
      const next = chain[i + 1];
      const nn = findNode(st.page().nodes, next);
      set({ selection: [next], editingId: nn?.type === 'text' && i + 1 === chain.length - 1 ? null : null });
    } else if (n && n.type === 'image') set({ modal: 'image' });
    else if (n && n.type === 'code') set({ rightTab: 'design' });
  };

  const onMove = (e) => {
    if (explode || e.buttons) return; // no hover work while dragging
    const target = e.target.closest?.('[data-nid]');
    const next = target ? pick(chainFor(target), e.ctrlKey || e.metaKey) : null;
    if (next !== hoverRef.current) { hoverRef.current = next; remeasure.current(1); }
  };

  const onContext = (e) => {
    e.preventDefault();
    const target = e.target.closest('[data-nid]');
    if (target) {
      const id = pick(chainFor(target), e.ctrlKey);
      if (id && !useStore.getState().selection.includes(id)) set({ selection: [id] });
    }
    setMenu({ x: e.clientX, y: e.clientY });
  };

  // ---------- drop from library / files ----------
  const onDrop = async (e) => {
    e.preventDefault();
    const p = toPage(e.clientX, e.clientY);
    const lib = e.dataTransfer.getData('forge/lib');
    const comp = e.dataTransfer.getData('forge/comp');
    const icon = e.dataTransfer.getData('forge/icon');
    const st = useStore.getState();
    const t = st.project.theme.tokens;
    if (lib) {
      const item = LIBRARY.find((x) => x.id === lib);
      if (item) { const made = item.make(t); const arr = Array.isArray(made) ? made : [made]; st.insert(arr, { at: { x: p.x - (arr[0].w || 100) / 2, y: p.y - 20 }, parentId: null }); }
    } else if (comp) {
      const c = st.project.components.find((x) => x.id === comp);
      if (c) st.insert(c.node, { at: { x: p.x - c.node.w / 2, y: p.y - 20 }, parentId: null });
    } else if (icon) {
      st.insert(createNode('icon', { icon, name: icon, w: 32, h: 32, color: t.text }), { at: { x: p.x - 16, y: p.y - 16 }, parentId: null });
    } else if (e.dataTransfer.files?.length) {
      for (const f of e.dataTransfer.files) {
        if (!/^image|^video/.test(f.type)) continue;
        const src = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f); });
        if (f.type.startsWith('video')) st.insert(createNode('video', { src, name: f.name }), { at: p, parentId: null });
        else {
          const dim = await new Promise((res) => { const im = new Image(); im.onload = () => res([im.width, im.height]); im.onerror = () => res([400, 300]); im.src = src; });
          const k = Math.min(1, 600 / dim[0]);
          st.insert(createNode('image', { src, name: f.name, w: Math.round(dim[0] * k), h: Math.round(dim[1] * k), radius: 0 }), { at: p, parentId: null });
        }
      }
    }
  };

  const onTextCommit = useCallback((id, text) => {
    useStore.getState().update(id, { text });
    useStore.setState({ editingId: null });
  }, []);

  const single = ov.sel.length === 1 ? ov.sel[0] : null;
  const selNode = single ? findNode(page.nodes, single.id) : null;
  const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  const cursor = spaceDown || tool === 'hand' ? 'grab' : explode ? 'move' : tool !== 'select' ? 'crosshair' : 'default';

  return (
    <section
      className="stage"
      ref={stageRef}
      onPointerDown={onPointerDown}
      onPointerMove={onMove}
      onPointerLeave={() => { if (hoverRef.current) { hoverRef.current = null; remeasure.current(1); } }}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContext}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      style={{ cursor, '--accent': theme.accent }}
    >
      <div className="world" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
        <div className="page-label" style={{ fontSize: 12 / zoom, top: -22 / zoom }}>
          {page.name} <span>{page.w} × {page.h}</span>
        </div>
        <div className="explode-wrap" style={explode ? { transform: `rotateX(${ea.x}deg) rotateZ(${ea.z}deg)`, transformStyle: 'preserve-3d' } : undefined}>
          <div
            ref={pageRef}
            className={`page ${explode ? 'exploded' : ''}`}
            style={{ width: page.w, height: page.h, background: fillCSS(page.fill) || '#0b0b12', transformStyle: explode ? 'preserve-3d' : undefined, overflow: explode ? 'visible' : 'hidden' }}
          >
            {page.nodes.map((n) => (
              <NodeView key={n.id} n={n} parent={null} mode="edit" editingId={editingId} onTextCommit={onTextCommit} playKey={playKey} explode={explode} />
            ))}
            {grid && <div className="grid-ov" style={{ backgroundSize: `${page.gridSize || 8}px ${page.gridSize || 8}px` }} />}
          </div>
        </div>
        {draw && <div className="draw-box" style={{ left: draw.x, top: draw.y, width: draw.w, height: draw.h, borderWidth: 1.5 / zoom }} />}
      </div>

      {/* overlay in screen space */}
      <div className="overlay">
        {ov.hover && <div className="hov" style={{ left: ov.hover.x, top: ov.hover.y, width: ov.hover.w, height: ov.hover.h }} />}
        {ov.sel.map((r) => <div key={r.id} className="selbox" style={{ left: r.x, top: r.y, width: r.w, height: r.h }} />)}
        {ov.sel.length > 1 && (() => {
          const x = Math.min(...ov.sel.map((r) => r.x)), y = Math.min(...ov.sel.map((r) => r.y));
          const w = Math.max(...ov.sel.map((r) => r.x + r.w)) - x, h = Math.max(...ov.sel.map((r) => r.y + r.h)) - y;
          return <div className="selbox multi" style={{ left: x, top: y, width: w, height: h }} />;
        })()}
        {single && selNode && !editingId && !selNode.locked && (
          <div className="handles" style={{ left: single.x, top: single.y, width: single.w, height: single.h }}>
            {handles.map((h) => <div key={h} className={`hd hd-${h}`} onPointerDown={(e) => startResize(e, h)} />)}
            <div className="rot" onPointerDown={startRotate} title="Rotate (Shift = 15°)"><Icon n="RotateCw" s={10} /></div>
            <div className="size-tag">{Math.round(single.w / zoom)} × {Math.round(single.h / zoom)}</div>
            <div className="name-tag">{selNode.name}</div>
          </div>
        )}
        {guides.map((g, i) => (g.type === 'v'
          ? <div key={i} className="guide v" style={{ left: g.x }} />
          : <div key={i} className="guide h" style={{ top: g.y }} />))}
        {dropLine && <div className="dropline" style={{ left: dropLine.x, top: dropLine.y, width: dropLine.w, height: dropLine.h }} />}
        {marquee && <div className="marquee" style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h }} />}
      </div>

      <CanvasToolbar />
      {explode && <div className="explode-hint"><Icon n="Rotate3d" s={14} /> 3D layer view — drag to orbit · press <kbd>3</kbd> to exit</div>}
      {menu && <Menu x={menu.x} y={menu.y} items={contextItems()} onClose={() => setMenu(null)} />}
    </section>
  );
}

function CanvasToolbar() {
  const tool = useStore((s) => s.tool);
  const zoom = useStore((s) => s.zoom);
  const explode = useStore((s) => s.explode);
  const grid = useStore((s) => s.grid);
  const snap = useStore((s) => s.snap);
  const set = useStore((s) => s.set);
  const tools = [
    ['select', 'MousePointer2', 'Select and move things (V)'], ['hand', 'Hand', 'Move the view (H) or drag empty space'], ['frame', 'Frame', 'Draw a box / container (F)'], ['rect', 'Square', 'Draw a rectangle (R)'],
    ['ellipse', 'Circle', 'Draw a circle (O)'], ['text', 'Type', 'Add text (T)'], ['image', 'Image', 'Add a picture (I)'], ['three', 'Box', 'Add a 3D object (D)'],
  ];
  return (
    <div className="ctool" onPointerDown={(e) => e.stopPropagation()}>
      {tools.map(([k, ic, t]) => <IconBtn key={k} icon={ic} title={t} active={tool === k} onClick={() => set({ tool: k })} />)}
      <div className="vsep" />
      <IconBtn icon="Grid3x3" title="Show grid lines" active={grid} onClick={() => set({ grid: !grid })} />
      <IconBtn icon="Magnet" title="Snap to other items (pink guide lines)" active={snap} onClick={() => set({ snap: !snap })} />
      <IconBtn icon="Rotate3d" title="See the page in 3D layers (3)" active={explode} onClick={() => set({ explode: !explode, selection: [] })} />
      <IconBtn icon="Play" title="Play animations again" onClick={() => set((s) => ({ playKey: s.playKey + 1 }))} />
      <div className="vsep" />
      <IconBtn icon="Minus" title="Zoom out" onClick={() => useStore.getState().zoomTo(Math.max(0.03, zoom / 1.25))} />
      <button type="button" className="zoomval" onClick={() => useStore.getState().fitView()} title="Fit page to screen (Shift+1)">{Math.round(zoom * 100)}%</button>
      <IconBtn icon="Plus" title="Zoom in" onClick={() => useStore.getState().zoomTo(Math.min(8, zoom * 1.25))} />
    </div>
  );
}
