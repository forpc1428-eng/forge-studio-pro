// Code generators. HTML/React/Vue/Tailwind are produced from the exact markup the canvas renders
// (renderToStaticMarkup of NodeView in "export" mode), then cleaned into classes — so output matches the design.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NodeView, LucideIcon } from '../components/NodeView.jsx';
import { fillCSS } from './style.js';
import motionCSS from '../motion.css?raw';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const pascal = (s) => (String(s || 'Component').replace(/[^a-zA-Z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : '')).replace(/^[a-z]/, (c) => c.toUpperCase()).replace(/^[0-9]/, 'C$&') || 'Component');

// ---------- raw markup ----------
function markup(nodes, { page, root = true } = {}) {
  const tree = React.createElement(React.Fragment, null, nodes.map((n) => React.createElement(NodeView, { key: n.id, n, parent: null, mode: 'export' })));
  let inner = renderToStaticMarkup(tree);
  if (root && page) {
    const bg = fillCSS(page.fill) || '#0b0b12';
    inner = `<div data-x="page" style="position:relative;width:${page.w}px;min-height:${page.h}px;background:${bg.replace(/"/g, "'")};overflow:hidden">${inner}</div>`;
  }
  return inner;
}

// normalise a set of nodes so the top-left of their bounding box is 0,0 (for component export)
function rebase(nodes) {
  if (!nodes.length) return { nodes, w: 0, h: 0 };
  const x = Math.min(...nodes.map((n) => n.x)), y = Math.min(...nodes.map((n) => n.y));
  const w = Math.max(...nodes.map((n) => n.x + n.w)) - x, h = Math.max(...nodes.map((n) => n.y + n.h)) - y;
  return { nodes: nodes.map((n) => ({ ...n, x: n.x - x, y: n.y - y, anim: n.anim })), w, h };
}

// ---------- DOM post-processing: inline styles -> classes ----------
function toClassed(html, { prefix = '' } = {}) {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const rules = [];
  const used = {};
  const name = (base) => { const b = prefix + base; used[b] = (used[b] || 0) + 1; return used[b] === 1 ? b : `${b}-${used[b]}`; };
  const visit = (el, parentCls) => {
    for (const c of [...el.children]) {
      let cls = null;
      const x = c.getAttribute('data-x');
      const style = c.getAttribute('style');
      if (x) { cls = name(x); c.removeAttribute('data-x'); } else if (style && !(c.namespaceURI || '').includes('svg')) cls = name(`${parentCls || 'el'}-part`);
      if (style && cls) {
        rules.push(`.${cls} {\n${style.split(';').filter((d) => d.trim()).map((d) => `  ${d.trim().replace(/:\s*/, ': ')};`).join('\n')}\n}`);
        c.removeAttribute('style');
        c.setAttribute('class', [cls, c.getAttribute('class')].filter(Boolean).join(' '));
      }
      visit(c, cls || parentCls);
    }
  };
  visit(doc.body, null);
  return { html: doc.body.innerHTML, css: rules.join('\n\n'), doc };
}

function iconSVG(el) {
  return renderToStaticMarkup(React.createElement(LucideIcon, { name: el.getAttribute('data-icon'), size: '100%', color: el.getAttribute('data-color') || 'currentColor', stroke: Number(el.getAttribute('data-stroke')) || 2 }))
    .replace('<svg ', '<svg style="width:100%;height:100%;display:block" ');
}

function prettyHTML(html) {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const VOID = new Set(['img', 'input', 'br', 'hr', 'meta', 'link', 'source']);
  const out = [];
  const walk = (node, d) => {
    const pad = '  '.repeat(d);
    for (const c of node.childNodes) {
      if (c.nodeType === 3) { const t = c.textContent; if (t.trim()) out.push(pad + esc(t.trim()).replace(/\n/g, '<br>')); continue; }
      if (c.nodeType !== 1) continue;
      const tag = c.tagName.toLowerCase();
      const attrs = [...c.attributes].map((a) => (a.value === '' && ['readonly', 'muted', 'autoplay', 'loop', 'playsinline', 'checked'].includes(a.name) ? a.name : `${a.name}="${a.value.replace(/"/g, '&quot;')}"`)).join(' ');
      const open = `<${c.tagName.toLowerCase()}${attrs ? ' ' + attrs : ''}>`;
      if (VOID.has(tag)) { out.push(pad + open); continue; }
      const onlyText = c.childNodes.length === 1 && c.firstChild.nodeType === 3;
      if (!c.childNodes.length || onlyText || tag === 'svg' || tag === 'iframe') { out.push(pad + (tag === 'svg' ? c.outerHTML : `${open}${onlyText ? esc(c.textContent).replace(/\n/g, '<br>') : ''}</${tag}>`)); continue; }
      out.push(pad + open);
      walk(c, d + 1);
      out.push(`${pad}</${tag}>`);
    }
  };
  walk(doc.body, 0);
  return out.join('\n');
}

function fontsUsed(nodes) {
  const set = new Set();
  const visit = (n) => { if (n.font) set.add(n.font); (n.children || []).forEach(visit); };
  nodes.forEach(visit);
  return [...set];
}
const fontLink = (fonts) => (fonts.length ? `<link rel="preconnect" href="https://fonts.googleapis.com">\n<link href="https://fonts.googleapis.com/css2?${fonts.map((f) => `family=${f.replace(/ /g, '+')}:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400`).join('&')}&display=swap" rel="stylesheet">` : '');

function motionSubset(css, nodes) {
  // only ship the motion classes actually used
  const used = new Set();
  const visit = (n) => { const a = n.anim || {}; if (a.enter && a.enter !== 'none') used.add(`fx-in-${a.enter}`); if (a.hover && a.hover !== 'none') used.add(`fx-h-${a.hover}`); if (a.loop && a.loop !== 'none') used.add(`fx-l-${a.loop}`); (n.children || []).forEach(visit); };
  nodes.forEach(visit);
  if (!used.size) return '';
  return css; // keyframes are tiny; ship whole kit for correctness when any motion is used
}

// ---------- THREE ----------
export function threeVanilla() {
  return `import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
// Forge 3D runtime — renders every <canvas data-three> on the page
const geo = (s) => ({
  sphere: () => new THREE.SphereGeometry(1, 96, 96), box: () => new THREE.BoxGeometry(1.4, 1.4, 1.4), roundedBox: () => new THREE.BoxGeometry(1.4, 1.4, 1.4),
  icosahedron: () => new THREE.IcosahedronGeometry(1.1, 0), octahedron: () => new THREE.OctahedronGeometry(1.2, 0), dodecahedron: () => new THREE.DodecahedronGeometry(1.1, 0),
  torus: () => new THREE.TorusGeometry(0.9, 0.32, 48, 160), capsule: () => new THREE.CapsuleGeometry(0.55, 1, 16, 48), cone: () => new THREE.ConeGeometry(0.9, 1.6, 64),
  cylinder: () => new THREE.CylinderGeometry(0.8, 0.8, 1.4, 64), blob: () => new THREE.IcosahedronGeometry(1.1, 48), spiky: () => new THREE.IcosahedronGeometry(1, 1),
  planet: () => new THREE.SphereGeometry(0.8, 64, 64), wave: () => new THREE.PlaneGeometry(4, 4, 48, 48),
}[s] || (() => new THREE.TorusKnotGeometry(0.75, 0.28, 220, 32)))();
const mat = (p, color) => {
  const c = new THREE.Color(color || p.color);
  switch (p.material) {
    case 'glass': return new THREE.MeshPhysicalMaterial({ color: c, transparent: true, opacity: 0.85, roughness: 0.04, metalness: 0.2, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.4, wireframe: p.wireframe });
    case 'chrome': return new THREE.MeshStandardMaterial({ color: c, metalness: 1, roughness: 0.08, wireframe: p.wireframe });
    case 'matte': return new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, wireframe: p.wireframe });
    case 'neon': return new THREE.MeshBasicMaterial({ color: c, wireframe: p.wireframe });
    case 'holo': return new THREE.MeshNormalMaterial({ wireframe: p.wireframe });
    case 'toon': return new THREE.MeshToonMaterial({ color: c, wireframe: p.wireframe });
    default: return new THREE.MeshPhysicalMaterial({ color: c, metalness: p.metalness, roughness: p.roughness, clearcoat: 1, wireframe: p.wireframe });
  }
};
export function mountThree(canvas) {
  if (canvas.__forge) return;
  canvas.__forge = true;
  const p = JSON.parse(canvas.dataset.three);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: devicePixelRatio < 2, powerPreference: 'high-performance' });
  let vis = true;
  new IntersectionObserver(([e]) => { vis = e.isIntersecting; }, { rootMargin: '150px' }).observe(canvas);
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(45, 1, 0.1, 100); cam.position.z = 4.2;
  scene.add(new THREE.AmbientLight(0xffffff, 0.5 * p.light));
  const d = new THREE.DirectionalLight(0xffffff, 2.2 * p.light); d.position.set(3, 4, 5); scene.add(d);
  const pl = new THREE.PointLight(new THREE.Color(p.color2), 40 * p.light); pl.position.set(-4, -2, -3); scene.add(pl);
  const group = new THREE.Group(); group.scale.setScalar(p.scale || 1); scene.add(group);
  let mesh;
  if (p.shape === 'particles' || p.shape === 'stars') {
    const g = new THREE.BufferGeometry(); const a = new Float32Array(9000);
    for (let i = 0; i < 3000; i++) { const r = (p.shape === 'stars' ? 3 : 1.4) * Math.cbrt(Math.random()), t = Math.random() * 6.283, f = Math.acos(2 * Math.random() - 1); a.set([r * Math.sin(f) * Math.cos(t), r * Math.sin(f) * Math.sin(t), r * Math.cos(f)], i * 3); }
    g.setAttribute('position', new THREE.BufferAttribute(a, 3));
    mesh = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.025, color: p.shape === 'stars' ? 0xffffff : p.color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  } else if (p.shape === 'cubes' || p.shape === 'helix') {
    mesh = new THREE.Group();
    const n = p.shape === 'cubes' ? (p.count || 12) : 40;
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(p.shape === 'cubes' ? new THREE.BoxGeometry(1, 1, 1) : new THREE.SphereGeometry(1, 16, 16), mat(p, i % 2 ? p.color2 : p.color));
      if (p.shape === 'cubes') { m.position.set((Math.random() - .5) * 3, (Math.random() - .5) * 2.4, (Math.random() - .5) * 2); m.scale.setScalar(.2 + Math.random() * .35); m.rotation.set(Math.random() * 3, Math.random() * 3, 0); }
      else { const t = i / n * Math.PI * 4; m.position.set(Math.cos(t + (i % 2) * Math.PI) * .7, (i / n - .5) * 3, Math.sin(t + (i % 2) * Math.PI) * .7); m.scale.setScalar(.11); }
      mesh.add(m);
    }
  } else {
    mesh = new THREE.Mesh(geo(p.shape), mat(p));
    if (p.shape === 'wave') mesh.rotation.x = -1.1;
    if (p.shape === 'planet') { const ring = new THREE.Mesh(new THREE.TorusGeometry(1.3, .06, 8, 128), mat(p, p.color2)); ring.rotation.set(1.2, .2, 0); mesh.add(ring); }
  }
  group.add(mesh);
  const base = mesh.geometry?.attributes?.position?.array.slice();
  const resize = () => { const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  new ResizeObserver(resize).observe(canvas); resize();
  let drag = null, rx = 0, ry = 0;
  canvas.addEventListener('pointerdown', (e) => { drag = [e.clientX, e.clientY]; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => { if (!drag) return; ry += (e.clientX - drag[0]) * .01; rx += (e.clientY - drag[1]) * .01; drag = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', () => { drag = null; });
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    if (!vis || document.hidden) return; // off-screen: no CPU/GPU work
    const t = clock.getElapsedTime(), dt = clock.getDelta() || 0.016;
    if (p.autoRotate) { mesh.rotation.y += 0.006 * p.speed; mesh.rotation.x += 0.002 * p.speed; }
    group.rotation.set(rx, ry, 0);
    if (p.float) group.position.y = Math.sin(t * p.speed * .8) * .12;
    if (base && (p.material === 'distort' || p.material === 'wobble' || p.shape === 'wave')) {
      const pos = mesh.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2];
        if (p.shape === 'wave') { pos.setZ(i, Math.sin(x * 2 + t * p.speed * .6) * .2 + Math.cos(y * 2.4 + t * p.speed * .6) * .2); continue; }
        const k = 1 + Math.sin(x * 2.2 + t * p.speed) * Math.cos(y * 2.0 + t * p.speed * .8) * p.distort * .35;
        pos.setXYZ(i, x * k, y * k, z * k);
      }
      pos.needsUpdate = true; mesh.geometry.computeVertexNormals();
    }
    renderer.render(scene, cam);
  });
}
document.querySelectorAll('canvas[data-three]').forEach(mountThree);
window.forgeMountThree = () => document.querySelectorAll('canvas[data-three]').forEach(mountThree);
`;
}

export function threeR3F(n) {
  const geoMap = { sphere: '<sphereGeometry args={[1, 96, 96]} />', box: '<boxGeometry args={[1.4, 1.4, 1.4]} />', icosahedron: '<icosahedronGeometry args={[1.1, 0]} />', octahedron: '<octahedronGeometry args={[1.2, 0]} />', dodecahedron: '<dodecahedronGeometry args={[1.1, 0]} />', torus: '<torusGeometry args={[0.9, 0.32, 48, 160]} />', capsule: '<capsuleGeometry args={[0.55, 1, 16, 48]} />', cone: '<coneGeometry args={[0.9, 1.6, 64]} />', cylinder: '<cylinderGeometry args={[0.8, 0.8, 1.4, 64]} />', blob: '<icosahedronGeometry args={[1.1, 64]} />', spiky: '<icosahedronGeometry args={[1, 1]} />' };
  const g = geoMap[n.shape] || '<torusKnotGeometry args={[0.75, 0.28, 220, 32]} />';
  const m = {
    distort: `<MeshDistortMaterial color="${n.color}" distort={${n.distort}} speed={${n.speed}} metalness={${n.metalness}} roughness={${n.roughness}} />`,
    wobble: `<MeshWobbleMaterial color="${n.color}" factor={${n.distort}} speed={${n.speed}} />`,
    glass: `<meshPhysicalMaterial color="${n.color}" transparent opacity={0.82} roughness={0.04} metalness={0.15} clearcoat={1} iridescence={1} iridescenceIOR={1.4} envMapIntensity={2.2} />`,
    chrome: `<meshStandardMaterial color="${n.color}" metalness={1} roughness={0.08} />`,
    neon: `<meshStandardMaterial color="${n.color}" emissive="${n.color}" emissiveIntensity={2.4} toneMapped={false} />`,
    holo: '<meshNormalMaterial />', toon: `<meshToonMaterial color="${n.color}" />`, matte: `<meshStandardMaterial color="${n.color}" roughness={0.9} />`,
  }[n.material] || `<meshPhysicalMaterial color="${n.color}" metalness={${n.metalness}} roughness={${n.roughness}} clearcoat={1}${n.wireframe ? ' wireframe' : ''} />`;
  const name = pascal(n.name) + 'Scene';
  return { name, code: `// npm i three @react-three/fiber @react-three/drei
import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, OrbitControls, Environment, Lightformer, MeshDistortMaterial, MeshWobbleMaterial } from '@react-three/drei';

function Subject() {
  const ref = useRef();
  useFrame((_, dt) => { ${n.autoRotate ? `ref.current.rotation.y += dt * ${(0.4 * n.speed).toFixed(2)}; ref.current.rotation.x += dt * ${(0.15 * n.speed).toFixed(2)};` : ''} });
  return (
    <mesh ref={ref} scale={${n.scale}}>
      ${g}
      ${m}
    </mesh>
  );
}

export function ${name}() {
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 4.2], fov: 45 }} style={{ width: '100%', height: '100%' }}>
      <ambientLight intensity={${(0.35 * n.light).toFixed(2)}} />
      <directionalLight position={[3, 4, 5]} intensity={${(1.6 * n.light).toFixed(2)}} />
      <pointLight position={[-4, -2, -3]} intensity={${(30 * n.light).toFixed(0)}} color="${n.color2}" />
      <Environment resolution={256}>
        <Lightformer intensity={2} position={[0, 4, -6]} scale={[10, 4, 1]} />
        <Lightformer form="ring" intensity={3} position={[0, 0, 6]} scale={3} color="${n.color2}" />
      </Environment>
      ${n.float ? `<Float speed={${n.speed}} floatIntensity={1.2}><Subject /></Float>` : '<Subject />'}
      <OrbitControls enableZoom={false} enablePan={false} />
    </Canvas>
  );
}
` };
}

// ---------- HTML ----------
export function genHTML(nodes, { page, full = true, title = 'Forge export' } = {}) {
  const base = page ? nodes : rebase(nodes).nodes;
  const raw = markup(base, { page: page || null });
  const { html, css, doc } = toClassed(page ? raw : `<div data-x="component" style="position:relative;width:${rebase(nodes).w}px;height:${rebase(nodes).h}px">${raw}</div>`);
  // inject icons
  const d2 = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  d2.querySelectorAll('i[data-icon]').forEach((el) => { el.outerHTML = iconSVG(el); });
  const hasThree = !!d2.querySelector('canvas[data-three]');
  const body = prettyHTML(d2.body.innerHTML);
  const fonts = fontsUsed(nodes);
  const mcss = motionSubset(motionCSS, nodes);
  if (!full) return { html: body, css: `${css}\n\n${mcss}` };
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${fontLink(fonts)}
<style>
*{box-sizing:border-box}
body{margin:0;background:${page ? (fillCSS(page.fill) || '#0b0b12').replace(/"/g, "'") : '#0b0b12'};-webkit-font-smoothing:antialiased}
${css}

${mcss}
</style>
</head>
<body>
${body}
${hasThree ? `<script type="module">\n${threeVanilla()}\n</script>` : ''}
</body>
</html>
`;
}

// ---------- React ----------
const SVG_ATTR = (a) => a.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
function styleObj(str) {
  const o = str.split(';').filter((d) => d.trim()).map((d) => {
    const i = d.indexOf(':');
    const k = d.slice(0, i).trim(), v = d.slice(i + 1).trim();
    const key = k.startsWith('--') ? `'${k}'` : k.replace(/^-webkit-/, 'Webkit-').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const num = /^-?\d+(\.\d+)?px$/.test(v) ? parseFloat(v) : /^-?\d+(\.\d+)?$/.test(v) && ['opacity', 'fontWeight', 'lineHeight', 'flexShrink', 'zIndex'].includes(key) ? Number(v) : null;
    return `${key}: ${num !== null ? num : `'${v.replace(/'/g, "\\'")}'`}`;
  });
  return `{{ ${o.join(', ')} }}`;
}

function domToJSX(node, d, ctx) {
  const pad = '  '.repeat(d);
  const out = [];
  for (const c of node.childNodes) {
    if (c.nodeType === 3) {
      const t = c.textContent;
      if (t.trim()) out.push(pad + t.trim().split('\n').map((l) => l.replace(/[{}<>]/g, (m) => `{'${m}'}`)).join(`<br />\n${pad}`));
      continue;
    }
    if (c.nodeType !== 1) continue;
    const tag = c.tagName.toLowerCase();
    if (tag === 'i' && c.dataset.icon) {
      ctx.icons.add(c.dataset.icon);
      out.push(`${pad}<${c.dataset.icon} size="100%" color="${c.dataset.color}" strokeWidth={${c.dataset.stroke || 2}} style={{ display: 'block' }} />`);
      continue;
    }
    if (tag === 'canvas' && c.dataset.three) {
      const p = JSON.parse(c.dataset.three);
      const sc = threeR3F({ ...p, name: `Scene${ctx.scenes.length + 1}` });
      ctx.scenes.push(sc);
      out.push(`${pad}<${sc.name} />`);
      continue;
    }
    const isSvg = c.namespaceURI?.includes('svg');
    const attrs = [...c.attributes].map((a) => {
      if (a.name === 'class') return ctx.tailwind ? null : `className="${a.value}"`;
      if (a.name === 'style') return `style=${styleObj(a.value)}`;
      if (a.name === 'srcdoc') return `srcDoc={${JSON.stringify(a.value)}}`;
      if (a.name === 'data-act') { const tgt = c.getAttribute('data-target'); return a.value === 'url' ? `onClick={() => window.open('${tgt}', '_blank')}` : a.value === 'page' ? `onClick={() => onNavigate?.('${tgt}')}` : a.value === 'back' ? 'onClick={() => history.back()}' : a.value === 'alert' ? `onClick={() => alert(${JSON.stringify(tgt)})}` : null; }
      if (a.name === 'data-target') return null;
      if (a.name === 'readonly') return null;
      if (a.name === 'tabindex') return null;
      if (['autoplay', 'loop', 'muted', 'playsinline'].includes(a.name)) return { autoplay: 'autoPlay', loop: 'loop', muted: 'muted', playsinline: 'playsInline' }[a.name];
      if (a.name === 'value' && tag === 'input') return `defaultValue="${a.value}"`;
      const name = a.name === 'for' ? 'htmlFor' : isSvg && !a.name.startsWith('data-') && !a.name.startsWith('aria-') ? SVG_ATTR(a.name) : a.name;
      return `${name}="${a.value.replace(/"/g, '&quot;')}"`;
    }).filter(Boolean);
    if (ctx.tailwind && c.getAttribute('class')) attrs.unshift(`className="${c.getAttribute('class')}"`);
    const open = `<${tag}${attrs.length ? ' ' + attrs.join(' ') : ''}`;
    if (!c.childNodes.length || ['img', 'input'].includes(tag)) { out.push(`${pad}${open} />`); continue; }
    const onlyText = c.childNodes.length === 1 && c.firstChild.nodeType === 3 && !c.textContent.includes('\n');
    if (onlyText) { out.push(`${pad}${open}>${c.textContent.replace(/[{}<>]/g, (m) => `{'${m}'}`)}</${tag}>`); continue; }
    out.push(`${pad}${open}>`);
    out.push(...domToJSX(c, d + 1, ctx));
    out.push(`${pad}</${tag}>`);
  }
  return out;
}

function reactFrom(html, { name, css, tailwind, nodes }) {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const ctx = { icons: new Set(), scenes: [], tailwind };
  const jsx = domToJSX(doc.body, 2, ctx).join('\n');
  const fonts = fontsUsed(nodes);
  const imports = [`import React from 'react';`];
  if (ctx.icons.size) imports.push(`import { ${[...ctx.icons].join(', ')} } from 'lucide-react';`);
  if (!tailwind && css) imports.push(`import './${name}.css';`);
  const scenes = ctx.scenes.length ? `\n// ---- 3D scenes (npm i three @react-three/fiber @react-three/drei) ----\n${ctx.scenes.map((s) => s.code.replace(/^\/\/ npm.*\n/, '').replace(/^import.*\n/gm, '')).join('\n')}` : '';
  if (ctx.scenes.length) imports.push(`import { useRef } from 'react';\nimport { Canvas, useFrame } from '@react-three/fiber';\nimport { Float, OrbitControls, Environment, Lightformer, MeshDistortMaterial, MeshWobbleMaterial } from '@react-three/drei';`);
  const fontNote = fonts.length ? `// Fonts: ${fonts.join(', ')} (Google Fonts)\n` : '';
  return `${fontNote}${imports.join('\n')}
${scenes}
export default function ${name}({ onNavigate }) {
  return (
    <>
${jsx}
    </>
  );
}
`;
}

export function genReact(nodes, { page, name } = {}) {
  const compName = pascal(name || (page ? page.name : nodes[0]?.name) || 'Component');
  const r = rebase(nodes);
  const raw = page ? markup(nodes, { page }) : `<div data-x="${compName.toLowerCase()}" style="position:relative;width:${r.w}px;height:${r.h}px">${markup(r.nodes, { root: false })}</div>`;
  const { html, css } = toClassed(raw);
  return { jsx: reactFrom(html, { name: compName, css, nodes }), css: `${css}\n\n${motionSubset(motionCSS, nodes)}`, name: compName };
}

// Tailwind: every inline declaration becomes a utility (or an arbitrary property)
const TW = {
  position: (v) => ({ absolute: 'absolute', relative: 'relative', fixed: 'fixed' }[v]),
  display: (v) => ({ flex: 'flex', grid: 'grid', block: 'block', none: 'hidden' }[v]),
  'flex-direction': (v) => ({ row: 'flex-row', column: 'flex-col' }[v]),
  'flex-wrap': (v) => (v === 'wrap' ? 'flex-wrap' : null),
  'align-items': (v) => ({ 'flex-start': 'items-start', center: 'items-center', 'flex-end': 'items-end', stretch: 'items-stretch', baseline: 'items-baseline' }[v]),
  'justify-content': (v) => ({ 'flex-start': 'justify-start', center: 'justify-center', 'flex-end': 'justify-end', 'space-between': 'justify-between', 'space-around': 'justify-around', 'space-evenly': 'justify-evenly' }[v]),
  'align-self': (v) => ({ stretch: 'self-stretch', center: 'self-center' }[v]),
  'text-align': (v) => `text-${v}`, 'font-style': (v) => (v === 'italic' ? 'italic' : null), 'text-transform': (v) => ({ uppercase: 'uppercase', lowercase: 'lowercase', capitalize: 'capitalize' }[v]),
  overflow: (v) => `overflow-${v}`, 'box-sizing': () => null, 'flex-shrink': (v) => (v === '0' ? 'shrink-0' : null),
  width: (v) => `w-[${v}]`, height: (v) => `h-[${v}]`, left: (v) => `left-[${v}]`, top: (v) => `top-[${v}]`, gap: (v) => `gap-[${v}]`, padding: (v) => `p-[${v.replace(/ /g, '_')}]`,
  'border-radius': (v) => `rounded-[${v.replace(/ /g, '_')}]`, opacity: (v) => `opacity-[${v}]`, color: (v) => `text-[${v.replace(/ /g, '')}]`,
  'font-size': (v) => `text-[${v}]`, 'font-weight': (v) => `font-[${v}]`, 'line-height': (v) => `leading-[${v}]`, 'letter-spacing': (v) => `tracking-[${v}]`,
  'min-width': (v) => `min-w-[${v}]`, cursor: (v) => `cursor-${v}`,
};
function twClasses(style) {
  return style.split(';').filter((d) => d.trim()).map((d) => {
    const i = d.indexOf(':');
    const k = d.slice(0, i).trim(), v = d.slice(i + 1).trim();
    const f = TW[k];
    const r = f ? f(v) : undefined;
    if (r === null) return null;
    if (r) return r;
    if (k === 'background' && /^#[0-9a-f]{3,8}$/i.test(v)) return `bg-[${v}]`;
    return `[${k}:${v.replace(/_/g, '\\_').replace(/ /g, '_')}]`;
  }).filter(Boolean).join(' ');
}

export function genTailwind(nodes, { page, name } = {}) {
  const compName = pascal(name || (page ? page.name : nodes[0]?.name) || 'Component');
  const r = rebase(nodes);
  const raw = page ? markup(nodes, { page }) : `<div style="position:relative;width:${r.w}px;height:${r.h}px">${markup(r.nodes, { root: false })}</div>`;
  const doc = new DOMParser().parseFromString(`<body>${raw}</body>`, 'text/html');
  doc.body.querySelectorAll('[style]').forEach((el) => {
    if (el.namespaceURI?.includes('svg')) return;
    const tw = twClasses(el.getAttribute('style'));
    el.setAttribute('class', [tw, el.getAttribute('class')].filter(Boolean).join(' '));
    el.removeAttribute('style');
  });
  doc.body.querySelectorAll('[data-x]').forEach((el) => el.removeAttribute('data-x'));
  const jsx = reactFrom(doc.body.innerHTML, { name: compName, tailwind: true, nodes });
  const anyMotion = !!motionSubset(motionCSS, nodes);
  return { jsx: jsx + (anyMotion ? `\n/* Motion classes (fx-*) — add to your global CSS:\n${motionCSS}*/\n` : ''), name: compName };
}

export function genVue(nodes, opts = {}) {
  const r = genHTML(nodes, { ...opts, full: false });
  const hasIcons = false;
  return `<template>
${r.html.split('\n').map((l) => '  ' + l).join('\n')}
</template>

<script setup>
// ${pascal(opts.name || opts.page?.name || nodes[0]?.name)}.vue — generated by Forge Studio Pro${hasIcons ? '' : ''}
</script>

<style scoped>
${r.css}
</style>
`;
}

// ---------- React Native (from the node tree) ----------
export function genReactNative(nodes, { page, name } = {}) {
  const compName = pascal(name || page?.name || nodes[0]?.name);
  const styles = {};
  const icons = new Set();
  let grad = false;
  let i = 0;
  const rn = (n, parent, d) => {
    if (!n.visible) return '';
    const pad = '  '.repeat(d);
    const key = `${n.type}${++i}`;
    const s = {};
    const flow = parent && parent.layout && parent.layout.mode !== 'none';
    if (!flow) { s.position = 'absolute'; s.left = n.x; s.top = n.y; }
    if (n.sizeW === 'fixed') s.width = n.w; else if (n.sizeW === 'fill') { if (flow && parent.layout.mode === 'row') s.flex = 1; else s.alignSelf = 'stretch'; }
    if (n.sizeH === 'fixed') s.height = n.h; else if (n.sizeH === 'fill' && flow && parent.layout.mode === 'column') s.flex = 1;
    if (n.opacity !== 1) s.opacity = n.opacity;
    if (n.rotation) s.transform = [{ rotate: `${n.rotation}deg` }];
    if (n.radius) s.borderRadius = Math.min(n.radius, 9999);
    if (n.border?.w) { s.borderWidth = n.border.w; s.borderColor = n.border.color; s.borderStyle = n.border.style === 'double' ? 'solid' : n.border.style; }
    if (n.fill?.type === 'solid' && n.type !== 'text') s.backgroundColor = n.fill.color;
    if (n.shadows?.length) { const sh = n.shadows[0]; s.shadowColor = sh.color.slice(0, 7); s.shadowOffset = { width: sh.x, height: sh.y }; s.shadowRadius = sh.blur / 2; s.shadowOpacity = 0.5; s.elevation = Math.round(sh.blur / 3); }
    if (n.clip) s.overflow = 'hidden';
    if (n.children && n.layout.mode !== 'none') {
      s.flexDirection = n.layout.mode;
      s.gap = n.layout.gap;
      const [pt, pr, pb, pl] = n.layout.pad;
      Object.assign(s, { paddingTop: pt, paddingRight: pr, paddingBottom: pb, paddingLeft: pl });
      s.alignItems = { start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch' }[n.layout.align];
      s.justifyContent = { start: 'flex-start', center: 'center', end: 'flex-end', between: 'space-between', around: 'space-around' }[n.layout.justify];
      if (n.layout.wrap) s.flexWrap = 'wrap';
    }
    if (n.type === 'text') Object.assign(s, { color: n.color, fontSize: n.fs, fontWeight: String(n.fw), lineHeight: Math.round(n.fs * n.lh), textAlign: n.align, letterSpacing: n.ls || undefined, fontFamily: n.font, fontStyle: n.italic ? 'italic' : undefined, textTransform: n.transform !== 'none' ? n.transform : undefined });
    Object.keys(s).forEach((k) => s[k] === undefined && delete s[k]);
    styles[key] = s;
    const kids = (n.children || []).map((c) => rn(c, n, d + 1)).join('\n');
    const gradFill = n.fill && ['linear', 'radial', 'conic', 'mesh'].includes(n.fill.type) && n.type !== 'text';
    switch (n.type) {
      case 'text': return `${pad}<Text style={styles.${key}}>${n.text.replace(/[{}<>]/g, (m) => `{'${m}'}`)}</Text>`;
      case 'image': return `${pad}<Image source={{ uri: '${n.src}' }} style={styles.${key}} resizeMode="${n.fit === 'contain' ? 'contain' : 'cover'}" />`;
      case 'icon': icons.add(n.icon); return `${pad}<${n.icon} size={${n.w}} color="${n.color}" strokeWidth={${n.stroke}} style={styles.${key}} />`;
      case 'input': return `${pad}<TextInput placeholder="${n.placeholder}" placeholderTextColor="#888" secureTextEntry={${n.inputType === 'password'}} multiline={${n.inputType === 'textarea'}} style={[styles.${key}, { color: '${n.color}', fontSize: ${n.fs}, paddingHorizontal: ${n.padX ?? 14} }]} />`;
      case 'toggle': return `${pad}<Switch value={${n.checked}} trackColor={{ true: '${n.color}', false: '${n.offColor}' }} style={styles.${key}} />`;
      default:
        if (gradFill) { grad = true; return `${pad}<LinearGradient colors={[${n.fill.stops.map((x) => `'${x.c}'`).join(', ')}]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.${key}}>\n${kids}\n${pad}</LinearGradient>`; }
        return kids ? `${pad}<View style={styles.${key}}>\n${kids}\n${pad}</View>` : `${pad}<View style={styles.${key}} />`;
    }
  };
  const body = nodes.map((n) => rn(n, null, 3)).join('\n');
  const bg = page?.fill?.color || '#0b0b12';
  return `import React from 'react';
import { View, Text, Image, TextInput, Switch, StyleSheet, ScrollView } from 'react-native';
${grad ? "import { LinearGradient } from 'expo-linear-gradient';\n" : ''}${icons.size ? `import { ${[...icons].join(', ')} } from 'lucide-react-native';\n` : ''}
export default function ${compName}() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '${bg}' }}>
      <View style={{ width: ${page?.w || 390}, minHeight: ${page?.h || 844} }}>
${body}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create(${JSON.stringify(styles, null, 2).replace(/"([a-zA-Z]+)":/g, '$1:')});
`;
}

// ---------- multi-page site (used by Website, Android, Desktop exports) ----------
export function buildSite(project, { title, pwa = false, extraHead = '', extraBody = '', fit = 'width', splash = null } = {}) {
  const pages = project.pages;
  const allNodes = pages.flatMap((p) => p.nodes);
  const fonts = fontsUsed(allNodes);
  let css = '';
  const sections = pages.map((p, idx) => {
    const raw = markup(p.nodes, { page: p });
    const { html, css: c } = toClassed(raw, { prefix: `p${idx + 1}-` });
    css += `\n/* ${p.name} */\n${c}\n`;
    const d = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
    d.querySelectorAll('i[data-icon]').forEach((el) => { el.outerHTML = iconSVG(el); });
    return `<section class="fp" id="page-${p.id}" data-w="${p.w}" data-h="${p.h}"${idx ? ' hidden' : ''}>\n${prettyHTML(d.body.innerHTML)}\n</section>`;
  }).join('\n');
  const hasThree = sections.includes('data-three');
  const bg = fillCSS(pages[0].fill) || '#0b0b12';
  return `<!doctype html>
<html lang="${project.publish?.lang || 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="${project.publish?.themeColor || '#0b0b12'}">
<title>${esc(title || project.name)}</title>
${fontLink(fonts)}
${extraHead}
<style>
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;min-height:100%;background:${bg.replace(/"/g, "'")};-webkit-font-smoothing:antialiased;overscroll-behavior:none}
.fp{transform-origin:0 0;margin:0 auto}
.fp[hidden]{display:none}
.fp-wrap{overflow-x:hidden;width:100%}
[data-act]{cursor:pointer}
#forge-splash{position:fixed;inset:0;display:grid;place-items:center;z-index:99;transition:opacity .5s}
${css}
${motionCSS}
</style>
</head>
<body>
${splash || ''}
<div class="fp-wrap" id="app">
${sections}
</div>
<script>
(function(){
  var stack = [];
  var fitMode = ${JSON.stringify(fit)};
  function cur(){ return document.querySelector('.fp:not([hidden])'); }
  function fitPage(){
    var p = cur(); if(!p) return;
    var w = +p.dataset.w, h = +p.dataset.h, vw = document.documentElement.clientWidth;
    var k = fitMode === 'none' ? 1 : Math.min(vw / w, fitMode === 'contain' ? innerHeight / h : 99);
    if (fitMode === 'width' && vw >= w) k = 1;
    p.style.width = w + 'px';
    p.style.transform = 'scale(' + k + ')';
    p.parentElement.style.height = (p.firstElementChild ? p.firstElementChild.offsetHeight : h) * k + 'px';
    p.style.marginLeft = Math.max(0, (vw - w * k) / 2) + 'px';
  }
  function replay(p){ p.querySelectorAll('[class*="fx-in-"]').forEach(function(el){ var c = el.className; el.className = c.replace(/fx-in-\\w+/g,''); void el.offsetWidth; el.className = c; }); }
  function show(id, push){
    var next = document.getElementById('page-' + id); if(!next) return;
    var p = cur(); if (p === next) return;
    if (p && push !== false) stack.push(p.id.slice(5));
    if (p) p.hidden = true;
    next.hidden = false; scrollTo(0,0); fitPage(); replay(next);
    if (window.forgeMountThree) window.forgeMountThree();
    if (push !== false) history.pushState({ id: id }, '', '#' + id);
  }
  window.forgeBack = function(){ if(!stack.length) return false; show(stack.pop(), false); return true; };
  addEventListener('popstate', function(e){ if (stack.length) show(stack.pop(), false); });
  document.addEventListener('click', function(e){
    var el = e.target.closest('[data-act]'); if(!el) return;
    var a = el.dataset.act, t = el.dataset.target;
    if (a === 'page') show(t);
    else if (a === 'back') { if(!window.forgeBack()) history.back(); }
    else if (a === 'url') window.open(t, '_blank');
    else if (a === 'scroll') scrollTo({ top: 0, behavior: 'smooth' });
    else if (a === 'alert') alert(t);
  });
  addEventListener('resize', fitPage);
  fitPage();
  var sp = document.getElementById('forge-splash');
  if (sp) setTimeout(function(){ sp.style.opacity = 0; setTimeout(function(){ sp.remove(); }, 500); }, +(sp.dataset.ms || 1000));
  ${pwa ? "if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js');" : ''}
})();
</script>
${hasThree ? `<script type="module">\n${threeVanilla()}\n</script>` : ''}
${extraBody}
</body>
</html>
`;
}

// ---------- full Vite + React project ----------
export function reactProjectFiles(project) {
  const files = {};
  const pages = project.pages.map((p) => ({ p, ...genReact(p.nodes, { page: p, name: p.name }) }));
  const deps = { react: '^18.3.1', 'react-dom': '^18.3.1', 'lucide-react': '^0.454.0' };
  if (pages.some((x) => x.jsx.includes('@react-three'))) Object.assign(deps, { three: '^0.169.0', '@react-three/fiber': '^8.17.10', '@react-three/drei': '^9.114.0' });
  files['package.json'] = JSON.stringify({ name: project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), private: true, version: '1.0.0', type: 'module', scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' }, dependencies: deps, devDependencies: { vite: '^5.4.10', '@vitejs/plugin-react': '^4.3.3' } }, null, 2);
  files['vite.config.js'] = "import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nexport default defineConfig({ plugins: [react()] });\n";
  const fonts = fontsUsed(project.pages.flatMap((p) => p.nodes));
  files['index.html'] = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${esc(project.name)}</title>\n${fontLink(fonts)}\n</head>\n<body>\n<div id="root"></div>\n<script type="module" src="/src/main.jsx"></script>\n</body>\n</html>\n`;
  files['src/main.jsx'] = "import React from 'react';\nimport { createRoot } from 'react-dom/client';\nimport App from './App.jsx';\nimport './motion.css';\n\ncreateRoot(document.getElementById('root')).render(<App />);\n";
  files['src/motion.css'] = `*{box-sizing:border-box}\nbody{margin:0;background:${(fillCSS(project.pages[0].fill) || '#0b0b12').replace(/"/g, "'")}}\n${motionCSS}`;
  pages.forEach(({ name, jsx, css }) => {
    files[`src/pages/${name}.jsx`] = jsx;
    files[`src/pages/${name}.css`] = css;
  });
  files['src/App.jsx'] = `import React, { useState } from 'react';
${pages.map(({ name }) => `import ${name} from './pages/${name}.jsx';`).join('\n')}

const PAGES = {
${pages.map(({ p, name }) => `  '${p.id}': ${name}, // ${p.name}`).join('\n')}
};

export default function App() {
  const [stack, setStack] = useState(['${pages[0].p.id}']);
  const Page = PAGES[stack[stack.length - 1]];
  const go = (id) => PAGES[id] && setStack((s) => [...s, id]);
  return <Page onNavigate={go} />;
}
`;
  files['README.md'] = `# ${project.name}\n\nGenerated by **Forge Studio Pro**.\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n\nEach page is a component in \`src/pages\`. Styles live next to each page. Motion classes are in \`src/motion.css\`.\n`;
  return files;
}
