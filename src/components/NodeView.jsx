import React, { Suspense, lazy, memo, useEffect, useRef } from 'react';
import { icons } from 'lucide-react';
import { nodeStyle, motionClasses, fillCSS } from '../lib/style.js';

const ThreeScene = lazy(() => import('./ThreeScene.jsx'));

export function LucideIcon({ name, size = 24, color = 'currentColor', stroke = 2, style }) {
  const Cmp = icons[name] || icons.CircleHelp || icons.Circle;
  return <Cmp size={size} color={color} strokeWidth={stroke} style={style} />;
}

export function ChartSVG({ n }) {
  const w = n.w || 300, h = n.h || 160;
  const data = (n.data || []).map(Number).filter((x) => !Number.isNaN(x));
  const max = Math.max(1, ...data);
  const id = `g${n.id}`;
  if (n.kind === 'donut' || n.kind === 'pie') {
    const total = data.reduce((a, b) => a + b, 0) || 1;
    const palette = [n.color, n.color2, '#00c6ff', '#22c55e', '#eab308', '#ef4444', '#a855f7'];
    let acc = 0;
    const pie = n.kind === 'pie';
    const r = pie ? 25 : 40, c = 2 * Math.PI * r;
    return (
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        {data.map((v, i) => {
          const len = (v / total) * c;
          const el = (
            <circle key={i} cx="50" cy="50" r={r} fill="none" stroke={palette[i % palette.length]} strokeWidth={pie ? 50 : 14}
              strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-acc} transform="rotate(-90 50 50)" />
          );
          acc += len;
          return el;
        })}
        {n.kind === 'donut' && <text x="50" y="55" textAnchor="middle" fontSize="14" fontWeight="800" fill={n.textColor || '#ffffff'} fontFamily="Inter">{Math.round((data[0] / total) * 100)}%</text>}
      </svg>
    );
  }
  const padB = n.kind === 'sparkline' ? 2 : 6;
  const stepX = data.length > 1 ? w / (data.length - 1) : w;
  const pts = data.map((v, i) => [i * stepX, h - padB - (v / max) * (h - padB * 2 - 4)]);
  const path = (smooth) => pts.reduce((acc, [x, y], i) => {
    if (i === 0) return `M${x},${y}`;
    if (!smooth) return `${acc} L${x},${y}`;
    const [px, py] = pts[i - 1];
    const cx = (px + x) / 2;
    return `${acc} C${cx},${py} ${cx},${y} ${x},${y}`;
  }, '');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={n.color} stopOpacity=".55" /><stop offset="1" stopColor={n.color} stopOpacity="0" /></linearGradient>
        <linearGradient id={id + 'b'} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={n.color2 || n.color} /><stop offset="1" stopColor={n.color} /></linearGradient>
      </defs>
      {n.grid && [0.25, 0.5, 0.75].map((g) => <line key={g} x1="0" x2={w} y1={h * g} y2={h * g} stroke={n.gridColor || '#ffffff18'} strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />)}
      {n.kind === 'bar' && data.map((v, i) => {
        const bw = (w / data.length) * 0.6;
        const bh = (v / max) * (h - 8);
        return <rect key={i} x={(w / data.length) * i + (w / data.length - bw) / 2} y={h - bh} width={bw} height={bh} rx={Math.min(8, bw / 3)} fill={`url(#${id}b)`} />;
      })}
      {(n.kind === 'area') && <path d={`${path(n.smooth)} L${w},${h} L0,${h} Z`} fill={`url(#${id})`} />}
      {['line', 'area', 'sparkline'].includes(n.kind) && <path d={path(n.smooth)} fill="none" stroke={n.color} strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}

function ToggleView({ n }) {
  return (
    <div style={{ width: '100%', height: '100%', borderRadius: 999, background: n.checked ? n.color : n.offColor, position: 'relative', transition: 'background .25s' }}>
      <div style={{ position: 'absolute', top: 3, left: n.checked ? `calc(100% - ${n.h - 3}px)` : 3, width: n.h - 6, height: n.h - 6, borderRadius: 99, background: '#fff', boxShadow: '0 2px 6px #0004', transition: 'left .25s cubic-bezier(.34,1.56,.64,1)' }} />
    </div>
  );
}

function CodeView({ n, interactive }) {
  const doc = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=JetBrains+Mono&display=swap"><style>html,body{margin:0;height:100%;background:transparent;overflow:hidden}${n.css || ''}</style></head><body>${n.html || ''}</body></html>`;
  return <iframe title={n.name} srcDoc={doc} sandbox="allow-scripts" style={{ width: '100%', height: '100%', border: 0, display: 'block', pointerEvents: interactive ? 'auto' : 'none', background: 'transparent' }} />;
}

function TextContent({ n, editing, onCommit }) {
  const ref = useRef(null);
  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      const r = document.createRange();
      r.selectNodeContents(ref.current);
      const s = window.getSelection();
      s.removeAllRanges();
      s.addRange(r);
    }
  }, [editing]);
  if (!editing) return n.text;
  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      style={{ outline: 'none', cursor: 'text', minWidth: 4 }}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape' || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) e.currentTarget.blur();
      }}
      onBlur={(e) => onCommit(e.currentTarget.innerText.replace(/\n$/, ''))}
    >{n.text}</div>
  );
}

/**
 * mode: 'edit' | 'preview' | 'thumb'
 */
export const NodeView = memo(function NodeView({ n, parent, mode, editingId, onTextCommit, onAction, playKey, explode, depth = 0 }) {
  if (!n.visible) return null;
  const s = nodeStyle(n, parent);
  if (explode) { s.transformStyle = 'preserve-3d'; s.transform = `${s.transform || ''} translateZ(${depth === 0 ? 24 : 34}px)`; s.overflow = 'visible'; s.outline = '1px solid #7c5cff55'; }
  const cls = motionClasses(n, { enter: mode !== 'thumb' });
  const exp = mode === 'export';
  const interactive = mode === 'preview' || exp;
  const act = n.action && n.action.type !== 'none' ? n.action : null;
  const props = {
    style: s,
    className: cls || undefined,
    'data-nid': mode === 'edit' ? n.id : undefined,
    'data-x': exp ? slug(n.name) : undefined,
    'data-act': exp && act ? act.type : undefined,
    'data-target': exp && act ? act.target || '' : undefined,
    onClick: mode === 'preview' && act ? (e) => { e.stopPropagation(); onAction?.(act); } : undefined,
  };
  const key = mode !== 'thumb' ? `${n.id}-${playKey || 0}` : n.id;
  let content = null;

  switch (n.type) {
    case 'text':
      content = <TextContent n={n} editing={editingId === n.id} onCommit={(t) => onTextCommit?.(n.id, t)} />;
      break;
    case 'icon':
      if (exp) { content = <i data-icon={n.icon} data-color={n.color} data-stroke={n.stroke} />; break; }
      content = <LucideIcon name={n.icon} size="100%" color={n.color} stroke={n.stroke} style={{ width: '100%', height: '100%', display: 'block' }} />;
      break;
    case 'image':
      content = n.src
        ? <img src={n.src} alt={n.alt || n.name} draggable={false} style={{ width: '100%', height: '100%', objectFit: n.fit || 'cover', display: 'block', borderRadius: 'inherit' }} />
        : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', background: '#ffffff0d', color: '#ffffff55' }}><LucideIcon name="Image" size={32} /></div>;
      break;
    case 'video':
      content = n.src ? <video src={n.src} autoPlay={n.autoplay} loop={n.loopVideo} muted={n.muted} playsInline controls={interactive && !n.autoplay} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : null;
      break;
    case 'input':
      if (n.inputType === 'textarea') content = <textarea placeholder={n.placeholder} defaultValue={n.value} readOnly={!interactive} tabIndex={interactive ? 0 : -1} style={{ all: 'unset', width: '100%', height: '100%', padding: '12px 0', boxSizing: 'border-box', pointerEvents: interactive ? 'auto' : 'none', whiteSpace: 'pre-wrap' }} />;
      else content = <input type={n.inputType} placeholder={n.placeholder} defaultValue={n.value} readOnly={!interactive} tabIndex={interactive ? 0 : -1} style={{ all: 'unset', width: '100%', height: '100%', pointerEvents: interactive ? 'auto' : 'none' }} />;
      break;
    case 'toggle':
      content = <ToggleView n={n} />;
      break;
    case 'checkbox':
      content = (
        <div style={{ width: '100%', height: '100%', borderRadius: 'inherit', background: n.checked ? n.color : 'transparent', border: n.checked ? 'none' : `2px solid ${n.color}88`, display: 'grid', placeItems: 'center', boxSizing: 'border-box' }}>
          {n.checked && <LucideIcon name="Check" size="70%" color="#fff" stroke={3} />}
        </div>
      );
      break;
    case 'slider':
      content = (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 6, marginTop: -3, borderRadius: 9, background: n.track }} />
          <div style={{ position: 'absolute', top: '50%', left: 0, width: `${n.value}%`, height: 6, marginTop: -3, borderRadius: 9, background: n.color }} />
          <div style={{ position: 'absolute', top: '50%', left: `${n.value}%`, width: 20, height: 20, margin: '-10px 0 0 -10px', borderRadius: 99, background: '#fff', boxShadow: `0 0 0 4px ${n.color}44, 0 2px 6px #0006` }} />
        </div>
      );
      break;
    case 'progress':
      if (n.ring) {
        const r = 42, c = 2 * Math.PI * r;
        content = (
          <svg viewBox="0 0 100 100" width="100%" height="100%">
            <circle cx="50" cy="50" r={r} fill="none" stroke={n.track} strokeWidth="10" />
            <circle cx="50" cy="50" r={r} fill="none" stroke={n.color} strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - n.value / 100)} transform="rotate(-90 50 50)" />
            <text x="50" y="57" textAnchor="middle" fontSize="20" fontWeight="800" fill={n.color} fontFamily="Inter">{n.value}%</text>
          </svg>
        );
      } else {
        content = (
          <div style={{ width: '100%', height: '100%', background: n.track, borderRadius: 'inherit', overflow: 'hidden' }}>
            <div style={{ width: `${n.value}%`, height: '100%', background: n.color2 ? `linear-gradient(90deg, ${n.color}, ${n.color2})` : n.color, borderRadius: 'inherit' }} />
          </div>
        );
      }
      break;
    case 'chart':
      content = <ChartSVG n={n} />;
      break;
    case 'three':
      if (exp) { content = <canvas data-three={JSON.stringify(threeProps(n))} style={{ width: '100%', height: '100%', display: 'block' }} />; break; }
      content = mode === 'thumb'
        ? <div style={{ width: '100%', height: '100%', background: `radial-gradient(circle at 35% 30%, #fff8, ${n.color} 30%, ${n.color2 || '#000'} 90%)`, borderRadius: '50%', transform: 'scale(.7)' }} />
        : <Suspense fallback={<div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#fff6', fontSize: 12 }}>Loading 3D…</div>}><ThreeScene n={n} interactive={interactive} /></Suspense>;
      break;
    case 'code':
      content = mode === 'thumb' ? <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', background: '#ffffff08', color: '#ffffff66', fontFamily: 'JetBrains Mono', fontSize: 28 }}>{'</>'}</div> : <CodeView n={n} interactive={interactive} />;
      break;
    default:
      break;
  }

  return (
    <div key={key} {...props}>
      {content}
      {n.children && n.children.map((c) => (
        <NodeView key={c.id} n={c} parent={n} mode={mode} editingId={editingId} onTextCommit={onTextCommit} onAction={onAction} playKey={playKey} explode={explode} depth={depth + 1} />
      ))}
    </div>
  );
});

export const slug = (s) => (String(s || 'el').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'el').slice(0, 28);
export const threeProps = (n) => ({ shape: n.shape, material: n.material, color: n.color, color2: n.color2, metalness: n.metalness, roughness: n.roughness, distort: n.distort, speed: n.speed, autoRotate: n.autoRotate, float: n.float, wireframe: n.wireframe, light: n.light, scale: n.scale, count: n.count });

export function PageBackground({ page }) {
  return fillCSS(page.fill) || '#0b0b12';
}
