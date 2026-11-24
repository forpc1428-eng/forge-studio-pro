import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { usePrefs, setPref, setBg, applyPreset, resetPrefs, BG_MODES, BG_PRESETS } from '../lib/uiPrefs.js';
import { BackgroundLayers } from './AppBackground.jsx';
import { Icon, IconBtn, Seg, ColorField, Toggle } from '../ui/controls.jsx';

// Plain range input with a live value (no undo history — these are device preferences, not design edits)
function Range({ label, value, min, max, step = 1, suffix = '', onChange }) {
  return (
    <div className="slider">
      <span className="slider-l">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ '--p': `${((value - min) / (max - min)) * 100}%` }} />
      <span className="slider-v">{+(+value).toFixed(2)}{suffix}</span>
    </div>
  );
}

const USES_COLORS = new Set(['liquid', 'bubbles', 'aurora', 'flow', 'gradient', 'radial', 'mesh']);
const MOVING = new Set(['liquid', 'bubbles', 'aurora', 'flow']);

export default function InterfaceSettings({ onClose }) {
  const p = usePrefs();
  const b = p.bg;
  const fileRef = useRef(null);
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  const setColor = (i, c) => setBg({ colors: b.colors.map((x, j) => (j === i ? c : x)) });

  return createPortal(
    <aside className="uiset" role="dialog" aria-label="Interface settings">
      <div className="uiset-h">
        <span className="modal-ic"><Icon n="Palette" s={16} /></span>
        <h3>Interface settings</h3>
        <div className="grow" />
        <IconBtn icon="X" title="Close (Esc)" onClick={onClose} />
      </div>

      <div className="uiset-b">
        <div className="uiset-sec">
          <div className="uiset-t">Look</div>
          <Seg value={p.ui} onChange={(v) => setPref('ui', v)} options={[['glass', 'Liquid Glass'], ['classic', 'Classic dark']]} />
          {p.ui !== 'glass' && <div className="hint">Backgrounds show with the Liquid Glass look. Switch it on to see them.</div>}
        </div>

        <div className="uiset-sec">
          <div className="uiset-t">Quick presets</div>
          <div className="bg-presets">
            {Object.entries(BG_PRESETS).map(([name, pr]) => (
              <button type="button" key={name} className="bg-card" onClick={() => applyPreset(name)} title={`Apply ${name}`}>
                <span className="bg-prev"><BackgroundLayers b={pr.bg} mini /></span>
                <span className="bg-name"><i style={{ background: pr.accent }} />{name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="uiset-sec">
          <div className="uiset-t">Background style</div>
          <div className="bg-modes">
            {BG_MODES.map(([k, label, ic]) => (
              <button type="button" key={k} className={`bg-card ${b.mode === k ? 'on' : ''}`} onClick={() => setBg({ mode: k })}>
                <span className="bg-prev"><BackgroundLayers b={{ ...b, mode: k }} mini /></span>
                <span className="bg-name"><Icon n={ic} s={12} />{label}{MOVING.has(k) && <em>moving</em>}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="uiset-sec">
          <div className="uiset-t">Colours</div>
          <div className="frow"><label className="flabel">Base colour</label><ColorField value={b.color} onChange={(c) => setBg({ color: c })} /></div>
          {USES_COLORS.has(b.mode) && (
            <>
              <label className="flabel">{b.mode === 'liquid' || b.mode === 'bubbles' ? 'Blob / bubble colours' : 'Gradient colours'}</label>
              {b.colors.map((c, i) => (
                <div className="fcols" key={i} style={{ gridTemplateColumns: '1fr auto' }}>
                  <ColorField value={c} onChange={(v) => setColor(i, v)} />
                  <IconBtn icon="Minus" size={12} title="Remove colour" disabled={b.colors.length <= 1} onClick={() => setBg({ colors: b.colors.filter((_, j) => j !== i) })} />
                </div>
              ))}
              {b.colors.length < 6 && <button type="button" className="btn sm ghost" onClick={() => setBg({ colors: [...b.colors, '#ffffff'] })}><Icon n="Plus" s={13} /> Add colour</button>}
            </>
          )}
          {(b.mode === 'gradient' || b.mode === 'flow') && <Range label="Angle" value={b.angle} min={0} max={360} suffix="°" onChange={(v) => setBg({ angle: v })} />}
        </div>

        {b.mode === 'image' && (
          <div className="uiset-sec">
            <div className="uiset-t">Image</div>
            <div className="btnrow">
              <button type="button" className="btn sm" onClick={() => fileRef.current.click()}><Icon n="Upload" s={13} /> Upload image</button>
              {b.image && <button type="button" className="btn sm ghost" onClick={() => setBg({ image: '' })}><Icon n="X" s={13} /> Remove</button>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => {
              const f = e.target.files[0];
              if (!f) return;
              const r = new FileReader();
              r.onload = () => setBg({ image: r.result });
              r.readAsDataURL(f);
            }} />
            <Range label="Darken" value={b.dim} min={0} max={0.9} step={0.05} onChange={(v) => setBg({ dim: v })} />
            {!b.image && <div className="hint">Pick a photo or wallpaper from your PC.</div>}
          </div>
        )}

        {(b.mode === 'liquid' || b.mode === 'bubbles' || b.mode === 'aurora') && (
          <div className="uiset-sec">
            <div className="uiset-t">Shapes</div>
            {b.mode !== 'aurora' && <Range label={b.mode === 'bubbles' ? 'How many' : 'Blobs'} value={b.count} min={1} max={b.mode === 'bubbles' ? 24 : 6} onChange={(v) => setBg({ count: v })} />}
            {b.mode !== 'aurora' && <Range label="Size" value={b.size} min={8} max={80} suffix="%" onChange={(v) => setBg({ size: v })} />}
            <Range label="Strength" value={b.opacity} min={0.1} max={1} step={0.05} onChange={(v) => setBg({ opacity: v })} />
          </div>
        )}

        <div className="uiset-sec">
          <div className="uiset-t">Motion</div>
          <Toggle label="Moving background" checked={p.motion === 'on'} onChange={(v) => setPref('motion', v ? 'on' : 'off')} />
          {MOVING.has(b.mode) && <Range label="Speed" value={b.speed} min={0.2} max={4} step={0.1} suffix="×" onChange={(v) => setBg({ speed: v })} />}
          {!MOVING.has(b.mode) && <div className="hint">This style is still. Pick Liquid blobs, Many bubbles, Aurora or Moving gradient for motion.</div>}
        </div>

        <div className="uiset-sec">
          <div className="uiset-t">Glass panels</div>
          <div className="frow"><label className="flabel">Glass tint</label><ColorField value={p.tint} onChange={(c) => setPref('tint', c)} /></div>
          <Range label="Transparency" value={Math.round((1 - p.panelOpacity) * 100)} min={5} max={85} suffix="%" onChange={(v) => setPref('panelOpacity', 1 - v / 100)} />
          <Range label="Frost blur" value={p.panelBlur} min={0} max={48} suffix="px" onChange={(v) => setPref('panelBlur', v)} />
          <div className="frow"><label className="flabel">Accent colour (buttons, selection)</label><ColorField value={p.accent} onChange={(c) => setPref('accent', c)} /></div>
        </div>

        <button type="button" className="btn ghost wfull" onClick={resetPrefs}><Icon n="RotateCcw" s={14} /> Reset to default</button>
        <div className="hint" style={{ textAlign: 'center', marginTop: 6 }}>Saved on this device. Your designs are not affected.</div>
      </div>
    </aside>,
    document.body,
  );
}
