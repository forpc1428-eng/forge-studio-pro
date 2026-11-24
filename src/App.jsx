import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from './store.js';
import Canvas from './components/Canvas.jsx';
import LeftPanel from './components/LeftPanel.jsx';
import Inspector, { loadFont } from './inspector/Inspector.jsx';
import CodeView from './components/CodeView.jsx';
import PublishCenter from './components/PublishCenter.jsx';
import { NodeView } from './components/NodeView.jsx';
import { Modal, Icon, IconBtn, Select, TextIn } from './ui/controls.jsx';
import { fillCSS } from './lib/style.js';
import { LIBRARY } from './lib/library.js';
import { DEVICES, THEMES } from './lib/constants.js';
import { walk } from './lib/nodes.js';
import { downloadBlob } from './lib/zip.js';
import { getPrefs, setPref } from './lib/uiPrefs.js';
import AppBackground from './components/AppBackground.jsx';
import InterfaceSettings from './components/InterfaceSettings.jsx';

export default function App() {
  const modal = useStore((s) => s.modal);
  const preview = useStore((s) => s.preview);
  const set = useStore((s) => s.set);
  const toasts = useStore((s) => s.toasts);
  const project = useStore((s) => s.project);
  useShortcuts();

  // load every font used in the project
  useEffect(() => {
    project.pages.forEach((p) => walk(p.nodes, (n) => { if (n.font) loadFont(n.font); }));
  }, [project.pages]);

  return (
    <>
    <AppBackground />
    <div className="app">
      <TopBar />
      <main className="main">
        <LeftPanel />
        <Canvas />
        <Inspector />
      </main>
      {preview && <Preview />}
      {modal === 'code' && <Modal title="Code" icon="Code" wide onClose={() => set({ modal: null })}><CodeView /></Modal>}
      {modal === 'publish' && <PublishCenter onClose={() => set({ modal: null })} />}
      {modal === 'component' && <ComponentModal />}
      {modal === 'json' && <JsonModal />}
      {modal === 'shortcuts' && <Shortcuts />}
      {modal === 'palette' && <Palette />}
      {modal === 'uiSettings' && <InterfaceSettings onClose={() => set({ modal: null })} />}
      <div className="toasts">{toasts.map((t) => <div key={t.id} className={`toast ${t.kind}`}><Icon n={t.kind === 'warn' ? 'TriangleAlert' : 'CircleCheck'} s={15} />{t.msg}</div>)}</div>
    </div>
    </>
  );
}

function TopBar() {
  const project = useStore((s) => s.project);
  const page = useStore((s) => s.page());
  const past = useStore((s) => s.past.length);
  const future = useStore((s) => s.future.length);
  const S = useStore.getState;
  const fileRef = useRef(null);
  const [menu, setMenu] = useState(false);
  const save = () => {
    const blob = new Blob([JSON.stringify({ ...project, publish: { ...project.publish, htmlFiles: null } })], { type: 'application/json' });
    downloadBlob(blob, `${project.name.replace(/\s+/g, '-')}.forge.json`);
    S().toast('Project saved to file');
  };
  const open = async (f) => {
    try {
      const p = JSON.parse(await f.text());
      if (!p.pages) throw new Error('bad');
      S().loadProject(p);
      S().toast(`Opened ${p.name}`);
    } catch { S().toast('Not a Forge Pro project file', 'warn'); }
  };
  useEffect(() => { useStore.setState({ saveProject: save, openProject: () => fileRef.current?.click() }); });
  return (
    <header className="top">
      <div className="brand" onClick={() => setMenu(!menu)}>
        <img className="logo-img" src={`${import.meta.env.BASE_URL}icon.svg`} alt="" width="30" height="30" />
        <b>Forge</b><span className="pro">PRO</span>
        <Icon n="ChevronDown" s={12} />
      </div>
      {menu && (
        <div className="filemenu" onMouseLeave={() => setMenu(false)}>
          <button type="button" onClick={() => { setMenu(false); if (confirm('Start a new empty project? (Your component library is kept.)')) S().newProject(); }}><Icon n="FilePlus" s={14} />New project</button>
          <button type="button" onClick={() => { setMenu(false); fileRef.current.click(); }}><Icon n="FolderOpen" s={14} />Open project…<kbd>Ctrl O</kbd></button>
          <button type="button" onClick={() => { setMenu(false); save(); }}><Icon n="Save" s={14} />Save project<kbd>Ctrl S</kbd></button>
          <div className="msep" />
          <button type="button" onClick={() => { setMenu(false); S().set({ modal: 'uiSettings' }); }}><Icon n="Palette" s={14} />Interface settings (background, glass)…</button>
          <button type="button" onClick={() => { const v = getPrefs().ui === 'glass' ? 'classic' : 'glass'; setPref('ui', v); setMenu(false); S().toast(v === 'glass' ? 'Interface: Liquid Glass' : 'Interface: Classic dark'); }}><Icon n="Droplets" s={14} />{getPrefs().ui === 'glass' ? 'Switch to Classic interface' : 'Switch to Liquid Glass interface'}</button>
          <button type="button" onClick={() => { const v = getPrefs().motion === 'on' ? 'off' : 'on'; setPref('motion', v); setMenu(false); S().toast(v === 'on' ? 'Liquid motion on' : 'Liquid motion off (saves battery)'); }}><Icon n="Waves" s={14} />{getPrefs().motion === 'on' ? 'Turn liquid motion off' : 'Turn liquid motion on'}</button>
          <div className="msep" />
          <button type="button" onClick={() => { setMenu(false); S().set({ modal: 'shortcuts' }); }}><Icon n="Keyboard" s={14} />Keyboard shortcuts<kbd>?</kbd></button>
          <button type="button" onClick={() => { setMenu(false); S().set({ modal: 'palette' }); }}><Icon n="Command" s={14} />Command palette<kbd>Ctrl K</kbd></button>
        </div>
      )}
      <input ref={fileRef} type="file" accept=".json" hidden onChange={(e) => e.target.files[0] && open(e.target.files[0])} />
      <div className="vsep" />
      <input className="pname" value={project.name} onChange={(e) => S().mutate((d) => { d.name = e.target.value; }, false)} onKeyDown={(e) => e.stopPropagation()} spellCheck={false} />
      <span className="crumb"><Icon n="ChevronRight" s={12} /></span>
      <Select className="pagesel" value={page.id} onChange={(id) => S().setPage(id)} options={project.pages.map((p) => [p.id, p.name])} />
      <Select className="devsel" value={page.device || 'custom'} onChange={(k) => { const d = DEVICES.find((x) => x.key === k); if (d) { S().updatePage({ device: k, w: d.w, h: Math.max(d.h, page.h) }); setTimeout(() => S().fitView?.(), 30); } }} options={[['custom', `Custom ${page.w}×${page.h}`], ...DEVICES.map((d) => [d.key, `${d.label}  ${d.w}×${d.h}`])]} />
      <div className="vsep" />
      <IconBtn icon="Undo2" title="Undo (Ctrl+Z)" onClick={S().undo} disabled={!past} />
      <IconBtn icon="Redo2" title="Redo (Ctrl+Shift+Z)" onClick={S().redo} disabled={!future} />
      <div className="grow" />
      <button type="button" className="cmdk" onClick={() => S().set({ modal: 'palette' })}><Icon n="Search" s={13} /> Search actions, components… <kbd>Ctrl K</kbd></button>
      <div className="grow" />
      <Select className="themesel" value={project.theme.name} onChange={(v) => S().setTheme(v)} options={Object.keys(THEMES).map((t) => [t, `Theme: ${t}`])} />
      <IconBtn icon="Settings2" title="Interface settings: background, glass, colours" onClick={() => S().set({ modal: S().modal === 'uiSettings' ? null : 'uiSettings' })} />
      <button type="button" className="btn ghost" onClick={() => S().set({ modal: 'code' })} title="Code (Ctrl+E)"><Icon n="Code" s={15} /> Code</button>
      <button type="button" className="btn ghost" onClick={() => S().set({ preview: true })} title="Preview (P)"><Icon n="Play" s={15} /> Preview</button>
      <button type="button" className="btn primary" onClick={() => S().set({ modal: 'publish' })}><Icon n="Rocket" s={15} /> Publish</button>
    </header>
  );
}

// ---------- preview ----------
function Preview() {
  const project = useStore((s) => s.project);
  const startId = useStore((s) => s.pageId);
  const set = useStore((s) => s.set);
  const [stack, setStack] = useState([startId]);
  const [frame, setFrame] = useState(true);
  const [k, setK] = useState(1);
  const [key, setKey] = useState(0);
  const page = project.pages.find((p) => p.id === stack[stack.length - 1]) || project.pages[0];
  const isPhone = page.w < 500;
  const boxRef = useRef(null);
  useEffect(() => {
    const fit = () => {
      const el = boxRef.current;
      if (!el) return;
      const pad = isPhone && frame ? 40 : 0;
      setK(Math.min(1, (el.clientWidth - 40 - pad) / page.w, isPhone ? (el.clientHeight - 40 - pad) / page.h : 99));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [page, frame, isPhone]);
  useEffect(() => {
    const kd = (e) => { if (e.key === 'Escape') set({ preview: false }); };
    window.addEventListener('keydown', kd);
    return () => window.removeEventListener('keydown', kd);
  }, [set]);
  const onAction = (a) => {
    if (a.type === 'page' && a.target) { setStack((s) => [...s, a.target]); setKey((x) => x + 1); }
    else if (a.type === 'back') { setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)); setKey((x) => x + 1); }
    else if (a.type === 'url' && a.target) window.open(a.target, '_blank');
    else if (a.type === 'scroll') boxRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    else if (a.type === 'alert') alert(a.target);
  };
  return (
    <div className="preview">
      <div className="pv-top">
        <span className="pv-badge"><Icon n="Play" s={12} /> Preview</span>
        <Select value={page.id} onChange={(id) => { setStack([id]); setKey((x) => x + 1); }} options={project.pages.map((p) => [p.id, p.name])} />
        <IconBtn icon="ArrowLeft" title="Back" disabled={stack.length < 2} onClick={() => onAction({ type: 'back' })} />
        <IconBtn icon="RotateCcw" title="Replay animations" onClick={() => setKey((x) => x + 1)} />
        {isPhone && <IconBtn icon="Smartphone" title="Device frame" active={frame} onClick={() => setFrame(!frame)} />}
        <div className="grow" />
        <span className="pv-hint">Click buttons to follow links · drag 3D objects · Esc to exit</span>
        <button type="button" className="btn" onClick={() => set({ preview: false })}><Icon n="X" s={14} /> Close</button>
      </div>
      <div className="pv-stage" ref={boxRef}>
        <div className={`pv-device ${isPhone && frame ? 'framed' : ''}`} style={{ width: page.w * k + (isPhone && frame ? 24 : 0) }}>
          <div className="pv-scroll" style={isPhone ? { height: Math.min(page.h, 932) * k, overflowY: 'auto' } : undefined}>
            <div style={{ width: page.w * k, height: page.h * k, position: 'relative' }}>
              <div key={key} className="pv-page" style={{ width: page.w, height: page.h, background: fillCSS(page.fill), transform: `scale(${k})` }}>
                {page.nodes.map((n) => <NodeView key={n.id} n={n} parent={null} mode="preview" onAction={onAction} playKey={key} />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- component modal ----------
function ComponentModal() {
  const cats = useStore((s) => s.project.categories);
  const sel = useStore((s) => s.selectedNodes());
  const S = useStore.getState;
  const [name, setName] = useState(sel.length === 1 ? sel[0].name : 'My component');
  const [cat, setCat] = useState(cats[0] || 'General');
  const [newCat, setNewCat] = useState('');
  const close = () => S().set({ modal: null });
  const save = () => {
    const c = newCat.trim() || cat;
    S().createComponent(name.trim() || 'Component', c);
    close();
    S().set({ leftTab: 'mine' });
  };
  return (
    <Modal title="Create component" icon="Component" onClose={close} footer={<><button type="button" className="btn ghost" onClick={close}>Cancel</button><button type="button" className="btn primary" onClick={save}><Icon n="Check" s={14} /> Save component</button></>}>
      <div className="form">
        <label>Name<TextIn value={name} onChange={setName} /></label>
        <label>Category
          <div className="catpick">
            {cats.map((c) => <button type="button" key={c} className={`chip ${cat === c && !newCat ? 'on' : ''}`} onClick={() => { setCat(c); setNewCat(''); }}><Icon n="Folder" s={12} /> {c}</button>)}
          </div>
        </label>
        <label>…or new category<TextIn value={newCat} onChange={setNewCat} placeholder="e.g. Hero sections, Login screens…" /></label>
        <div className="hint">{sel.length} layer{sel.length > 1 ? 's' : ''} will be saved. Components are stored in this browser, and you can export or import them as a library file from My components.</div>
      </div>
    </Modal>
  );
}

function JsonModal() {
  const sel = useStore((s) => s.selectedNodes());
  const S = useStore.getState;
  const n = sel[0];
  const [txt, setTxt] = useState(() => JSON.stringify(n, null, 2));
  const [err, setErr] = useState('');
  const close = () => S().set({ modal: null });
  if (!n) return null;
  const apply = () => {
    try {
      const v = JSON.parse(txt);
      S().update(n.id, (d) => { Object.keys(d).forEach((k) => { if (k !== 'id') delete d[k]; }); Object.assign(d, { ...v, id: n.id }); });
      close();
      S().toast('Layer updated from JSON');
    } catch (e) { setErr(e.message); }
  };
  return (
    <Modal title={`Edit “${n.name}” as JSON`} icon="Braces" wide onClose={close} footer={<>{err && <span className="err">{err}</span>}<div className="grow" /><button type="button" className="btn ghost" onClick={close}>Cancel</button><button type="button" className="btn primary" onClick={apply}>Apply</button></>}>
      <textarea className="jsonedit" value={txt} onChange={(e) => { setTxt(e.target.value); setErr(''); }} onKeyDown={(e) => e.stopPropagation()} spellCheck={false} />
    </Modal>
  );
}

const SHORTCUTS = [
  ['General', [['Ctrl K', 'Command palette'], ['Ctrl S', 'Save project file'], ['Ctrl O', 'Open project'], ['Ctrl Z / Ctrl ⇧ Z', 'Undo / redo'], ['P', 'Preview'], ['Ctrl E', 'Code'], ['Ctrl ⇧ P', 'Publish Center'], ['?', 'This list']]],
  ['Tools', [['V', 'Select'], ['H / Space-drag', 'Pan'], ['F', 'Frame'], ['R', 'Rectangle'], ['O', 'Ellipse'], ['T', 'Text'], ['I', 'Image'], ['D', '3D object'], ['3', '3D layer view']]],
  ['Edit', [['Ctrl C / X / V', 'Copy / cut / paste'], ['Ctrl D', 'Duplicate'], ['Del', 'Delete'], ['Ctrl G / Ctrl ⇧ G', 'Group / ungroup'], ['⇧ A', 'Add auto layout'], ['Ctrl ⌥ K', 'Create component'], ['Ctrl A', 'Select all'], ['Esc', 'Select parent / clear'], ['Enter', 'Select children / edit text']]],
  ['Arrange', [['Arrows', 'Nudge 1px'], ['⇧ Arrows', 'Nudge 10px'], [']  [', 'Front / back'], ['Ctrl ] / Ctrl [', 'Forward / backward'], ['Ctrl ⇧ H', 'Hide'], ['Ctrl ⇧ L', 'Lock']]],
  ['View', [['Ctrl scroll', 'Zoom at cursor'], ['Ctrl + / Ctrl −', 'Zoom'], ['⇧ 1', 'Fit page'], ['⇧ 0', '100%'], ["Ctrl '", 'Toggle grid']]],
  ['Canvas', [['Drag', 'Move (smart guides)'], ['⇧ drag', 'Straight / keep ratio'], ['Alt drag', 'No snapping / from centre'], ['Ctrl click', 'Deep select'], ['Double-click', 'Enter group / edit text'], ['Right-click', 'Context menu']]],
];

function Shortcuts() {
  const S = useStore.getState;
  return (
    <Modal title="Keyboard shortcuts" icon="Keyboard" wide onClose={() => S().set({ modal: null })}>
      <div className="sc-grid">
        {SHORTCUTS.map(([g, list]) => (
          <div key={g}><h5>{g}</h5>{list.map(([k, l]) => <div key={l} className="sc"><span>{l}</span><kbd>{k}</kbd></div>)}</div>
        ))}
      </div>
    </Modal>
  );
}

// ---------- command palette ----------
function Palette() {
  const S = useStore.getState;
  const t = useStore((s) => s.project.theme.tokens);
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const close = () => S().set({ modal: null });
  const actions = useMemo(() => {
    const A = [
      ['Publish: Android APK, desktop, website', 'Rocket', () => S().set({ modal: 'publish' })],
      ['Preview', 'Play', () => S().set({ preview: true })],
      ['Show code', 'Code', () => S().set({ modal: 'code' })],
      ['Save project file', 'Save', () => S().saveProject?.()],
      ['Open project file', 'FolderOpen', () => S().openProject?.()],
      ['New page', 'FilePlus', () => S().addPage()],
      ['Duplicate page', 'Copy', () => S().duplicatePage(S().pageId)],
      ['Toggle 3D layer view', 'Rotate3d', () => S().set((s) => ({ explode: !s.explode }))],
      ['Toggle grid', 'Grid3x3', () => S().set((s) => ({ grid: !s.grid }))],
      ['Fit to screen', 'Maximize', () => S().fitView?.()],
      ['Replay animations', 'RotateCcw', () => S().set((s) => ({ playKey: s.playKey + 1 }))],
      ['Create component from selection', 'Component', () => S().set({ modal: 'component' })],
      ['Group selection', 'Group', () => S().group()],
      ['Ungroup', 'Ungroup', () => S().ungroup()],
      ['Keyboard shortcuts', 'Keyboard', () => S().set({ modal: 'shortcuts' })],
      ['Interface settings: background, glass, colours', 'Settings2', () => S().set({ modal: 'uiSettings' })],
      ['Interface: Liquid Glass', 'Droplets', () => setPref('ui', 'glass')],
      ['Interface: Classic dark', 'Moon', () => setPref('ui', 'classic')],
      ['Toggle liquid motion', 'Waves', () => setPref('motion', getPrefs().motion === 'on' ? 'off' : 'on')],
      ['Download full React project', 'Package', () => S().set({ modal: 'code' })],
      ...Object.keys(THEMES).map((n) => [`Theme: ${n}`, 'Palette', () => S().setTheme(n)]),
      ...S().project.pages.map((p) => [`Go to page: ${p.name}`, 'File', () => S().setPage(p.id)]),
    ].map(([label, icon, run]) => ({ label, icon, run, kind: 'Action' }));
    const L = LIBRARY.map((it) => ({ label: `Insert ${it.name}`, icon: 'Plus', kind: 'Component', run: () => S().insert(it.make(t)) }));
    const C = S().project.components.map((c) => ({ label: `Insert ${c.name}`, icon: 'Component', kind: c.category, run: () => S().insert(c.node) }));
    return [...A, ...C, ...L];
  }, [t]);
  const ql = q.toLowerCase();
  const list = actions.filter((a) => !ql || ql.split(' ').every((w) => a.label.toLowerCase().includes(w))).slice(0, 60);
  useEffect(() => setI(0), [q]);
  return (
    <div className="modal-bg" onPointerDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="palette">
        <div className="pal-in">
          <Icon n="Search" s={16} />
          <input autoFocus placeholder="Type a command or component…" value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Escape') close();
              if (e.key === 'ArrowDown') { e.preventDefault(); setI((x) => Math.min(list.length - 1, x + 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setI((x) => Math.max(0, x - 1)); }
              if (e.key === 'Enter' && list[i]) { close(); list[i].run(); }
            }} />
        </div>
        <div className="pal-list">
          {list.map((a, j) => (
            <button type="button" key={a.label + j} className={j === i ? 'on' : ''} onMouseEnter={() => setI(j)} onClick={() => { close(); a.run(); }}>
              <Icon n={a.icon} s={15} /><span>{a.label}</span><small>{a.kind}</small>
            </button>
          ))}
          {!list.length && <div className="empty">Nothing found</div>}
        </div>
      </div>
    </div>
  );
}

// ---------- keyboard ----------
function useShortcuts() {
  useEffect(() => {
    const onKey = (e) => {
      const el = document.activeElement;
      if (el && (/INPUT|TEXTAREA|SELECT/.test(el.tagName) || el.isContentEditable)) return;
      const S = useStore.getState();
      if (S.preview) return;
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      const run = (fn) => { e.preventDefault(); fn(); };
      if (mod && k === 'k' && e.altKey) return run(() => S.selection.length && S.set({ modal: 'component' }));
      if (mod && k === 'k') return run(() => S.set({ modal: 'palette' }));
      if (S.modal) return;
      if (mod && k === 'z') return run(e.shiftKey ? S.redo : S.undo);
      if (mod && k === 'y') return run(S.redo);
      if (mod && k === 's') return run(() => S.saveProject?.());
      if (mod && k === 'o') return run(() => S.openProject?.());
      if (mod && k === 'e') return run(() => S.set({ modal: 'code' }));
      if (mod && e.shiftKey && k === 'p') return run(() => S.set({ modal: 'publish' }));
      if (mod && k === 'c') return run(S.copy);
      if (mod && k === 'x') return run(S.cut);
      if (mod && k === 'v') return run(S.paste);
      if (mod && k === 'd') return run(S.duplicate);
      if (mod && k === 'a') return run(S.selectAll);
      if (mod && k === 'g') return run(e.shiftKey ? S.ungroup : S.group);
      if (mod && e.shiftKey && k === 'h') return run(() => S.updateSel((n) => { n.visible = !n.visible; }));
      if (mod && e.shiftKey && k === 'l') return run(() => S.updateSel((n) => { n.locked = !n.locked; }));
      if (mod && k === ']') return run(() => S.arrange('forward'));
      if (mod && k === '[') return run(() => S.arrange('backward'));
      if (mod && (k === '=' || k === '+')) return run(() => S.zoomTo(Math.min(8, S.zoom * 1.25)));
      if (mod && k === '-') return run(() => S.zoomTo(Math.max(0.03, S.zoom / 1.25)));
      if (mod && k === "'") return run(() => S.set({ grid: !S.grid }));
      if (mod) return;
      if (k === 'delete' || k === 'backspace') return run(() => S.remove());
      if (k === 'escape') {
        if (S.explode) return run(() => S.set({ explode: false }));
        if (S.tool !== 'select') return run(() => S.set({ tool: 'select' }));
        const pg = S.page();
        if (S.selection.length === 1) {
          let parent = null;
          walk(pg.nodes, (n, p) => { if (n.id === S.selection[0]) { parent = p; return false; } });
          return run(() => S.set({ selection: parent ? [parent.id] : [] }));
        }
        return run(() => S.set({ selection: [] }));
      }
      if (k === 'enter') {
        const n = S.selectedNodes()[0];
        if (n?.type === 'text') return run(() => S.set({ editingId: n.id }));
        if (n?.children?.length) return run(() => S.set({ selection: n.children.map((c) => c.id) }));
      }
      if (k.startsWith('arrow') && S.selection.length) {
        const d = e.shiftKey ? 10 : 1;
        const dx = k === 'arrowleft' ? -d : k === 'arrowright' ? d : 0;
        const dy = k === 'arrowup' ? -d : k === 'arrowdown' ? d : 0;
        return run(() => S.updateSel((n) => { n.x += dx; n.y += dy; }));
      }
      if (e.shiftKey && k === '!') return run(() => S.fitView?.());
      if (e.shiftKey && e.code === 'Digit1') return run(() => S.fitView?.());
      if (e.shiftKey && e.code === 'Digit0') return run(() => S.zoomTo(1));
      if (e.shiftKey && k === 'a') return run(() => { const n = S.selectedNodes(); if (n.length === 1 && n[0].children) S.updateSel((d) => { d.layout.mode = d.layout.mode === 'none' ? 'column' : 'none'; }); else if (n.length) { S.group(); useStore.getState().updateSel((d) => { d.layout.mode = 'column'; d.sizeW = 'hug'; d.sizeH = 'hug'; }); } });
      if (k === '?') return run(() => S.set({ modal: 'shortcuts' }));
      if (k === ']') return run(() => S.arrange('front'));
      if (k === '[') return run(() => S.arrange('back'));
      const tools = { v: 'select', h: 'hand', f: 'frame', r: 'rect', o: 'ellipse', t: 'text', i: 'image', d: 'three' };
      if (tools[k] && !e.shiftKey) return run(() => S.set({ tool: tools[k] }));
      if (k === 'p') return run(() => S.set({ preview: true }));
      if (k === '3') return run(() => S.set({ explode: !S.explode, selection: [] }));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
