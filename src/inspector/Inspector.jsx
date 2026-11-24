import React, { useState } from 'react';
import { useStore } from '../store.js';
import { findParent } from '../lib/nodes.js';
import { FONTS, WEIGHTS, GRADIENTS, SHADOW_PRESETS, ENTER_ANIMS, HOVER_FX, LOOP_FX, EASINGS, BLENDS, CURSORS, DEVICES, THEMES } from '../lib/constants.js';
import { Section, Row, Num, Slider, Select, Seg, Toggle, TextIn, ColorField, IconBtn, Icon } from '../ui/controls.jsx';
import { SHAPES, MATERIALS, ENVS } from '../lib/constants.js';
import { LucideIcon } from '../components/NodeView.jsx';
import CodeView from '../components/CodeView.jsx';
import { storageInfo, requestPersistence, fmtBytes } from '../lib/db.js';

export default function Inspector() {
  const tab = useStore((s) => s.rightTab);
  const set = useStore((s) => s.set);
  const sel = useStore((s) => s.selectedNodes());
  return (
    <aside className="panel right">
      <div className="rtabs">
        {[['design', 'Style', 'Palette'], ['motion', 'Animate', 'Sparkles'], ['code', 'Code', 'Code']].map(([k, l, ic]) => (
          <button type="button" key={k} className={tab === k ? 'on' : ''} onClick={() => set({ rightTab: k })}><Icon n={ic} s={14} />{l}</button>
        ))}
      </div>
      <div className="rbody">
        {tab === 'code' ? <CodeView inline /> : sel.length === 0 ? <PageProps /> : tab === 'design' ? <DesignProps nodes={sel} /> : <MotionProps nodes={sel} />}
      </div>
    </aside>
  );
}

// helpers to read/write the first selected node and apply to all
function useEdit(nodes) {
  const update = useStore((s) => s.updateSel);
  const n = nodes[0];
  const setP = (k, v, record = true) => update((d) => { d[k] = v; }, record);
  const setDeep = (k, sub, v, record = true) => update((d) => { d[k] = { ...(d[k] || {}), [sub]: v }; }, record);
  return { n, setP, setDeep, update };
}

// ================= PAGE =================
function PageProps() {
  const page = useStore((s) => s.page());
  const theme = useStore((s) => s.project.theme);
  const project = useStore((s) => s.project);
  const S = useStore.getState;
  const up = (patch) => S().updatePage(patch);
  return (
    <>
      <div className="insp-head"><span className="tag"><Icon n="File" s={12} /> Page</span><b>{page.name}</b></div>
      <Section title="Page" icon="File">
        <Row label="Name"><TextIn value={page.name} onChange={(v) => up({ name: v })} onBlurCommit /></Row>
        <Row label="Size" cols="1fr 1fr"><Num label="W" value={page.w} min={50} onChange={(v) => up({ w: v })} /><Num label="H" value={page.h} min={50} onChange={(v) => up({ h: v })} /></Row>
        <Row label="Preset">
          <Select value={page.device || 'custom'} onChange={(k) => { const d = DEVICES.find((x) => x.key === k); if (d) up({ device: k, w: d.w, h: d.h }); }} options={[['custom', 'Custom'], ...DEVICES.map((d) => [d.key, `${d.label} · ${d.w}×${d.h}`])]} />
        </Row>
        <Row label="Height"><div className="btnrow">{[1, 1.5, 2, 3, 4].map((k) => <button type="button" key={k} className="chip" onClick={() => { const d = DEVICES.find((x) => x.key === page.device); up({ h: Math.round((d?.h || 1024) * k) }); }}>×{k}</button>)}</div></Row>
      </Section>
      <FillSection fill={page.fill || { type: 'solid', color: '#0b0b12' }} onChange={(f, r) => S().mutate((d) => { d.pages.find((p) => p.id === page.id).fill = f; }, r)} title="Background" />
      <Section title="Colour theme" icon="SwatchBook">
        <div className="themes">
          {Object.entries(THEMES).map(([name, t]) => (
            <button type="button" key={name} className={`theme ${theme.name === name ? 'on' : ''}`} onClick={() => S().setTheme(name)} title={`Recolour everything to ${name}`}>
              <span className="tsw" style={{ background: t.bg }}><i style={{ background: t.accent }} /><i style={{ background: t.accent2 }} /><i style={{ background: t.text }} /></span>
              {name}
            </button>
          ))}
        </div>
        <div className="hint">Switching theme recolours every layer that uses theme colours.</div>
      </Section>
      <Section title="Project" icon="FolderOpen">
        <Row label="Name"><TextIn value={project.name} onChange={(v) => S().mutate((d) => { d.name = v; })} onBlurCommit /></Row>
        <StorageMeter />
        <div className="stats">
          <div><b>{project.pages.length}</b><span>Pages</span></div>
          <div><b>{project.components.length}</b><span>Components</span></div>
          <div><b>{project.categories.length}</b><span>Categories</span></div>
        </div>
      </Section>
      <Section title="Grid" icon="Grid3x3" defaultOpen={false}>
        <Row label="Size"><Num value={page.gridSize || 8} min={2} max={200} onChange={(v) => up({ gridSize: v })} suffix="px" /></Row>
        <Toggle label="Show grid" checked={useStore.getState().grid} onChange={(v) => S().set({ grid: v })} />
      </Section>
    </>
  );
}

function StorageMeter() {
  const savedAt = useStore((s) => s.savedAt);
  const [info, setInfo] = useState(null);
  React.useEffect(() => { storageInfo().then(setInfo); }, [savedAt]);
  if (!info) return null;
  const pct = info.quota ? Math.max(0.5, (info.usage / info.quota) * 100) : 0;
  return (
    <div className="storage">
      <div className="st-h"><Icon n="HardDrive" s={13} /> Device storage <span className={info.persisted ? 'ok' : ''}>{info.persisted ? 'Persistent' : 'Best-effort'}</span></div>
      <div className="st-bar"><i style={{ width: `${Math.min(100, pct)}%` }} /></div>
      <div className="st-f"><span>{fmtBytes(info.usage)} used</span><span>{fmtBytes(info.quota)} available</span></div>
      {!info.persisted && <button type="button" className="btn sm ghost wfull" onClick={async () => { await requestPersistence(); setInfo(await storageInfo()); }}><Icon n="ShieldCheck" s={13} /> Keep my data permanently</button>}
      {savedAt && <div className="hint"><Icon n="Check" s={11} /> Saved on this device {new Date(savedAt).toLocaleTimeString()}</div>}
    </div>
  );
}

// ================= DESIGN =================
function DesignProps({ nodes }) {
  const { n, setP, setDeep, update } = useEdit(nodes);
  const page = useStore((s) => s.page());
  const parent = findParent(page.nodes, n.id);
  const flow = parent && parent.layout.mode !== 'none';
  const S = useStore.getState;
  const multi = nodes.length > 1;
  return (
    <>
      <div className="insp-head">
        <span className="tag"><LucideIcon name={n.type === 'icon' ? n.icon : n.children ? 'Frame' : 'Square'} size={12} /> {multi ? `${nodes.length} layers` : n.type}</span>
        {!multi && <input className="insp-name" value={n.name} onChange={(e) => setP('name', e.target.value, false)} onBlur={() => S().commit()} onFocus={() => S().begin()} onKeyDown={(e) => e.stopPropagation()} />}
        <div className="grow" />
        <IconBtn icon="Component" title="Create component (Ctrl+Alt+K)" onClick={() => S().set({ modal: 'component' })} />
        <IconBtn icon="CopyPlus" title="Duplicate (Ctrl+D)" onClick={() => S().duplicate()} />
        <IconBtn icon="Trash2" title="Delete" onClick={() => S().remove()} danger />
      </div>

      <div className="alignbar">
        {[['left', 'AlignStartVertical'], ['hcenter', 'AlignCenterVertical'], ['right', 'AlignEndVertical'], ['top', 'AlignStartHorizontal'], ['vcenter', 'AlignCenterHorizontal'], ['bottom', 'AlignEndHorizontal']].map(([k, ic]) => (
          <IconBtn key={k} icon={ic} title={`Align ${k}`} onClick={() => S().align(k)} disabled={flow} />
        ))}
        <IconBtn icon="AlignHorizontalSpaceAround" title="Distribute horizontally" onClick={() => S().distribute('h')} disabled={nodes.length < 3} />
        <IconBtn icon="AlignVerticalSpaceAround" title="Distribute vertically" onClick={() => S().distribute('v')} disabled={nodes.length < 3} />
      </div>

      <Section title="Position & size" icon="Move">
        {!flow && <Row cols="1fr 1fr"><Num label="X" value={n.x} onChange={(v, r) => setP('x', v, r)} /><Num label="Y" value={n.y} onChange={(v, r) => setP('y', v, r)} /></Row>}
        <Row cols="1fr 1fr auto">
          <Num label="W" value={n.w} min={1} onChange={(v, r) => update((d) => { d.w = v; d.sizeW = 'fixed'; if (d.lockRatio) d.h = Math.round(v / (n.w / n.h)); }, r)} disabled={n.sizeW !== 'fixed'} />
          <Num label="H" value={n.h} min={1} onChange={(v, r) => update((d) => { d.h = v; d.sizeH = 'fixed'; if (d.lockRatio) d.w = Math.round(v * (n.w / n.h)); }, r)} disabled={n.sizeH !== 'fixed'} />
          <IconBtn icon={n.lockRatio ? 'Link' : 'Unlink'} title="Lock aspect ratio" active={n.lockRatio} onClick={() => setP('lockRatio', !n.lockRatio)} />
        </Row>
        <Row label="Width" cols="1fr"><Seg small value={n.sizeW} onChange={(v) => setP('sizeW', v)} options={[['fixed', 'Exact size'], ['hug', 'Fit content'], ...(flow ? [['fill', 'Stretch']] : [])]} /></Row>
        <Row label="Height" cols="1fr"><Seg small value={n.sizeH} onChange={(v) => setP('sizeH', v)} options={[['fixed', 'Exact size'], ['hug', 'Fit content'], ...(flow ? [['fill', 'Stretch']] : [])]} /></Row>
        <Row cols="1fr 1fr"><Num icon="RotateCw" value={n.rotation} onChange={(v, r) => setP('rotation', v, r)} suffix="°" /><Num icon="Blend" value={Math.round(n.opacity * 100)} min={0} max={100} onChange={(v, r) => setP('opacity', v / 100, r)} suffix="%" /></Row>
        <Row cols="auto auto auto 1fr">
          <IconBtn icon="FlipHorizontal2" title="Flip horizontal" onClick={() => setP('rotation', (n.rotation || 0) === 0 ? 180 : 0)} />
          <IconBtn icon={n.locked ? 'Lock' : 'LockOpen'} title="Lock" active={n.locked} onClick={() => setP('locked', !n.locked)} />
          <IconBtn icon={n.clip ? 'Crop' : 'Scan'} title="Clip content" active={n.clip} onClick={() => setP('clip', !n.clip)} />
          <span className="hint" style={{ alignSelf: 'center' }}>{flow ? 'In auto layout — drag to reorder' : ''}</span>
        </Row>
      </Section>

      {n.children && <AutoLayoutSection n={n} update={update} />}
      <TypeSection n={n} setP={setP} setDeep={setDeep} update={update} />
      {(n.type === 'text' || n.type === 'input') && <TypographySection n={n} setP={setP} />}
      {!['toggle', 'checkbox', 'slider', 'progress', 'icon'].includes(n.type) && (
        <FillSection fill={n.fill} title={n.type === 'text' ? (n.gradText ? 'Text gradient' : 'Highlight behind text') : 'Colour / background'} onChange={(f, r) => update((d) => { d.fill = f; }, r)} allowImage />
      )}
      <StrokeSection n={n} update={update} />
      <Section title="Rounded corners" icon="Squircle">
        <Row cols="1fr auto">
          <Slider value={n.radii ? n.radii[0] : n.radius} max={Math.max(200, n.radius)} onChange={(v, r) => update((d) => { d.radius = v; d.radii = null; }, r)} />
          <IconBtn icon="Scan" title="Individual corners" active={!!n.radii} onClick={() => setP('radii', n.radii ? null : [n.radius, n.radius, n.radius, n.radius])} />
        </Row>
        {n.radii && <Row cols="1fr 1fr 1fr 1fr">{['↖', '↗', '↘', '↙'].map((l, i) => <Num key={i} label={l} value={n.radii[i]} min={0} onChange={(v, r) => update((d) => { d.radii = d.radii.map((x, j) => (j === i ? v : x)); }, r)} />)}</Row>}
        <div className="btnrow">{[0, 4, 8, 12, 16, 24, 32, 999].map((r) => <button type="button" key={r} className="chip" onClick={() => update((d) => { d.radius = r; d.radii = null; })}>{r === 999 ? 'Full' : r}</button>)}</div>
      </Section>
      <EffectsSection n={n} update={update} setP={setP} />
      <Section title="When clicked" icon="MousePointerClick" defaultOpen={false}>
        <InteractionFields n={n} setDeep={setDeep} setP={setP} />
      </Section>
    </>
  );
}

function AutoLayoutSection({ n, update }) {
  const L = n.layout;
  const set = (k, v, r) => update((d) => { d.layout = { ...d.layout, [k]: v }; }, r);
  return (
    <Section title="Arrange items inside (row / column)" icon="LayoutPanelTop" right={
      <Seg small value={L.mode} onChange={(v) => update((d) => { d.layout.mode = v; if (v !== 'none' && d.sizeW === 'fixed' && d.sizeH === 'fixed') { /* keep */ } })} options={[['none', 'Off', 'Ban'], ['row', 'Row', 'ArrowRight'], ['column', 'Column', 'ArrowDown']]} />
    }>
      {L.mode !== 'none' ? (
        <>
          <Row cols="1fr 1fr"><Num icon="Space" value={L.gap} onChange={(v, r) => set('gap', v, r)} title="Gap" /><Toggle label="Wrap" checked={L.wrap} onChange={(v) => set('wrap', v)} /></Row>
          <Row label="Padding" cols="1fr 1fr 1fr 1fr">{['T', 'R', 'B', 'L'].map((l, i) => <Num key={l} label={l} value={L.pad[i]} min={0} onChange={(v, r) => set('pad', L.pad.map((x, j) => (j === i ? v : x)), r)} />)}</Row>
          <Row label="Align"><Seg small value={L.align} onChange={(v) => set('align', v)} options={L.mode === 'row' ? [['start', 'Top', 'AlignStartHorizontal'], ['center', 'Middle', 'AlignCenterHorizontal'], ['end', 'Bottom', 'AlignEndHorizontal'], ['stretch', 'Stretch', 'StretchVertical']] : [['start', 'Left', 'AlignStartVertical'], ['center', 'Center', 'AlignCenterVertical'], ['end', 'Right', 'AlignEndVertical'], ['stretch', 'Stretch', 'StretchHorizontal']]} /></Row>
          <Row label="Justify"><Seg small value={L.justify} onChange={(v) => set('justify', v)} options={[['start', 'Start'], ['center', 'Center'], ['end', 'End'], ['between', 'Between'], ['around', 'Around']]} /></Row>
        </>
      ) : <div className="hint">Turn on auto layout to stack children in a row or column with gap & padding — like CSS flexbox.</div>}
    </Section>
  );
}

export function FillSection({ fill, onChange, title = 'Fill', allowImage }) {
  const f = fill || { type: 'none' };
  const stops = f.stops || [{ c: '#7c5cff', p: 0 }, { c: '#ff4fa3', p: 100 }];
  const set = (patch, r) => onChange({ ...f, stops, ...patch }, r);
  const types = [['none', 'None', 'Ban'], ['solid', 'Solid', 'Square'], ['linear', 'Linear', 'Blend'], ['radial', 'Radial', 'CircleDot'], ['conic', 'Conic', 'Loader'], ['mesh', 'Mesh', 'Waves'], ...(allowImage ? [['image', 'Image', 'Image']] : [])];
  return (
    <Section title={title} icon="PaintBucket" right={<Seg small value={f.type} onChange={(v) => set({ type: v, color: f.color || '#7c5cff' })} options={types} />}>
      {f.type === 'solid' && <ColorField value={f.color} onChange={(c) => set({ color: c })} />}
      {['linear', 'radial', 'conic', 'mesh'].includes(f.type) && (
        <>
          <div className="gbar" style={{ background: `linear-gradient(90deg, ${stops.map((s) => `${s.c} ${s.p}%`).join(',')})` }} />
          {stops.map((s, i) => (
            <Row key={i} cols="1fr 64px auto">
              <ColorField value={s.c} onChange={(c) => set({ stops: stops.map((x, j) => (j === i ? { ...x, c } : x)) })} />
              <Num value={s.p} min={0} max={100} suffix="%" onChange={(v, r) => set({ stops: stops.map((x, j) => (j === i ? { ...x, p: v } : x)) }, r)} />
              <IconBtn icon="Minus" size={12} title="Remove stop" disabled={stops.length <= 2} onClick={() => set({ stops: stops.filter((_, j) => j !== i) })} />
            </Row>
          ))}
          <Row cols="1fr auto">
            {f.type === 'linear' || f.type === 'conic' ? <Slider label="Angle" value={f.angle ?? 135} max={360} suffix="°" onChange={(v, r) => set({ angle: v }, r)} /> : f.type === 'mesh' ? <ColorField value={f.color || '#0b0b12'} onChange={(c) => set({ color: c })} label="Base" /> : <span />}
            <IconBtn icon="Plus" size={12} title="Add stop" onClick={() => set({ stops: [...stops, { c: '#ffffff', p: 50 }].sort((a, b) => a.p - b.p) })} />
          </Row>
          <div className="gpresets">
            {GRADIENTS.map((g, i) => (
              <button type="button" key={i} style={{ background: `linear-gradient(135deg, ${g.join(',')})` }} onClick={() => set({ stops: g.map((c, j) => ({ c, p: Math.round((j / (g.length - 1)) * 100) })) })} />
            ))}
          </div>
        </>
      )}
      {f.type === 'image' && (
        <>
          <ImagePicker value={f.image} onChange={(src) => set({ image: src })} />
          <Row label="Fit"><Seg small value={f.fit || 'cover'} onChange={(v) => set({ fit: v })} options={['cover', 'contain', 'auto']} /></Row>
        </>
      )}
    </Section>
  );
}

function ImagePicker({ value, onChange }) {
  const ref = React.useRef(null);
  return (
    <div className="imgpick">
      <div className="imgprev" style={{ backgroundImage: value ? `url("${value}")` : undefined }} onClick={() => ref.current.click()}>{!value && <Icon n="ImagePlus" s={20} />}</div>
      <div className="imgside">
        <button type="button" className="btn sm" onClick={() => ref.current.click()}><Icon n="Upload" s={13} /> Upload</button>
        <button type="button" className="btn sm ghost" onClick={() => onChange(`https://picsum.photos/seed/${Math.random().toString(36).slice(2, 7)}/1200/800`)}><Icon n="Shuffle" s={13} /> Random photo</button>
        <TextIn value={value?.startsWith('data:') ? '(uploaded image)' : value} placeholder="Paste image URL" onChange={(v) => { if (v !== '(uploaded image)') onChange(v); }} onBlurCommit />
      </div>
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => {
        const f = e.target.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = () => onChange(r.result);
        r.readAsDataURL(f);
      }} />
    </div>
  );
}

function StrokeSection({ n, update }) {
  const b = n.border || { w: 0, color: '#ffffff33', style: 'solid' };
  const set = (k, v, r) => update((d) => { d.border = { ...b, ...d.border, [k]: v }; }, r);
  return (
    <Section title="Border" icon="SquareDashed" defaultOpen={b.w > 0} right={<IconBtn icon={b.w ? 'Minus' : 'Plus'} size={12} title={b.w ? 'Remove' : 'Add'} onClick={() => set('w', b.w ? 0 : 1)} />}>
      {b.w > 0 ? (
        <>
          <ColorField value={b.color} onChange={(c) => set('color', c)} />
          <Row cols="1fr 1fr"><Num label="W" value={b.w} min={0} max={100} step={0.5} onChange={(v, r) => set('w', v, r)} /><Select value={b.style} onChange={(v) => set('style', v)} options={['solid', 'dashed', 'dotted', 'double']} /></Row>
        </>
      ) : <div className="hint">No stroke</div>}
    </Section>
  );
}

function EffectsSection({ n, update, setP }) {
  const sh = n.shadows || [];
  const setSh = (list, r) => update((d) => { d.shadows = list; }, r);
  const f = n.filters || {};
  const setF = (k, v, r) => update((d) => { d.filters = { ...(d.filters || {}), [k]: v }; }, r);
  return (
    <Section title="Shadow, blur & effects" icon="Sparkle" defaultOpen={sh.length > 0 || n.backdrop > 0 || n.blur > 0}>
      <div className="sub-h">Shadows <div className="grow" /><IconBtn icon="Plus" size={12} title="Add shadow" onClick={() => setSh([...sh, { x: 0, y: 8, blur: 24, spread: 0, color: '#00000066', inset: false }])} /></div>
      <div className="btnrow">{Object.keys(SHADOW_PRESETS).map((k) => <button type="button" key={k} className="chip" onClick={() => setSh(JSON.parse(JSON.stringify(SHADOW_PRESETS[k])))}>{k}</button>)}<button type="button" className="chip" onClick={() => setSh([])}>None</button></div>
      {sh.map((s, i) => (
        <div key={i} className="shadow-card">
          <Row cols="1fr auto auto">
            <ColorField value={s.color} onChange={(c) => setSh(sh.map((x, j) => (j === i ? { ...x, color: c } : x)))} />
            <IconBtn icon="SquareDot" size={12} title="Inner shadow" active={s.inset} onClick={() => setSh(sh.map((x, j) => (j === i ? { ...x, inset: !x.inset } : x)))} />
            <IconBtn icon="Trash2" size={12} title="Remove" onClick={() => setSh(sh.filter((_, j) => j !== i))} />
          </Row>
          <Row cols="1fr 1fr 1fr 1fr">{[['x', 'X'], ['y', 'Y'], ['blur', 'B'], ['spread', 'S']].map(([k, l]) => <Num key={k} label={l} value={s[k]} onChange={(v, r) => setSh(sh.map((x, j) => (j === i ? { ...x, [k]: v } : x)), r)} />)}</Row>
        </div>
      ))}
      <Slider label="Layer blur" value={n.blur || 0} max={100} suffix="px" onChange={(v, r) => setP('blur', v, r)} />
      <Slider label="Backdrop blur" value={n.backdrop || 0} max={100} suffix="px" onChange={(v, r) => setP('backdrop', v, r)} />
      <Row label="Blend"><Select value={n.blend || 'normal'} onChange={(v) => setP('blend', v)} options={BLENDS} /></Row>
      <div className="sub-h">Filters</div>
      <Slider label="Brightness" value={f.brightness ?? 100} max={200} suffix="%" onChange={(v, r) => setF('brightness', v, r)} />
      <Slider label="Contrast" value={f.contrast ?? 100} max={200} suffix="%" onChange={(v, r) => setF('contrast', v, r)} />
      <Slider label="Saturation" value={f.saturate ?? 100} max={300} suffix="%" onChange={(v, r) => setF('saturate', v, r)} />
      <Slider label="Hue" value={f.hue ?? 0} max={360} suffix="°" onChange={(v, r) => setF('hue', v, r)} />
      <Slider label="Grayscale" value={f.grayscale ?? 0} max={100} suffix="%" onChange={(v, r) => setF('grayscale', v, r)} />
    </Section>
  );
}

function TypographySection({ n, setP }) {
  return (
    <Section title="Text style" icon="Type">
      <Row><FontPicker value={n.font} onChange={(v) => setP('font', v)} /></Row>
      <Row cols="1fr 1fr"><Num label="Size" value={n.fs} min={1} max={800} onChange={(v, r) => setP('fs', v, r)} />{n.type === 'text' && <Select value={String(n.fw)} onChange={(v) => setP('fw', Number(v))} options={WEIGHTS.map((w) => [String(w), `${w} ${['Thin', 'ExtraLight', 'Light', 'Regular', 'Medium', 'SemiBold', 'Bold', 'ExtraBold', 'Black'][w / 100 - 1]}`])} />}</Row>
      {n.type === 'text' && <Row cols="1fr 1fr"><Num icon="ArrowUpDown" value={n.lh} step={0.05} min={0.5} max={4} onChange={(v, r) => setP('lh', v, r)} title="Line height" /><Num icon="ArrowLeftRight" value={n.ls} step={0.1} min={-20} max={50} onChange={(v, r) => setP('ls', v, r)} title="Letter spacing" /></Row>}
      <ColorField value={n.color} onChange={(c) => setP('color', c)} />
      {n.type === 'text' && (
        <>
          <Row cols="auto auto">
            <Seg small value={n.align} onChange={(v) => setP('align', v)} options={[['left', 'Left', 'AlignLeft'], ['center', 'Center', 'AlignCenter'], ['right', 'Right', 'AlignRight'], ['justify', 'Justify', 'AlignJustify']]} />
            <Seg small value={n.valign} onChange={(v) => setP('valign', v)} options={[['top', 'Top', 'ArrowUpToLine'], ['center', 'Middle', 'FoldVertical'], ['bottom', 'Bottom', 'ArrowDownToLine']]} />
          </Row>
          <Row cols="auto auto">
            <div className="btnrow">
              <IconBtn icon="Italic" active={n.italic} onClick={() => setP('italic', !n.italic)} title="Italic" />
              <IconBtn icon="Underline" active={n.deco === 'underline'} onClick={() => setP('deco', n.deco === 'underline' ? 'none' : 'underline')} title="Underline" />
              <IconBtn icon="Strikethrough" active={n.deco === 'line-through'} onClick={() => setP('deco', n.deco === 'line-through' ? 'none' : 'line-through')} title="Strike" />
            </div>
            <Seg small value={n.transform} onChange={(v) => setP('transform', v)} options={[['none', '—'], ['uppercase', 'AA'], ['lowercase', 'aa'], ['capitalize', 'Aa']]} />
          </Row>
          <Toggle label="Gradient text" checked={n.gradText} onChange={(v) => useStore.getState().updateSel((d) => { d.gradText = v; if (v && (d.fill.type === 'none' || d.fill.type === 'solid')) d.fill = { ...d.fill, type: 'linear', angle: 90, stops: d.fill.stops || [{ c: '#7c5cff', p: 0 }, { c: '#ff4fa3', p: 100 }] }; })} />
          <Row label="Shadow"><Select value={n.textShadow || ''} onChange={(v) => setP('textShadow', v)} options={[['', 'None'], ['0 2px 10px rgba(0,0,0,.4)', 'Soft'], ['0 0 8px #00e5ff, 0 0 24px #00e5ff', 'Neon cyan'], ['0 0 8px #ff00e5, 0 0 24px #ff00e5', 'Neon pink'], ['3px 3px 0 #000', 'Hard'], ['0 1px 0 #fff3', 'Emboss']]} /></Row>
          <Row label="Content"><TextIn value={n.text} multiline rows={3} onChange={(v) => setP('text', v)} onBlurCommit /></Row>
        </>
      )}
    </Section>
  );
}

function FontPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  React.useEffect(() => { loadFont(value); }, [value]);
  return (
    <div className="fontpick">
      <button type="button" className="fontbtn" onClick={() => setOpen(!open)} style={{ fontFamily: `'${value}'` }}>{value}<Icon n="ChevronDown" s={12} /></button>
      {open && (
        <div className="fontlist">
          <input autoFocus placeholder="Search fonts…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
          <div className="fl">
            {FONTS.filter((f) => f.toLowerCase().includes(q.toLowerCase())).map((f) => (
              <button type="button" key={f} className={f === value ? 'on' : ''} onMouseEnter={() => loadFont(f)} onClick={() => { onChange(f); setOpen(false); }} style={{ fontFamily: `'${f}'` }}>{f}</button>
            ))}
            {q && !FONTS.some((f) => f.toLowerCase() === q.toLowerCase()) && <button type="button" onClick={() => { onChange(q); setOpen(false); }}>Use Google font “{q}”</button>}
          </div>
        </div>
      )}
    </div>
  );
}

const loaded = new Set(['Inter', 'JetBrains Mono']);
export function loadFont(f) {
  if (!f || loaded.has(f)) return;
  loaded.add(f);
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f).replace(/%20/g, '+')}:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap`;
  document.head.appendChild(l);
}

// ---------- type specific ----------
function TypeSection({ n, setP, update }) {
  const S = useStore.getState;
  switch (n.type) {
    case 'icon':
      return (
        <Section title="Icon" icon="Smile">
          <Row cols="auto 1fr"><div className="icon-prev"><LucideIcon name={n.icon} size={28} color={n.color} stroke={n.stroke} /></div><button type="button" className="btn sm" onClick={() => S().set({ leftTab: 'icons' })}><Icon n="Search" s={13} /> Swap icon ({n.icon})</button></Row>
          <ColorField value={n.color} onChange={(c) => setP('color', c)} />
          <Slider label="Stroke" value={n.stroke} min={0.5} max={4} step={0.25} onChange={(v, r) => setP('stroke', v, r)} />
          <Row label="Size"><div className="btnrow">{[16, 20, 24, 32, 48, 64, 96].map((s) => <button type="button" key={s} className="chip" onClick={() => update((d) => { d.w = s; d.h = s; })}>{s}</button>)}</div></Row>
        </Section>
      );
    case 'image':
      return (
        <Section title="Image" icon="Image">
          <ImagePicker value={n.src} onChange={(v) => setP('src', v)} />
          <Row label="Fit"><Seg small value={n.fit} onChange={(v) => setP('fit', v)} options={['cover', 'contain', 'fill', 'none']} /></Row>
          <Row label="Alt text"><TextIn value={n.alt || ''} placeholder="Describe the image" onChange={(v) => setP('alt', v)} onBlurCommit /></Row>
        </Section>
      );
    case 'video':
      return (
        <Section title="Video" icon="Video">
          <Row label="URL"><TextIn value={n.src} onChange={(v) => setP('src', v)} onBlurCommit placeholder="https://…mp4" /></Row>
          <Toggle label="Autoplay" checked={n.autoplay} onChange={(v) => setP('autoplay', v)} />
          <Toggle label="Loop" checked={n.loopVideo} onChange={(v) => setP('loopVideo', v)} />
          <Toggle label="Muted" checked={n.muted} onChange={(v) => setP('muted', v)} />
        </Section>
      );
    case 'input':
      return (
        <Section title="Input" icon="TextCursorInput">
          <Row label="Placeholder"><TextIn value={n.placeholder} onChange={(v) => setP('placeholder', v)} /></Row>
          <Row label="Type"><Select value={n.inputType} onChange={(v) => setP('inputType', v)} options={['text', 'email', 'password', 'number', 'search', 'tel', 'url', 'date', 'time', 'color', 'textarea']} /></Row>
          <Row label="Padding"><Num value={n.padX ?? 14} min={0} onChange={(v, r) => setP('padX', v, r)} suffix="px" /></Row>
        </Section>
      );
    case 'toggle':
    case 'checkbox':
      return (
        <Section title={n.type === 'toggle' ? 'Toggle' : 'Checkbox'} icon="ToggleRight">
          <Toggle label="Checked" checked={n.checked} onChange={(v) => setP('checked', v)} />
          <ColorField value={n.color} onChange={(c) => setP('color', c)} label="On" />
          {n.type === 'toggle' && <ColorField value={n.offColor} onChange={(c) => setP('offColor', c)} label="Off" />}
        </Section>
      );
    case 'slider':
    case 'progress':
      return (
        <Section title={n.type === 'slider' ? 'Slider' : 'Progress'} icon="SlidersHorizontal">
          <Slider label="Value" value={n.value} max={100} suffix="%" onChange={(v, r) => setP('value', v, r)} />
          <ColorField value={n.color} onChange={(c) => setP('color', c)} label="Bar" />
          {n.type === 'progress' && <ColorField value={n.color2 || n.color} onChange={(c) => setP('color2', c)} label="Bar end" />}
          <ColorField value={n.track} onChange={(c) => setP('track', c)} label="Track" />
          {n.type === 'progress' && <Toggle label="Ring style" checked={n.ring} onChange={(v) => update((d) => { d.ring = v; if (v) { d.w = 120; d.h = 120; } else { d.w = 220; d.h = 8; } })} />}
        </Section>
      );
    case 'chart':
      return (
        <Section title="Chart" icon="ChartColumn">
          <Row label="Type"><Select value={n.kind} onChange={(v) => setP('kind', v)} options={['bar', 'line', 'area', 'sparkline', 'donut', 'pie']} /></Row>
          <Row label="Data"><TextIn value={(n.data || []).join(', ')} onChange={(v) => setP('data', v.split(/[,\s]+/).map(Number).filter((x) => !Number.isNaN(x)))} onBlurCommit placeholder="10, 20, 30" /></Row>
          <div className="btnrow"><button type="button" className="chip" onClick={() => setP('data', Array.from({ length: 7 + Math.floor(Math.random() * 6) }, () => Math.round(20 + Math.random() * 80)))}><Icon n="Shuffle" s={12} /> Random data</button></div>
          <ColorField value={n.color} onChange={(c) => setP('color', c)} label="Primary" />
          <ColorField value={n.color2} onChange={(c) => setP('color2', c)} label="Secondary" />
          <Toggle label="Grid lines" checked={n.grid} onChange={(v) => setP('grid', v)} />
          <Toggle label="Smooth curve" checked={n.smooth} onChange={(v) => setP('smooth', v)} />
        </Section>
      );
    case 'three':
      return (
        <Section title="3D object" icon="Box">
          <div className="shape-grid">
            {SHAPES.map((s) => <button type="button" key={s} className={n.shape === s ? 'on' : ''} onClick={() => setP('shape', s)}>{s}</button>)}
          </div>
          <Row label="Material"><Select value={n.material} onChange={(v) => setP('material', v)} options={MATERIALS} /></Row>
          <ColorField value={n.color} onChange={(c) => setP('color', c)} label="Colour" />
          <ColorField value={n.color2} onChange={(c) => setP('color2', c)} label="Accent light" />
          <Slider label="Metalness" value={n.metalness} max={1} step={0.01} onChange={(v, r) => setP('metalness', v, r)} />
          <Slider label="Roughness" value={n.roughness} max={1} step={0.01} onChange={(v, r) => setP('roughness', v, r)} />
          <Slider label="Distort" value={n.distort} max={1.5} step={0.01} onChange={(v, r) => setP('distort', v, r)} />
          <Slider label="Speed" value={n.speed} max={10} step={0.1} onChange={(v, r) => setP('speed', v, r)} />
          <Slider label="Scale" value={n.scale} min={0.2} max={3} step={0.05} onChange={(v, r) => setP('scale', v, r)} />
          <Slider label="Light" value={n.light} max={4} step={0.05} onChange={(v, r) => setP('light', v, r)} />
          {n.shape === 'cubes' && <Slider label="Count" value={n.count} min={1} max={60} onChange={(v, r) => setP('count', v, r)} />}
          <Row label="Lighting"><Seg small value={n.env} onChange={(v) => setP('env', v)} options={ENVS} /></Row>
          <div className="btnrow">
            <Toggle label="Auto-rotate" checked={n.autoRotate} onChange={(v) => setP('autoRotate', v)} />
            <Toggle label="Float" checked={n.float} onChange={(v) => setP('float', v)} />
            <Toggle label="Wireframe" checked={n.wireframe} onChange={(v) => setP('wireframe', v)} />
            <Toggle label="Shadow" checked={n.shadow} onChange={(v) => setP('shadow', v)} />
          </div>
          <div className="hint">In Preview you can drag to orbit the object.</div>
        </Section>
      );
    case 'code':
      return (
        <Section title="Custom code" icon="Code">
          <div className="sub-h">HTML (scripts allowed)</div>
          <TextIn value={n.html} multiline mono rows={6} onChange={(v) => setP('html', v)} onBlurCommit />
          <div className="sub-h">CSS</div>
          <TextIn value={n.css} multiline mono rows={6} onChange={(v) => setP('css', v)} onBlurCommit />
        </Section>
      );
    default:
      return null;
  }
}

function InteractionFields({ n, setDeep, setP }) {
  const pages = useStore((s) => s.project.pages);
  const a = n.action || { type: 'none' };
  return (
    <>
      <Row label="On click"><Select value={a.type} onChange={(v) => setDeep('action', 'type', v)} options={[['none', 'Nothing'], ['page', 'Go to page'], ['back', 'Go back'], ['url', 'Open link'], ['scroll', 'Scroll to top'], ['alert', 'Show message']]} /></Row>
      {a.type === 'page' && <Row label="Page"><Select value={a.target || ''} onChange={(v) => setDeep('action', 'target', v)} options={[['', 'Choose…'], ...pages.map((p) => [p.id, p.name])]} /></Row>}
      {a.type === 'url' && <Row label="URL"><TextIn value={a.target} placeholder="https://" onChange={(v) => setDeep('action', 'target', v)} onBlurCommit /></Row>}
      {a.type === 'alert' && <Row label="Message"><TextIn value={a.target} onChange={(v) => setDeep('action', 'target', v)} onBlurCommit /></Row>}
      <Row label="Cursor"><Select value={n.cursor || 'auto'} onChange={(v) => setP('cursor', v)} options={CURSORS} /></Row>
    </>
  );
}

// ================= MOTION =================
function MotionProps({ nodes }) {
  const { n, setDeep } = useEdit(nodes);
  const a = n.anim || {};
  const S = useStore.getState;
  const replay = () => S().set((s) => ({ playKey: s.playKey + 1 }));
  return (
    <>
      <div className="insp-head"><span className="tag"><Icon n="Sparkles" s={12} /> Motion</span><b>{nodes.length > 1 ? `${nodes.length} layers` : n.name}</b><div className="grow" /><button type="button" className="btn sm" onClick={replay}><Icon n="Play" s={12} /> Play</button></div>
      <Section title="When it appears" icon="LogIn">
        <div className="fx-grid">
          {ENTER_ANIMS.map((k) => <button type="button" key={k} className={a.enter === k ? 'on' : ''} onClick={() => { setDeep('anim', 'enter', k); setTimeout(replay, 30); }}>{k}</button>)}
        </div>
        {a.enter !== 'none' && (
          <>
            <Slider label="Duration" value={a.dur ?? 600} min={100} max={4000} step={50} suffix="ms" onChange={(v, r) => setDeep('anim', 'dur', v, r)} />
            <Slider label="Delay" value={a.delay ?? 0} min={0} max={4000} step={50} suffix="ms" onChange={(v, r) => setDeep('anim', 'delay', v, r)} />
            <Row label="Easing"><Select value={a.ease || 'smooth'} onChange={(v) => setDeep('anim', 'ease', v)} options={Object.keys(EASINGS)} /></Row>
          </>
        )}
      </Section>
      <Section title="When the mouse is over it" icon="MousePointer2">
        <div className="fx-grid">{HOVER_FX.map((k) => <button type="button" key={k} className={a.hover === k ? 'on' : ''} onClick={() => setDeep('anim', 'hover', k)}>{k}</button>)}</div>
        <div className="hint">Hover the layer on the canvas or in Preview to try it.</div>
      </Section>
      <Section title="Keeps moving (loop)" icon="Repeat">
        <div className="fx-grid">{LOOP_FX.map((k) => <button type="button" key={k} className={a.loop === k ? 'on' : ''} onClick={() => setDeep('anim', 'loop', k)}>{k}</button>)}</div>
        {a.loop !== 'none' && <Slider label="Cycle" value={a.loopDur ?? 3000} min={200} max={20000} step={100} suffix="ms" onChange={(v, r) => setDeep('anim', 'loopDur', v, r)} />}
      </Section>
      <Section title="Animate items one after another" icon="ListOrdered" defaultOpen={false}>
        <div className="hint">Give every child of the selected frame the same entrance, each one a little later.</div>
        <div className="btnrow">
          {['up', 'fade', 'zoom', 'blur', 'left'].map((k) => (
            <button type="button" key={k} className="chip" onClick={() => {
              S().updateSel((d) => { (d.children || []).forEach((c, i) => { c.anim = { ...c.anim, enter: k, delay: i * 80, dur: 600 }; }); });
              setTimeout(replay, 30);
            }}>{k}</button>
          ))}
        </div>
      </Section>
    </>
  );
}
