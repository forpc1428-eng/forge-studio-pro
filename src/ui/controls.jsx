import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LucideIcon } from '../components/NodeView.jsx';
import { SWATCHES } from '../lib/constants.js';
import { useStore } from '../store.js';

export const Icon = ({ n, s = 16, ...p }) => <LucideIcon name={n} size={s} {...p} />;

export function IconBtn({ icon, title, onClick, active, size = 16, className = '', disabled, danger }) {
  return (
    <button type="button" className={`ibtn ${active ? 'on' : ''} ${danger ? 'danger' : ''} ${className}`} title={title} aria-label={title} onClick={onClick} disabled={disabled}>
      <Icon n={icon} s={size} />
    </button>
  );
}

export function Section({ title, children, right, defaultOpen = true, icon }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`sec ${open ? 'open' : ''}`}>
      <div className="sec-h" onClick={() => setOpen(!open)}>
        <Icon n="ChevronRight" s={12} className="chev" />
        {icon && <Icon n={icon} s={13} />}
        <span>{title}</span>
        <div className="grow" />
        <div onClick={(e) => e.stopPropagation()} className="sec-r">{right}</div>
      </div>
      {open && <div className="sec-b">{children}</div>}
    </div>
  );
}

export function Row({ children, cols, label }) {
  return (
    <div className="frow">
      {label && <label className="flabel">{label}</label>}
      <div className="fcols" style={cols ? { gridTemplateColumns: cols } : undefined}>{children}</div>
    </div>
  );
}

// Number field with drag-to-scrub label
export function Num({ label, value, onChange, min = -99999, max = 99999, step = 1, suffix, title, icon, onStart, onEnd, disabled }) {
  const [draft, setDraft] = useState(null);
  const begin = useStore((s) => s.begin);
  const commit = useStore((s) => s.commit);
  const v = value === undefined || value === null || Number.isNaN(value) ? '' : value;
  const clamp = (x) => Math.min(max, Math.max(min, x));
  const round = (x) => (step < 1 ? Math.round(x / step) * step : Math.round(x));
  const scrub = (e) => {
    if (disabled) return;
    e.preventDefault();
    const sx = e.clientX;
    const start = Number(value) || 0;
    begin(); onStart?.();
    const move = (ev) => {
      const mult = ev.shiftKey ? 10 : ev.altKey ? 0.1 : 1;
      onChange(+clamp(round(start + (ev.clientX - sx) * step * mult)).toFixed(step < 1 ? 2 : 0), false);
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); commit(); onEnd?.(); document.body.style.cursor = ''; };
    document.body.style.cursor = 'ew-resize';
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  const apply = () => {
    if (draft === null) return;
    let x;
    try { x = Function(`"use strict";return (${draft || 0})`)(); } catch { x = Number(draft); }
    if (!Number.isNaN(Number(x))) onChange(clamp(+(+x).toFixed(2)));
    setDraft(null);
  };
  return (
    <div className={`num ${disabled ? 'dis' : ''}`} title={title}>
      <span className="num-l" onPointerDown={scrub}>{icon ? <Icon n={icon} s={12} /> : label}</span>
      <input
        value={draft ?? (typeof v === 'number' ? +v.toFixed(2) : v)}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={apply}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') { apply(); e.target.blur(); }
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            onChange(clamp(round((Number(value) || 0) + (e.key === 'ArrowUp' ? 1 : -1) * step * (e.shiftKey ? 10 : 1))));
          }
        }}
      />
      {suffix && <span className="num-s">{suffix}</span>}
    </div>
  );
}

export function Slider({ value, onChange, min = 0, max = 100, step = 1, label, suffix = '' }) {
  const begin = useStore((s) => s.begin);
  const commit = useStore((s) => s.commit);
  return (
    <div className="slider">
      {label && <span className="slider-l">{label}</span>}
      <input type="range" min={min} max={max} step={step} value={value ?? 0}
        onPointerDown={begin} onPointerUp={commit}
        onChange={(e) => onChange(Number(e.target.value), false)}
        style={{ '--p': `${((value - min) / (max - min)) * 100}%` }} />
      <span className="slider-v">{typeof value === 'number' ? +value.toFixed(2) : value}{suffix}</span>
    </div>
  );
}

export function Select({ value, onChange, options, style, className = '' }) {
  return (
    <div className={`select ${className}`} style={style}>
      <select value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => e.stopPropagation()}>
        {options.map((o) => {
          const [v, l] = Array.isArray(o) ? o : [o, o];
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
      <Icon n="ChevronDown" s={12} />
    </div>
  );
}

export function Seg({ value, onChange, options, small }) {
  return (
    <div className={`seg ${small ? 'sm' : ''}`}>
      {options.map((o) => {
        const [v, l, ic] = Array.isArray(o) ? o : [o, o];
        return (
          <button type="button" key={v} className={value === v ? 'on' : ''} onClick={() => onChange(v)} title={typeof l === 'string' ? l : v}>
            {ic ? <Icon n={ic} s={14} /> : l}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <label className="tgl">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="tgl-t"><span /></span>
      {label && <span className="tgl-l">{label}</span>}
    </label>
  );
}

export function TextIn({ value, onChange, placeholder, multiline, mono, rows = 4, onBlurCommit }) {
  const [d, setD] = useState(value ?? '');
  useEffect(() => setD(value ?? ''), [value]);
  const P = {
    value: d, placeholder, spellCheck: false,
    className: `tin ${mono ? 'mono' : ''}`,
    onChange: (e) => { setD(e.target.value); if (!onBlurCommit) onChange(e.target.value); },
    onBlur: () => { if (onBlurCommit && d !== value) onChange(d); },
    onKeyDown: (e) => { e.stopPropagation(); if (!multiline && e.key === 'Enter') e.currentTarget.blur(); },
  };
  return multiline ? <textarea rows={rows} {...P} /> : <input {...P} />;
}

// ---------- colour ----------
const hex8 = (c) => {
  if (!c || c === 'transparent') return { hex: '#000000', a: 0 };
  if (c.startsWith('#')) {
    let h = c.slice(1);
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    if (h.length === 6) return { hex: '#' + h, a: 1 };
    if (h.length === 8) return { hex: '#' + h.slice(0, 6), a: parseInt(h.slice(6), 16) / 255 };
  }
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b, a = 1] = m[1].split(',').map((x) => parseFloat(x));
    return { hex: '#' + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join(''), a: +a };
  }
  return { hex: '#000000', a: 1 };
};
export const withAlpha = (hex, a) => (a >= 1 ? hex : hex + Math.round(a * 255).toString(16).padStart(2, '0'));

export function ColorField({ value, onChange, label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { hex, a } = hex8(value);
  const [txt, setTxt] = useState(hex);
  useEffect(() => setTxt(hex), [hex]);
  return (
    <div className="color" ref={ref}>
      <button type="button" className="sw" onClick={() => setOpen(!open)} style={{ '--c': value }} title="Pick colour"><span /></button>
      <input className="hex" value={txt.replace('#', '').toUpperCase()} onChange={(e) => setTxt('#' + e.target.value)}
        onBlur={() => { if (/^#[0-9a-f]{6}$/i.test(txt)) onChange(withAlpha(txt.toLowerCase(), a)); else setTxt(hex); }}
        onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') e.currentTarget.blur(); }} />
      <input className="alpha" value={Math.round(a * 100)} onChange={(e) => onChange(withAlpha(hex, Math.max(0, Math.min(100, Number(e.target.value) || 0)) / 100))} onKeyDown={(e) => e.stopPropagation()} />
      <span className="pct">%</span>
      {label && <span className="clabel">{label}</span>}
      {open && <ColorPop anchor={ref.current} hex={hex} a={a} onChange={onChange} onClose={() => setOpen(false)} />}
    </div>
  );
}

function ColorPop({ anchor, hex, a, onChange, onClose }) {
  const r = anchor?.getBoundingClientRect() || { left: 0, bottom: 0 };
  const recent = useStore((s) => s.recentColors || []);
  const set = useStore((s) => s.set);
  const pick = (c) => { onChange(c); set((s) => ({ recentColors: [c, ...(s.recentColors || []).filter((x) => x !== c)].slice(0, 18) })); };
  useEffect(() => {
    const f = (e) => { if (!e.target.closest('.cpop') && !e.target.closest('.color')) onClose(); };
    setTimeout(() => window.addEventListener('pointerdown', f), 0);
    return () => window.removeEventListener('pointerdown', f);
  }, [onClose]);
  const top = Math.min(window.innerHeight - 330, r.bottom + 6);
  return createPortal(
    <div className="cpop" style={{ left: Math.min(window.innerWidth - 250, r.left), top }}>
      <input type="color" value={hex} onChange={(e) => onChange(withAlpha(e.target.value, a))} className="cnative" />
      <div className="calpha">
        <span>Opacity</span>
        <input type="range" min="0" max="100" value={Math.round(a * 100)} onChange={(e) => onChange(withAlpha(hex, e.target.value / 100))} style={{ '--c': hex }} />
      </div>
      <div className="cgrid">
        {SWATCHES.map((c) => <button type="button" key={c} style={{ background: c }} onClick={() => pick(c)} title={c} />)}
        <button type="button" className="ctrans" onClick={() => onChange('transparent')} title="Transparent" />
      </div>
      {recent.length > 0 && <><div className="csub">Recent</div><div className="cgrid">{recent.map((c) => <button type="button" key={c} style={{ background: c }} onClick={() => onChange(c)} />)}</div></>}
      <button type="button" className="btn sm ghost wfull" onClick={async () => {
        if (!window.EyeDropper) return useStore.getState().toast('Eyedropper needs Chrome or Edge', 'warn');
        try { const res = await new window.EyeDropper().open(); pick(res.sRGBHex); } catch { /* cancelled */ }
      }}><Icon n="Pipette" s={14} /> Eyedropper</button>
    </div>,
    document.body,
  );
}

export function Menu({ x, y, items, onClose }) {
  useEffect(() => {
    const f = (e) => { if (!e.target.closest('.menu')) onClose(); };
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    setTimeout(() => { window.addEventListener('pointerdown', f); window.addEventListener('keydown', k); }, 0);
    return () => { window.removeEventListener('pointerdown', f); window.removeEventListener('keydown', k); };
  }, [onClose]);
  const left = Math.min(x, window.innerWidth - 230);
  const top = Math.min(y, window.innerHeight - items.length * 30 - 20);
  return createPortal(
    <div className="menu" style={{ left, top }}>
      {items.map((it, i) => (it === '-' ? <div key={i} className="msep" /> : (
        <button type="button" key={i} className={`mi ${it.danger ? 'danger' : ''}`} disabled={it.disabled} onClick={() => { onClose(); it.run(); }}>
          {it.icon && <Icon n={it.icon} s={14} />}<span>{it.label}</span>{it.kbd && <kbd>{it.kbd}</kbd>}
        </button>
      )))}
    </div>,
    document.body,
  );
}

export function Modal({ title, onClose, children, wide, icon, footer, className = '' }) {
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return createPortal(
    <div className="modal-bg" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal ${wide ? 'wide' : ''} ${className}`}>
        <div className="modal-h">
          {icon && <span className="modal-ic"><Icon n={icon} s={16} /></span>}
          <h3>{title}</h3>
          <div className="grow" />
          <IconBtn icon="X" title="Close" onClick={onClose} />
        </div>
        <div className="modal-b">{children}</div>
        {footer && <div className="modal-f">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
