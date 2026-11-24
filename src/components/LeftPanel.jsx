import React, { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { icons } from 'lucide-react';
import { useStore } from '../store.js';
import { LIBRARY, CATEGORIES, TEMPLATES } from '../lib/library.js';
import { NodeView, LucideIcon } from './NodeView.jsx';
import { TYPES, countNodes, uid } from '../lib/nodes.js';
import { DEVICES } from '../lib/constants.js';
import { IconBtn, Icon, Menu, TextIn } from '../ui/controls.jsx';
import { fillCSS } from '../lib/style.js';

const TABS = [
  ['library', 'LayoutGrid', 'Library'],
  ['layers', 'Layers', 'Layers'],
  ['pages', 'Files', 'Pages'],
  ['icons', 'Smile', 'Icons'],
  ['mine', 'Component', 'My components'],
];

export default function LeftPanel() {
  const tab = useStore((s) => s.leftTab);
  const set = useStore((s) => s.set);
  return (
    <aside className="panel left">
      <div className="ltabs">
        {TABS.map(([k, ic, l]) => (
          <button type="button" key={k} className={tab === k ? 'on' : ''} onClick={() => set({ leftTab: k })} title={l}>
            <Icon n={ic} s={16} /><span>{l.split(' ')[0]}</span>
          </button>
        ))}
      </div>
      <div className="lbody">
        {tab === 'library' && <Library />}
        {tab === 'layers' && <Layers />}
        {tab === 'pages' && <Pages />}
        {tab === 'icons' && <Icons />}
        {tab === 'mine' && <Mine />}
      </div>
    </aside>
  );
}

// ---------- thumbnail ----------
export const Thumb = memo(function Thumb({ node, h = 84 }) {
  const box = useRef(null);
  const inner = useRef(null);
  const [vis, setVis] = useState(false);
  const [k, setK] = useState(null);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); io.disconnect(); } }, { rootMargin: '200px' });
    if (box.current) io.observe(box.current);
    return () => io.disconnect();
  }, []);
  useLayoutEffect(() => {
    if (!vis || !inner.current || !box.current) return;
    const el = inner.current.firstElementChild;
    if (!el) return;
    const measure = () => {
      const w = el.offsetWidth || node.w, hh = el.offsetHeight || node.h;
      const bw = box.current.clientWidth - 12, bh = box.current.clientHeight - 12;
      setK({ s: Math.min(bw / w, bh / hh, 1.5), w, h: hh });
    };
    measure();
    const t = setTimeout(measure, 300);
    return () => clearTimeout(t);
  }, [vis, node]);
  const n = useMemo(() => (node ? { ...node, x: 0, y: 0, anim: { ...node.anim, enter: 'none' } } : null), [node]);
  return (
    <div className="thumb" ref={box} style={{ height: h }}>
      {vis && n && (
        <div ref={inner} className="thumb-in" style={k ? { transform: `translate(-50%,-50%) scale(${k.s})`, width: k.w, height: k.h } : { opacity: 0 }}>
          <NodeView n={n} parent={null} mode="thumb" />
        </div>
      )}
    </div>
  );
});

function useThemeTokens() { return useStore((s) => s.project.theme.tokens); }

// ---------- Library ----------
function Library() {
  const t = useThemeTokens();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const insert = useStore((s) => s.insert);
  const addPage = useStore((s) => s.addPage);
  const items = useMemo(() => LIBRARY.map((it) => ({ ...it, node: (() => { const m = it.make(t); return Array.isArray(m) ? m[0] : m; })() })), [t]);
  const ql = q.trim().toLowerCase();
  const filtered = items.filter((it) => (cat === 'all' || it.cat === cat) && (!ql || it.name.toLowerCase().includes(ql) || it.cat.includes(ql)));
  const groups = cat === 'all' && !ql ? CATEGORIES.filter((c) => c.id !== 'templates') : null;

  const useItem = (it) => insert(it.make(t));

  return (
    <div className="lib">
      <div className="search">
        <Icon n="Search" s={14} />
        <input placeholder={`Search ${LIBRARY.length}+ components…`} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
        {q && <IconBtn icon="X" size={12} onClick={() => setQ('')} />}
      </div>
      <div className="chips">
        <button type="button" className={cat === 'all' ? 'on' : ''} onClick={() => setCat('all')}>All</button>
        {CATEGORIES.map((c) => (
          <button type="button" key={c.id} className={cat === c.id ? 'on' : ''} onClick={() => setCat(c.id)}><Icon n={c.icon} s={12} />{c.label}</button>
        ))}
      </div>
      {cat === 'templates' ? <TemplateList onUse={(tpl) => { addPage({ name: tpl.name, w: tpl.w, h: tpl.h, device: tpl.device, fill: { type: 'solid', color: t.bg }, nodes: tpl.make(t) }); useStore.getState().toast(`Added page “${tpl.name}”`); }} />
        : groups ? groups.map((g) => {
          const list = filtered.filter((x) => x.cat === g.id);
          return (
            <div key={g.id} className="lgroup">
              <div className="lgroup-h"><Icon n={g.icon} s={13} /> {g.label} <span>{list.length}</span><div className="grow" /><button type="button" className="link" onClick={() => setCat(g.id)}>See all</button></div>
              <div className="cards">{list.slice(0, 6).map((it) => <LibCard key={it.id} it={it} onUse={useItem} />)}</div>
            </div>
          );
        }) : (
          <div className="cards">{filtered.map((it) => <LibCard key={it.id} it={it} onUse={useItem} />)}{!filtered.length && <div className="empty">No components match “{q}”.</div>}</div>
        )}
    </div>
  );
}

function LibCard({ it, onUse }) {
  return (
    <button
      type="button"
      className="card"
      draggable
      onDragStart={(e) => { e.dataTransfer.setData('forge/lib', it.id); e.dataTransfer.effectAllowed = 'copy'; }}
      onClick={() => onUse(it)}
      title={`${it.name} — click or drag onto the canvas`}
    >
      {it.thumb3d ? <ThreeThumb p={it.thumb3d} /> : <Thumb node={it.node} />}
      <span className="card-n">{it.name}</span>
    </button>
  );
}

function ThreeThumb({ p }) {
  const t = useThemeTokens();
  const c = p.color || t.accent;
  const shapes = { torus: '50%', sphere: '50%', box: '18%', roundedBox: '28%', cubes: '20%', cone: '50% 50% 10% 10%' };
  return (
    <div className="thumb three-thumb">
      <div style={{ width: 52, height: 52, borderRadius: shapes[p.shape] || '42%', background: p.material === 'holo' ? 'conic-gradient(#f0f,#0ff,#ff0,#f0f)' : p.wireframe ? 'none' : `radial-gradient(circle at 30% 28%, #ffffffcc, ${c} 35%, ${t.accent2}88 95%)`, border: p.wireframe ? `2px solid ${c}` : 'none', boxShadow: p.material === 'neon' ? `0 0 20px ${c}` : `0 12px 24px -8px ${c}`, transform: 'rotate(-12deg)' }} />
      <span className="badge3d">3D</span>
    </div>
  );
}

function TemplateList({ onUse }) {
  const t = useThemeTokens();
  return (
    <div className="tpls">
      {TEMPLATES.map((tpl) => {
        const nodes = tpl.make(t);
        const frame = { id: 'tpl', type: 'frame', x: 0, y: 0, w: tpl.w, h: tpl.h, visible: true, fill: { type: 'solid', color: t.bg }, layout: { mode: 'none', pad: [0, 0, 0, 0] }, anim: {}, children: nodes, clip: true, opacity: 1, filters: {}, shadows: [], border: {} };
        return (
          <button type="button" key={tpl.name} className="tpl" onClick={() => onUse(tpl)}>
            <Thumb node={frame} h={tpl.device === 'iphone' ? 200 : 140} />
            <span className="card-n">{tpl.name}<small>{tpl.w}×{tpl.h}</small></span>
          </button>
        );
      })}
    </div>
  );
}

// ---------- Layers ----------
function Layers() {
  const page = useStore((s) => s.page());
  const [q, setQ] = useState('');
  return (
    <div className="layers">
      <div className="search">
        <Icon n="Search" s={14} />
        <input placeholder="Find layer…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
      </div>
      <div className="layers-meta">{page.name} · {countNodes(page.nodes)} layers</div>
      <div className="tree" onDragOver={(e) => e.preventDefault()} onDrop={(e) => {
        const id = e.dataTransfer.getData('forge/layer');
        if (id && e.target.classList.contains('tree')) useStore.getState().reparent(id, null, 0);
      }}>
        {[...page.nodes].reverse().map((n) => <LayerRow key={n.id} n={n} depth={0} parentId={null} q={q.toLowerCase()} />)}
        {!page.nodes.length && <div className="empty">Nothing here yet. Add something from the Library.</div>}
      </div>
    </div>
  );
}

function matches(n, q) {
  if (!q) return true;
  if (n.name.toLowerCase().includes(q)) return true;
  return (n.children || []).some((c) => matches(c, q));
}

const LayerRow = memo(function LayerRow({ n, depth, parentId, q }) {
  const selected = useStore((s) => s.selection.includes(n.id));
  const [open, setOpen] = useState(depth < 1 ? false : false);
  const [rename, setRename] = useState(false);
  const [drop, setDrop] = useState(null);
  const [menu, setMenu] = useState(null);
  if (!matches(n, q)) return null;
  const st = useStore.getState;
  const icon = n.children ? (n.layout?.mode === 'row' ? 'Columns3' : n.layout?.mode === 'column' ? 'Rows3' : 'Frame') : n.type === 'text' ? 'Type' : n.type === 'icon' ? n.icon : TYPES[n.type]?.icon || 'Square';
  const onSel = (e) => {
    const s = st();
    if (e.shiftKey) s.set({ selection: s.selection.includes(n.id) ? s.selection.filter((x) => x !== n.id) : [...s.selection, n.id] });
    else s.set({ selection: [n.id] });
  };
  const onDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    const id = e.dataTransfer.getData('forge/layer');
    setDrop(null);
    if (!id || id === n.id) return;
    const s = st();
    const pg = s.page();
    if (drop === 'in' && n.children) return s.reparent(id, n.id, n.children.length);
    // layers list is reversed (top = front). "above" in the list = after in array
    const sib = parentId ? (function f(list) { for (const x of list) { if (x.id === parentId) return x.children; if (x.children) { const r = f(x.children); if (r) return r; } } return null; })(pg.nodes) : pg.nodes;
    const others = sib.filter((x) => x.id !== id);
    const idx = others.findIndex((x) => x.id === n.id);
    s.reparent(id, parentId, drop === 'above' ? idx + 1 : idx);
  };
  return (
    <>
      <div
        className={`lrow ${selected ? 'sel' : ''} ${n.visible ? '' : 'hidden'} ${drop ? 'drop-' + drop : ''}`}
        style={{ paddingLeft: 6 + depth * 14 }}
        onClick={onSel}
        onDoubleClick={() => setRename(true)}
        onContextMenu={(e) => { e.preventDefault(); if (!selected) st().set({ selection: [n.id] }); setMenu({ x: e.clientX, y: e.clientY }); }}
        onPointerEnter={() => { /* hover handled by canvas */ }}
        draggable={!rename}
        onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.setData('forge/layer', n.id); }}
        onDragOver={(e) => {
          e.preventDefault(); e.stopPropagation();
          const r = e.currentTarget.getBoundingClientRect();
          const y = (e.clientY - r.top) / r.height;
          setDrop(n.children && y > 0.3 && y < 0.7 ? 'in' : y < 0.5 ? 'above' : 'below');
        }}
        onDragLeave={() => setDrop(null)}
        onDrop={onDrop}
      >
        <span className={`tw ${n.children?.length ? '' : 'none'} ${open ? 'open' : ''}`} onClick={(e) => { e.stopPropagation(); setOpen(!open); }}><Icon n="ChevronRight" s={11} /></span>
        <span className="lic"><LucideIcon name={icon} size={13} /></span>
        {rename ? (
          <input autoFocus className="lrename" defaultValue={n.name} onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setRename(false); }}
            onBlur={(e) => { st().update(n.id, { name: e.target.value || n.name }); setRename(false); }} onClick={(e) => e.stopPropagation()} />
        ) : <span className="lname">{n.name}</span>}
        <span className="lact">
          <button type="button" className={n.locked ? 'on' : ''} onClick={(e) => { e.stopPropagation(); st().update(n.id, { locked: !n.locked }); }} title="Lock"><Icon n={n.locked ? 'Lock' : 'LockOpen'} s={12} /></button>
          <button type="button" className={!n.visible ? 'on' : ''} onClick={(e) => { e.stopPropagation(); st().update(n.id, { visible: !n.visible }); }} title="Show / hide"><Icon n={n.visible ? 'Eye' : 'EyeOff'} s={12} /></button>
        </span>
      </div>
      {open && n.children && [...n.children].reverse().map((c) => <LayerRow key={c.id} n={c} depth={depth + 1} parentId={n.id} q={q} />)}
      {menu && <LayerMenu menu={menu} onClose={() => setMenu(null)} />}
    </>
  );
});

function LayerMenu({ menu, onClose }) {
  const items = require_ctx();
  return <Menu x={menu.x} y={menu.y} items={items} onClose={onClose} />;
}
import { contextItems as require_ctx } from './contextMenu.js';

// ---------- Pages ----------
function Pages() {
  const pages = useStore((s) => s.project.pages);
  const pageId = useStore((s) => s.pageId);
  const S = useStore.getState;
  const [ren, setRen] = useState(null);
  const t = useThemeTokens();
  return (
    <div className="pages">
      <div className="ph"><span>Pages</span><div className="grow" /><IconBtn icon="Plus" title="New blank page" onClick={() => S().addPage()} /></div>
      {pages.map((p, i) => (
        <div key={p.id} className={`prow ${p.id === pageId ? 'sel' : ''}`} onClick={() => S().setPage(p.id)} onDoubleClick={() => setRen(p.id)}>
          <div className="pthumb" style={{ background: fillCSS(p.fill) }}><span>{i + 1}</span></div>
          <div className="pinfo">
            {ren === p.id ? (
              <input autoFocus defaultValue={p.name} className="lrename" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') e.currentTarget.blur(); }}
                onBlur={(e) => { S().mutate((d) => { d.pages.find((x) => x.id === p.id).name = e.target.value || p.name; }); setRen(null); }} />
            ) : <b>{p.name}</b>}
            <small>{p.w}×{p.h} · {countNodes(p.nodes)} layers</small>
          </div>
          <div className="pact" onClick={(e) => e.stopPropagation()}>
            <IconBtn icon="ArrowUp" size={12} title="Move up" onClick={() => S().movePage(p.id, -1)} />
            <IconBtn icon="Copy" size={12} title="Duplicate" onClick={() => S().duplicatePage(p.id)} />
            <IconBtn icon="Trash2" size={12} title="Delete" onClick={() => { if (confirm(`Delete page “${p.name}”?`)) S().removePage(p.id); }} />
          </div>
        </div>
      ))}
      <div className="ph" style={{ marginTop: 16 }}><span>New page from size</span></div>
      <div className="devgrid">
        {DEVICES.map((d) => (
          <button type="button" key={d.key} className="dev" onClick={() => S().addPage({ id: uid(), name: d.label, w: d.w, h: d.h, device: d.key, fill: { type: 'solid', color: t.bg }, nodes: [] })}>
            <Icon n={d.icon} s={16} /><b>{d.label}</b><small>{d.w}×{d.h}</small>
          </button>
        ))}
      </div>
      <div className="ph" style={{ marginTop: 16 }}><span>Page templates</span></div>
      <TemplateList onUse={(tpl) => S().addPage({ name: tpl.name, w: tpl.w, h: tpl.h, device: tpl.device, fill: { type: 'solid', color: t.bg }, nodes: tpl.make(t) })} />
    </div>
  );
}

// ---------- Icons ----------
const ICON_NAMES = Object.keys(icons);
function Icons() {
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(240);
  const [stroke, setStroke] = useState(2);
  const t = useThemeTokens();
  const insert = useStore((s) => s.insert);
  const sel = useStore((s) => s.selectedNodes());
  const iconSel = sel.length === 1 && sel[0].type === 'icon' ? sel[0] : null;
  const ql = q.toLowerCase().replace(/\s+/g, '');
  const list = useMemo(() => ICON_NAMES.filter((n) => !ql || n.toLowerCase().includes(ql)), [ql]);
  useEffect(() => setLimit(240), [ql]);
  return (
    <div className="icons">
      <div className="search">
        <Icon n="Search" s={14} />
        <input placeholder={`Search ${ICON_NAMES.length} icons…`} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
      </div>
      <div className="icon-meta">
        {iconSel ? <span className="pill">Click to swap “{iconSel.icon}”</span> : <span>Click to insert · drag onto canvas</span>}
        <div className="grow" />
        <span>Stroke</span>
        <input type="range" min="0.5" max="3.5" step="0.25" value={stroke} onChange={(e) => setStroke(+e.target.value)} />
      </div>
      <div className="igrid">
        {list.slice(0, limit).map((name) => (
          <button type="button" key={name} title={name} draggable
            onDragStart={(e) => e.dataTransfer.setData('forge/icon', name)}
            onClick={() => {
              if (iconSel) useStore.getState().update(iconSel.id, { icon: name, name });
              else insert({ ...iconNode(name, t.text, stroke) });
            }}>
            <LucideIcon name={name} size={20} stroke={stroke} />
          </button>
        ))}
      </div>
      {list.length > limit && <button type="button" className="btn ghost wfull" onClick={() => setLimit(limit + 480)}>Show more ({list.length - limit})</button>}
    </div>
  );
}
import { createNode } from '../lib/nodes.js';
const iconNode = (name, color, stroke) => createNode('icon', { icon: name, name, w: 32, h: 32, color, stroke });

// ---------- My components ----------
function Mine() {
  const comps = useStore((s) => s.project.components);
  const cats = useStore((s) => s.project.categories);
  const selCount = useStore((s) => s.selection.length);
  const S = useStore.getState;
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [menu, setMenu] = useState(null);
  const [newCat, setNewCat] = useState(null);
  const [editCat, setEditCat] = useState(null);
  const [view, setView] = useState('grid');
  const fileRef = useRef(null);
  const ql = q.toLowerCase();
  const list = comps.filter((c) => (cat === 'all' || (cat === 'fav' ? c.fav : c.category === cat)) && (!ql || c.name.toLowerCase().includes(ql)));

  const exportLib = () => {
    const blob = new Blob([JSON.stringify({ forgeLibrary: 2, components: comps, categories: cats }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'forge-components.json'; a.click();
  };
  const importLib = async (f) => {
    try {
      const d = JSON.parse(await f.text());
      if (!d.components) throw new Error();
      S().mutate((p) => {
        d.components.forEach((c) => p.components.push({ ...c, id: uid() }));
        (d.categories || []).forEach((c) => { if (!p.categories.includes(c)) p.categories.push(c); });
      });
      S().saveLibrary();
      S().toast(`Imported ${d.components.length} components`);
    } catch { S().toast('Not a Forge component library file', 'warn'); }
  };

  return (
    <div className="mine">
      <button type="button" className="btn primary wfull" disabled={!selCount} onClick={() => S().set({ modal: 'component' })}>
        <Icon n="Component" s={15} /> {selCount ? `Create component from ${selCount} layer${selCount > 1 ? 's' : ''}` : 'Select layers to create a component'}
      </button>
      <div className="search">
        <Icon n="Search" s={14} />
        <input placeholder="Search your components…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
        <IconBtn icon={view === 'grid' ? 'List' : 'LayoutGrid'} size={13} title="Toggle view" onClick={() => setView(view === 'grid' ? 'list' : 'grid')} />
      </div>
      <div className="catlist">
        <div className="ph"><span>Categories</span><div className="grow" /><IconBtn icon="FolderPlus" title="New category" onClick={() => setNewCat('')} /></div>
        <button type="button" className={`catrow ${cat === 'all' ? 'sel' : ''}`} onClick={() => setCat('all')}><Icon n="Library" s={14} />All components<span>{comps.length}</span></button>
        <button type="button" className={`catrow ${cat === 'fav' ? 'sel' : ''}`} onClick={() => setCat('fav')}><Icon n="Star" s={14} />Favourites<span>{comps.filter((c) => c.fav).length}</span></button>
        {cats.map((c) => (
          editCat === c ? (
            <input key={c} autoFocus className="lrename catin" defaultValue={c} onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') e.currentTarget.blur(); }} onBlur={(e) => { S().renameCategory(c, e.target.value.trim()); if (cat === c) setCat(e.target.value.trim()); setEditCat(null); }} />
          ) : (
            <div key={c} className={`catrow ${cat === c ? 'sel' : ''}`} onClick={() => setCat(c)} onDoubleClick={() => setEditCat(c)}
              onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const id = e.dataTransfer.getData('forge/comp'); if (id) S().updateComponent(id, { category: c }); }}>
              <Icon n="Folder" s={14} />{c}<span>{comps.filter((x) => x.category === c).length}</span>
              <span className="catact">
                <button type="button" title="Rename" onClick={(e) => { e.stopPropagation(); setEditCat(c); }}><Icon n="Pencil" s={11} /></button>
                <button type="button" title="Delete category" onClick={(e) => { e.stopPropagation(); if (confirm(`Delete category “${c}”? Its components move to another category.`)) { S().deleteCategory(c); setCat('all'); } }}><Icon n="Trash2" s={11} /></button>
              </span>
            </div>
          )
        ))}
        {newCat !== null && <input autoFocus className="lrename catin" placeholder="Category name" onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setNewCat(null); }} onBlur={(e) => { S().addCategory(e.target.value.trim()); setNewCat(null); }} />}
      </div>
      {list.length === 0 ? (
        <div className="empty big">
          <Icon n="Component" s={28} />
          <b>No components here yet</b>
          <span>Select anything on the canvas and press <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>K</kbd> — it becomes a reusable component you can categorize, search, export and share.</span>
        </div>
      ) : (
        <div className={view === 'grid' ? 'cards' : 'clist'}>
          {list.map((c) => (
            <div key={c.id} className="card comp" draggable onDragStart={(e) => e.dataTransfer.setData('forge/comp', c.id)}
              onClick={() => S().insert(c.node)} onContextMenu={(e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, c }); }} title="Click to insert · drag to canvas · right-click for options">
              {view === 'grid' && <Thumb node={c.node} />}
              <span className="card-n">{c.name}<small>{c.category}</small></span>
              <button type="button" className={`fav ${c.fav ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); S().updateComponent(c.id, { fav: !c.fav }); }}><Icon n="Star" s={12} /></button>
            </div>
          ))}
        </div>
      )}
      <div className="row2">
        <button type="button" className="btn ghost sm" onClick={exportLib}><Icon n="Download" s={13} /> Export library</button>
        <button type="button" className="btn ghost sm" onClick={() => fileRef.current.click()}><Icon n="Upload" s={13} /> Import</button>
        <input ref={fileRef} type="file" accept=".json" hidden onChange={(e) => e.target.files[0] && importLib(e.target.files[0])} />
      </div>
      {menu && (
        <Menu x={menu.x} y={menu.y} onClose={() => setMenu(null)} items={[
          { label: 'Insert', icon: 'Plus', run: () => S().insert(menu.c.node) },
          { label: 'Rename', icon: 'Pencil', run: () => { const n = prompt('Component name', menu.c.name); if (n) S().updateComponent(menu.c.id, { name: n }); } },
          { label: menu.c.fav ? 'Remove from favourites' : 'Add to favourites', icon: 'Star', run: () => S().updateComponent(menu.c.id, { fav: !menu.c.fav }) },
          { label: 'Update from selection', icon: 'RefreshCw', disabled: S().selection.length !== 1, run: () => { const n = JSON.parse(JSON.stringify(S().selectedNodes()[0])); n.x = 0; n.y = 0; S().updateComponent(menu.c.id, { node: n }); S().toast('Component updated'); } },
          '-',
          ...cats.filter((x) => x !== menu.c.category).map((x) => ({ label: `Move to ${x}`, icon: 'FolderInput', run: () => S().updateComponent(menu.c.id, { category: x }) })),
          '-',
          { label: 'Delete component', icon: 'Trash2', danger: true, run: () => { if (confirm(`Delete “${menu.c.name}”?`)) S().deleteComponent(menu.c.id); } },
        ]} />
      )}
    </div>
  );
}
