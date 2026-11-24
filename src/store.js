import { create } from 'zustand';
import { produce } from 'immer';
import {
  uid, createNode, cloneTree, draftFind, draftSiblings, draftParent, findNode, findParent, removeNodes, bbox,
} from './lib/nodes.js';
import { THEMES } from './lib/constants.js';
import { demoProject } from './lib/demo.js';
import { defaultPublish } from './lib/publishDefaults.js';
import { idbGet, idbSet, requestPersistence } from './lib/db.js';
export { defaultPublish };

const KEY = 'forge-pro-project-v2';
const LIB_KEY = 'forge-pro-library-v2';


function loadLibrary() {
  try { return JSON.parse(localStorage.getItem(LIB_KEY)) || null; } catch { return null; }
}

function freshProject() {
  return demoProject();
}

function loadProject() {
  try {
    const p = JSON.parse(localStorage.getItem(KEY));
    if (p && p.pages && p.pages.length) return { ...p, publish: { ...defaultPublish(), ...(p.publish || {}) } };
  } catch { /* ignore */ }
  return freshProject();
}

const initialProject = loadProject();
const lib = loadLibrary();
if (lib) { initialProject.components = lib.components; initialProject.categories = lib.categories; }

export const useStore = create((set, get) => ({
  project: initialProject,
  pageId: initialProject.pages[0].id,
  selection: [],
  hoverId: null,
  editingId: null,
  zoom: 0.5,
  pan: { x: 0, y: 0 },
  tool: 'select',
  leftTab: 'library',
  rightTab: 'design',
  explode: false,
  explodeAngle: { x: 55, z: -35 },
  preview: false,
  modal: null, // 'code' | 'publish' | 'palette' | 'component' | 'shortcuts' | 'json'
  grid: false,
  snap: true,
  clipboard: null,
  past: [],
  future: [],
  _tx: null,
  toasts: [],
  playKey: 0,
  viewCenter: () => ({ x: 200, y: 200 }),

  // ------------- generic -------------
  set: (patch) => set(typeof patch === 'function' ? patch(get()) : patch),
  toast: (msg, kind = 'ok') => {
    const id = uid();
    set((s) => ({ toasts: [...s.toasts, { id, msg, kind }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 2600);
  },
  page: () => get().project.pages.find((p) => p.id === get().pageId) || get().project.pages[0],
  selectedNodes: () => {
    const pg = get().page();
    return get().selection.map((id) => findNode(pg.nodes, id)).filter(Boolean);
  },

  // mutate project. record=false while dragging; call commit() at the end.
  mutate: (fn, record = true) => {
    const prev = get().project;
    const next = produce(prev, fn);
    if (next === prev) return;
    if (record && !get()._tx) set((s) => ({ project: next, past: [...s.past.slice(-120), prev], future: [] }));
    else set({ project: next });
  },
  begin: () => { if (!get()._tx) set({ _tx: get().project }); },
  commit: () => {
    const snap = get()._tx;
    if (!snap) return;
    if (snap !== get().project) set((s) => ({ past: [...s.past.slice(-120), snap], future: [], _tx: null }));
    else set({ _tx: null });
  },
  undo: () => {
    const { past, project, future } = get();
    if (!past.length) return;
    const prev = past[past.length - 1];
    set({ project: prev, past: past.slice(0, -1), future: [project, ...future], selection: [] });
    get().ensurePage();
    if (prev.components !== project.components || prev.categories !== project.categories) get().saveLibrary();
  },
  redo: () => {
    const { past, project, future } = get();
    if (!future.length) return;
    set({ project: future[0], past: [...past, project], future: future.slice(1), selection: [] });
    get().ensurePage();
    if (future[0].components !== project.components || future[0].categories !== project.categories) get().saveLibrary();
  },
  ensurePage: () => {
    const { project, pageId } = get();
    if (!project.pages.find((p) => p.id === pageId)) set({ pageId: project.pages[0].id });
  },

  // ------------- pages -------------
  addPage: (page) => {
    const cur = get().page();
    const p = page || { id: uid(), name: `Page ${get().project.pages.length + 1}`, w: cur.w, h: cur.h, device: cur.device, fill: { ...cur.fill }, nodes: [] };
    if (!p.id) p.id = uid();
    get().mutate((d) => { d.pages.push(p); });
    set({ pageId: p.id, selection: [] });
    return p.id;
  },
  duplicatePage: (id) => {
    const src = get().project.pages.find((p) => p.id === id);
    const p = { ...JSON.parse(JSON.stringify(src)), id: uid(), name: src.name + ' copy' };
    p.nodes = p.nodes.map(cloneTree);
    get().mutate((d) => { d.pages.splice(d.pages.findIndex((x) => x.id === id) + 1, 0, p); });
    set({ pageId: p.id, selection: [] });
  },
  removePage: (id) => {
    if (get().project.pages.length < 2) return get().toast('A project needs at least one page', 'warn');
    get().mutate((d) => { d.pages = d.pages.filter((p) => p.id !== id); });
    get().ensurePage();
    set({ selection: [] });
  },
  updatePage: (patch) => {
    const id = get().pageId;
    get().mutate((d) => { const p = d.pages.find((x) => x.id === id); Object.assign(p, typeof patch === 'function' ? patch(p) : patch); });
  },
  movePage: (id, dir) => get().mutate((d) => {
    const i = d.pages.findIndex((p) => p.id === id);
    const j = i + dir;
    if (j < 0 || j >= d.pages.length) return;
    [d.pages[i], d.pages[j]] = [d.pages[j], d.pages[i]];
  }),
  setPage: (id) => set({ pageId: id, selection: [], editingId: null }),

  // ------------- nodes -------------
  withPage: (fn, record = true) => {
    const id = get().pageId;
    get().mutate((d) => { const p = d.pages.find((x) => x.id === id); fn(p, d); }, record);
  },

  insert: (nodeOrNodes, opts = {}) => {
    const list = (Array.isArray(nodeOrNodes) ? nodeOrNodes : [nodeOrNodes]).map((n) => (opts.keepIds ? n : cloneTree(n)));
    const pg = get().page();
    let parentId = opts.parentId ?? null;
    // drop into selected frame if it's a container with auto layout
    if (opts.parentId === undefined && get().selection.length === 1) {
      const sel = findNode(pg.nodes, get().selection[0]);
      if (sel && sel.children && sel.layout.mode !== 'none' && !opts.top) parentId = sel.id;
    }
    if (!parentId && !opts.at) {
      const c = get().viewCenter();
      const b = bbox(list);
      const dx = Math.round(Math.max(0, Math.min(pg.w - b.w, c.x - b.w / 2)) - b.x);
      const dy = Math.round(Math.max(0, c.y - b.h / 2) - b.y);
      list.forEach((n) => { n.x += dx; n.y += dy; });
    }
    if (opts.at) list.forEach((n, i) => { n.x = Math.round(opts.at.x + i * 16); n.y = Math.round(opts.at.y + i * 16); });
    get().withPage((p) => {
      const target = parentId ? draftFind(p.nodes, parentId)?.children : p.nodes;
      (target || p.nodes).push(...list);
    });
    set({ selection: list.map((n) => n.id), editingId: null });
    return list;
  },

  update: (ids, patch, record = true) => {
    const arr = Array.isArray(ids) ? ids : [ids];
    get().withPage((p) => {
      for (const id of arr) {
        const n = draftFind(p.nodes, id);
        if (!n) continue;
        if (typeof patch === 'function') patch(n);
        else Object.assign(n, patch);
      }
    }, record);
  },
  updateSel: (patch, record = true) => get().update(get().selection, patch, record),

  remove: (ids = get().selection) => {
    if (!ids.length) return;
    get().withPage((p) => { p.nodes = removeNodes(p.nodes, ids); });
    set({ selection: [], editingId: null });
  },

  duplicate: () => {
    const pg = get().page();
    const ids = get().selection;
    if (!ids.length) return;
    const newIds = [];
    get().withPage((p) => {
      for (const id of ids) {
        const sib = draftSiblings(p.nodes, id);
        const i = sib.findIndex((n) => n.id === id);
        const copy = cloneTree(JSON.parse(JSON.stringify(findNode(pg.nodes, id))));
        const parent = findParent(pg.nodes, id);
        if (!parent || parent.layout.mode === 'none') { copy.x += 20; copy.y += 20; }
        sib.splice(i + 1, 0, copy);
        newIds.push(copy.id);
      }
    });
    set({ selection: newIds });
  },

  copy: () => {
    const nodes = get().selectedNodes();
    if (!nodes.length) return;
    const data = JSON.parse(JSON.stringify(nodes));
    set({ clipboard: data });
    try { navigator.clipboard?.writeText(JSON.stringify({ forge: 2, nodes: data })); } catch { /* ignore */ }
    get().toast(`Copied ${nodes.length} layer${nodes.length > 1 ? 's' : ''}`);
  },
  cut: () => { get().copy(); get().remove(); },
  paste: () => {
    const c = get().clipboard;
    if (!c) return;
    const nodes = c.map((n) => ({ ...JSON.parse(JSON.stringify(n)), x: n.x + 24, y: n.y + 24 }));
    get().insert(nodes, { at: { x: nodes[0].x, y: nodes[0].y }, top: true });
    set({ clipboard: nodes });
  },

  group: () => {
    const pg = get().page();
    const ids = get().selection;
    if (ids.length < 1) return;
    const parent = findParent(pg.nodes, ids[0]);
    const nodes = ids.map((id) => findNode(pg.nodes, id)).filter((n) => findParent(pg.nodes, n.id) === parent);
    const b = bbox(nodes);
    const g = createNode('frame', { name: 'Group', x: b.x, y: b.y, w: b.w, h: b.h, fill: { type: 'none' } }, []);
    g.children = nodes.map((n) => ({ ...JSON.parse(JSON.stringify(n)), x: n.x - b.x, y: n.y - b.y }));
    get().withPage((p) => {
      const sib = parent ? draftFind(p.nodes, parent.id).children : p.nodes;
      const firstIdx = Math.min(...nodes.map((n) => sib.findIndex((x) => x.id === n.id)));
      const keep = sib.filter((x) => !ids.includes(x.id));
      keep.splice(Math.min(firstIdx, keep.length), 0, g);
      if (parent) draftFind(p.nodes, parent.id).children = keep; else p.nodes = keep;
    });
    set({ selection: [g.id] });
  },
  ungroup: () => {
    const pg = get().page();
    const ids = get().selection;
    const out = [];
    get().withPage((p) => {
      for (const id of ids) {
        const n = draftFind(p.nodes, id);
        if (!n || !n.children) continue;
        const sib = draftSiblings(p.nodes, id);
        const i = sib.findIndex((x) => x.id === id);
        const orig = findNode(pg.nodes, id);
        const auto = orig.layout.mode !== 'none';
        // when the frame used auto layout, read real child positions from the DOM
        const kids = orig.children.map((c) => {
          let x = c.x, y = c.y;
          if (auto) {
            const el = document.querySelector(`[data-nid="${c.id}"]`);
            const pel = document.querySelector(`[data-nid="${id}"]`);
            if (el && pel) {
              const z = get().zoom;
              const r = el.getBoundingClientRect(); const pr = pel.getBoundingClientRect();
              x = Math.round((r.left - pr.left) / z); y = Math.round((r.top - pr.top) / z);
            }
          }
          return { ...JSON.parse(JSON.stringify(c)), x: x + orig.x, y: y + orig.y, sizeW: c.sizeW === 'fill' ? 'fixed' : c.sizeW, sizeH: c.sizeH === 'fill' ? 'fixed' : c.sizeH };
        });
        sib.splice(i, 1, ...kids);
        out.push(...kids.map((k) => k.id));
      }
    });
    set({ selection: out });
  },

  arrange: (kind) => {
    const ids = get().selection;
    get().withPage((p) => {
      for (const id of ids) {
        const sib = draftSiblings(p.nodes, id);
        const i = sib.findIndex((n) => n.id === id);
        const [n] = sib.splice(i, 1);
        let j = i;
        if (kind === 'front') j = sib.length;
        else if (kind === 'back') j = 0;
        else if (kind === 'forward') j = Math.min(sib.length, i + 1);
        else if (kind === 'backward') j = Math.max(0, i - 1);
        sib.splice(j, 0, n);
      }
    });
  },

  // move a node into another container (or top level) at index
  reparent: (id, newParentId, index) => {
    const pg = get().page();
    if (id === newParentId) return;
    const node = findNode(pg.nodes, id);
    if (!node) return;
    if (newParentId && findNode([node], newParentId)) return; // can't drop into own child
    get().withPage((p) => {
      const sib = draftSiblings(p.nodes, id);
      const i = sib.findIndex((n) => n.id === id);
      const [n] = sib.splice(i, 1);
      const target = newParentId ? draftFind(p.nodes, newParentId).children : p.nodes;
      target.splice(Math.max(0, Math.min(index ?? target.length, target.length)), 0, n);
    });
  },

  align: (kind) => {
    const pg = get().page();
    const nodes = get().selectedNodes();
    if (!nodes.length) return;
    const parent = findParent(pg.nodes, nodes[0].id);
    const box = nodes.length === 1 ? (parent ? { x: 0, y: 0, w: parent.w, h: parent.h } : { x: 0, y: 0, w: pg.w, h: pg.h }) : bbox(nodes);
    get().update(nodes.map((n) => n.id), (n) => {
      if (kind === 'left') n.x = box.x;
      if (kind === 'hcenter') n.x = Math.round(box.x + (box.w - n.w) / 2);
      if (kind === 'right') n.x = box.x + box.w - n.w;
      if (kind === 'top') n.y = box.y;
      if (kind === 'vcenter') n.y = Math.round(box.y + (box.h - n.h) / 2);
      if (kind === 'bottom') n.y = box.y + box.h - n.h;
    });
  },
  distribute: (axis) => {
    const nodes = [...get().selectedNodes()];
    if (nodes.length < 3) return get().toast('Select 3+ layers to distribute', 'warn');
    const k = axis === 'h' ? 'x' : 'y', s = axis === 'h' ? 'w' : 'h';
    nodes.sort((a, b) => a[k] - b[k]);
    const total = nodes.reduce((a, n) => a + n[s], 0);
    const span = nodes[nodes.length - 1][k] + nodes[nodes.length - 1][s] - nodes[0][k];
    const gap = (span - total) / (nodes.length - 1);
    let cur = nodes[0][k];
    const pos = {};
    nodes.forEach((n) => { pos[n.id] = Math.round(cur); cur += n[s] + gap; });
    get().update(nodes.map((n) => n.id), (n) => { n[k] = pos[n.id]; });
  },

  selectAll: () => set({ selection: get().page().nodes.filter((n) => !n.locked && n.visible).map((n) => n.id) }),

  // ------------- components & categories -------------
  saveLibrary: () => {
    const { components, categories } = get().project;
    idbSet(LIB_KEY, { components, categories }).catch(() => get().toast('Could not save library to device storage', 'warn'));
  },
  createComponent: (name, category, nodes) => {
    const list = nodes || get().selectedNodes();
    if (!list.length) return;
    let node;
    if (list.length === 1) node = JSON.parse(JSON.stringify(list[0]));
    else {
      const b = bbox(list);
      node = createNode('frame', { name, x: 0, y: 0, w: b.w, h: b.h, fill: { type: 'none' } });
      node.children = list.map((n) => ({ ...JSON.parse(JSON.stringify(n)), x: n.x - b.x, y: n.y - b.y }));
    }
    node.x = 0; node.y = 0; node.name = name;
    const comp = { id: uid(), name, category, node, createdAt: Date.now(), fav: false };
    get().mutate((d) => {
      d.components.unshift(comp);
      if (!d.categories.includes(category)) d.categories.push(category);
    });
    get().saveLibrary();
    get().toast(`Component "${name}" saved to ${category}`);
  },
  updateComponent: (id, patch) => { get().mutate((d) => { Object.assign(d.components.find((c) => c.id === id), patch); }); get().saveLibrary(); },
  deleteComponent: (id) => { get().mutate((d) => { d.components = d.components.filter((c) => c.id !== id); }); get().saveLibrary(); },
  addCategory: (name) => {
    if (!name || get().project.categories.includes(name)) return;
    get().mutate((d) => { d.categories.push(name); }); get().saveLibrary();
  },
  renameCategory: (from, to) => {
    if (!to || from === to) return;
    get().mutate((d) => {
      d.categories = d.categories.map((c) => (c === from ? to : c));
      d.components.forEach((c) => { if (c.category === from) c.category = to; });
    });
    get().saveLibrary();
  },
  deleteCategory: (name) => {
    get().mutate((d) => {
      d.categories = d.categories.filter((c) => c !== name);
      d.components.forEach((c) => { if (c.category === name) c.category = d.categories[0] || 'General'; });
      if (!d.categories.length) d.categories.push('General');
    });
    get().saveLibrary();
  },

  // ------------- theme -------------
  setTheme: (name) => {
    const t = THEMES[name];
    if (!t) return;
    const old = get().project.theme.tokens;
    const map = {};
    for (const k of Object.keys(old)) map[old[k].toLowerCase()] = t[k];
    const recolor = (v) => (typeof v === 'string' && map[v.toLowerCase()]) || v;
    const fixNode = (n) => {
      if (n.fill) { n.fill.color = recolor(n.fill.color); (n.fill.stops || []).forEach((s) => { s.c = recolor(s.c); }); }
      if (n.color) n.color = recolor(n.color);
      if (n.border) n.border.color = recolor(n.border.color);
      if (n.color2) n.color2 = recolor(n.color2);
      if (n.track) n.track = recolor(n.track);
      (n.children || []).forEach(fixNode);
    };
    get().mutate((d) => {
      d.theme = { name, tokens: { ...t } };
      d.pages.forEach((p) => { if (p.fill) p.fill.color = recolor(p.fill.color); p.nodes.forEach(fixNode); });
    });
    get().toast(`Theme: ${name}`);
  },

  // ------------- project io -------------
  newProject: () => {
    const p = { ...freshProject(), pages: [{ id: uid(), name: 'Home', w: 1440, h: 1024, device: 'desktop', fill: { type: 'solid', color: THEMES.Midnight.bg }, nodes: [] }] };
    p.components = get().project.components; p.categories = get().project.categories;
    set({ project: p, pageId: p.pages[0].id, selection: [], past: [...get().past, get().project], future: [] });
  },
  loadProject: (p) => {
    const merged = { ...freshProject(), ...p, publish: { ...defaultPublish(), ...(p.publish || {}) } };
    if (!merged.components) merged.components = [];
    if (!merged.categories) merged.categories = ['General'];
    set({ project: merged, pageId: merged.pages[0].id, selection: [], past: [...get().past, get().project], future: [] });
  },
  updatePublish: (patch) => get().mutate((d) => { Object.assign(d.publish, patch); }, false),
}));

// autosave
let t;
useStore.subscribe((s, prev) => {
  if (s.project === prev.project) return;
  clearTimeout(t);
  t = setTimeout(() => {
    const save = () => idbSet(KEY, { ...s.project, publish: { ...s.project.publish, htmlFiles: null } })
      .then(() => useStore.setState({ savedAt: Date.now() }))
      .catch(() => useStore.getState().toast('Could not save to device storage', 'warn'));
    // write when the browser is idle so typing/dragging never stutters
    if (window.requestIdleCallback) requestIdleCallback(save, { timeout: 1500 }); else save();
  }, 600);
});

// ---------- hydrate from device storage (IndexedDB), migrating old localStorage data once ----------
export const ready = (async () => {
  requestPersistence();
  try {
    let p = await idbGet(KEY);
    let l = await idbGet(LIB_KEY);
    if (!p && localStorage.getItem(KEY)) { p = loadProject(); await idbSet(KEY, p); }
    if (!l && localStorage.getItem(LIB_KEY)) { l = loadLibrary(); if (l) await idbSet(LIB_KEY, l); }
    try { localStorage.removeItem(KEY); localStorage.removeItem(LIB_KEY); } catch { /* ignore */ }
    if (p && p.pages?.length) {
      const merged = { ...p, publish: { ...defaultPublish(), ...(p.publish || {}) } };
      if (l) { merged.components = l.components; merged.categories = l.categories; }
      useStore.setState({ project: merged, pageId: merged.pages[0].id, selection: [], past: [], future: [] });
    } else if (l) {
      useStore.setState((st) => ({ project: { ...st.project, components: l.components, categories: l.categories } }));
    }
  } catch (e) { console.warn('Device storage unavailable, using memory only', e); }
  useStore.setState({ hydrated: true });
})();

if (import.meta.env.DEV && typeof window !== 'undefined') window.__forge = useStore;
