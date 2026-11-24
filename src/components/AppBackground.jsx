import React from 'react';
import { usePrefs } from '../lib/uiPrefs.js';

// Blob anchor points (percent of the container) for up to 6 liquid blobs.
const SPOTS = [[-12, -18], [62, 6], [18, 58], [58, 55], [-8, 38], [38, -24]];

const linear = (b) => `linear-gradient(${b.angle}deg, ${b.colors.join(', ')})`;

/** Everything the background draws, as plain elements. Used full-screen and in the small previews. */
export function BackgroundLayers({ b, mini = false }) {
  const sp = 1 / Math.max(0.1, b.speed || 1);
  const colors = b.colors.length ? b.colors : ['#7b5cff'];
  const c = (i) => colors[i % colors.length];
  let base = b.color;
  const kids = [];

  switch (b.mode) {
    case 'solid':
      break;
    case 'gradient':
      base = linear(b);
      break;
    case 'radial':
      base = `radial-gradient(circle at 30% 20%, ${c(0)} 0%, transparent 55%), radial-gradient(circle at 80% 85%, ${c(1)} 0%, transparent 50%), ${b.color}`;
      break;
    case 'mesh':
      base = `radial-gradient(at 15% 15%, ${c(0)} 0, transparent 50%), radial-gradient(at 85% 10%, ${c(1)} 0, transparent 50%), radial-gradient(at 80% 85%, ${c(2)} 0, transparent 55%), radial-gradient(at 10% 90%, ${c(3)} 0, transparent 50%), ${b.color}`;
      break;
    case 'flow':
      kids.push(<span key="f" className="lb-fill" style={{ background: `linear-gradient(${b.angle}deg, ${[...colors, colors[0]].join(', ')})`, backgroundSize: '400% 400%', animation: `liquid-flow ${16 * sp}s ease-in-out infinite` }} />);
      break;
    case 'image':
      if (b.image) {
        kids.push(<span key="img" className="lb-fill" style={{ background: `url("${b.image}") center / cover no-repeat` }} />);
        kids.push(<span key="dim" className="lb-fill" style={{ background: `rgba(0,0,0,${b.dim})` }} />);
      }
      break;
    case 'aurora':
      [0, 1, 2].forEach((i) => kids.push(
        <span key={i} className="lb-band" style={{
          top: `${8 + i * 24}%`, background: `radial-gradient(ellipse at center, ${c(i)} 0%, transparent 70%)`, opacity: b.opacity + 0.1,
          animation: `lb-sway ${(22 + i * 7) * sp}s ease-in-out ${-i * 5}s infinite alternate`,
        }} />,
      ));
      break;
    case 'bubbles': {
      const n = Math.max(1, Math.min(24, b.count));
      for (let i = 0; i < n; i++) {
        const s = b.size * (0.35 + ((i * 37) % 100) / 150);
        kids.push(
          <span key={i} className="lb-bubble" style={{
            width: `${s}%`, left: `${((i * 61) % 100) - s / 3}%`, opacity: b.opacity,
            background: `radial-gradient(circle at 35% 30%, ${c(i)} 0%, ${c(i)}99 35%, transparent 70%)`,
            animation: `lb-rise ${(18 + ((i * 13) % 16)) * sp}s linear ${-((i * 7) % 24) * sp}s infinite`,
          }} />,
        );
      }
      break;
    }
    case 'liquid':
    default: {
      const n = Math.max(1, Math.min(6, b.count));
      for (let i = 0; i < n; i++) {
        const [x, y] = SPOTS[i];
        kids.push(
          <span key={i} className="lb-blob" style={{
            left: `${x}%`, top: `${y}%`, width: `${b.size}%`, opacity: b.opacity * (i % 2 ? 0.8 : 1),
            background: `radial-gradient(circle at 40% 40%, ${c(i)} 0%, ${c(i)}aa 30%, transparent 68%)`,
            animation: `liquid-drift ${(38 + i * 6) * sp}s ease-in-out ${-i * 7}s infinite alternate, liquid-morph ${(18 + i * 4) * sp}s ease-in-out ${-i * 3}s infinite alternate`,
          }} />,
        );
      }
    }
  }

  return (
    <div className={mini ? 'lb-mini' : 'liquid-bg'} aria-hidden="true" style={{ background: base }}>
      {kids}
    </div>
  );
}

/** Full-screen background behind the Liquid Glass interface. */
export default function AppBackground() {
  const p = usePrefs();
  if (p.ui !== 'glass') return null;
  return <BackgroundLayers b={p.bg} />;
}
