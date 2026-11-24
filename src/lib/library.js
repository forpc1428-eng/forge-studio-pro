// Built-in component library. Every preset is a normal editable node tree (frames + text + icons…),
// so anything inserted can be restyled, regrouped and saved again as your own component.
import { createNode } from './nodes.js';

const F = (p = {}, kids = []) => createNode('frame', p, kids);
const T = (text, p = {}) => createNode('text', { text, name: p.name || text.slice(0, 24), ...p });
const I = (icon, p = {}) => createNode('icon', { icon, name: icon, ...p });
const solid = (color) => ({ type: 'solid', color });
const lin = (a, b, angle = 135, c) => ({ type: 'linear', angle, stops: c ? [{ c: a, p: 0 }, { c: b, p: 50 }, { c, p: 100 }] : [{ c: a, p: 0 }, { c: b, p: 100 }] });
const none = { type: 'none' };
const row = (p, kids) => F({ fill: none, sizeW: 'hug', sizeH: 'hug', ...p, layout: { mode: 'row', gap: 8, pad: [0, 0, 0, 0], align: 'center', justify: 'start', ...(p.layout || {}) } }, kids);
const col = (p, kids) => F({ fill: none, sizeW: 'hug', sizeH: 'hug', ...p, layout: { mode: 'column', gap: 8, pad: [0, 0, 0, 0], align: 'start', justify: 'start', ...(p.layout || {}) } }, kids);
const pad = (a, b = a, c = a, d = b) => [a, b, c, d];
const soft = [{ x: 0, y: 10, blur: 30, spread: -8, color: '#00000066', inset: false }];
const fillW = { sizeW: 'fill' };

// ---------- primitives that read theme tokens ----------
function btn(t, label, v = 'primary', o = {}) {
  const styles = {
    primary: { fill: solid(t.accent), color: '#ffffff' },
    secondary: { fill: solid(t.surface2), color: t.text },
    outline: { fill: none, color: t.text, border: { w: 1.5, color: t.line, style: 'solid' } },
    ghost: { fill: none, color: t.text },
    gradient: { fill: lin(t.accent, t.accent2), color: '#ffffff', shadows: [{ x: 0, y: 8, blur: 24, spread: -6, color: t.accent + '99', inset: false }] },
    glass: { fill: solid('#ffffff14'), color: t.text, backdrop: 16, border: { w: 1, color: '#ffffff26', style: 'solid' } },
    neon: { fill: none, color: '#00e5ff', border: { w: 1.5, color: '#00e5ff', style: 'solid' }, shadows: [{ x: 0, y: 0, blur: 18, spread: 0, color: '#00e5ff88', inset: false }, { x: 0, y: 0, blur: 10, spread: 0, color: '#00e5ff55', inset: true }] },
    danger: { fill: solid('#ef4444'), color: '#ffffff' },
    success: { fill: solid('#22c55e'), color: '#05210f' },
    white: { fill: solid('#ffffff'), color: '#111118' },
    dark: { fill: solid('#0a0a0f'), color: '#ffffff', border: { w: 1, color: '#ffffff1f', style: 'solid' } },
    soft: { fill: solid(t.accent + '22'), color: t.accent },
    brutal: { fill: solid('#ffd60a'), color: '#000000', border: { w: 2, color: '#000000', style: 'solid' }, shadows: [{ x: 4, y: 4, blur: 0, spread: 0, color: '#000000', inset: false }] },
  }[v];
  const r = o.pill ? 999 : o.radius ?? 12;
  const kids = [];
  if (o.icon && !o.iconRight) kids.push(I(o.icon, { w: 18, h: 18, color: styles.color }));
  if (label) kids.push(T(label, { fs: o.fs || 15, fw: 600, color: styles.color, sizeW: 'hug', sizeH: 'hug', align: 'center' }));
  if (o.icon && o.iconRight) kids.push(I(o.icon, { w: 18, h: 18, color: styles.color }));
  const { color, ...frameStyle } = styles;
  return row({
    name: `${label || o.icon} button`, radius: r, ...frameStyle, layout: { gap: 8, pad: o.small ? pad(8, 14) : o.big ? pad(18, 30) : pad(13, 22), align: 'center', justify: 'center' },
    anim: { hover: o.hover || 'lift' }, cursor: 'pointer', ...(o.frame || {}),
  }, kids);
}

function card(t, kids, p = {}) {
  return col({ name: 'Card', w: 320, sizeW: 'fixed', fill: solid(t.surface), radius: 20, border: { w: 1, color: t.line, style: 'solid' }, shadows: soft, layout: { gap: 12, pad: pad(24) }, ...p }, kids);
}

function input(t, ph, icon, p = {}) {
  const field = createNode('input', { placeholder: ph, w: 280, h: 46, sizeW: 'fill', fill: solid(t.surface2), color: t.text, border: { w: 1, color: t.line, style: 'solid' }, radius: 12, padX: icon ? 42 : 14, ...p });
  if (!icon) return field;
  return F({ name: `${ph} field`, w: 300, h: 46, sizeW: 'fill', fill: none }, [{ ...field, x: 0, y: 0, sizeW: 'fixed', w: 300, h: 46 }, I(icon, { x: 14, y: 14, w: 18, h: 18, color: t.mute })]);
}

const avatarImg = (seed) => `https://i.pravatar.cc/150?img=${seed}`;
const photo = (q, w = 800, h = 600) => `https://picsum.photos/seed/${q}/${w}/${h}`;
const img = (src, p = {}) => createNode('image', { src, ...p });

function stars(n = 5, color = '#fbbf24') {
  return row({ name: 'Rating', layout: { gap: 2 } }, Array.from({ length: n }, () => I('Star', { w: 16, h: 16, color })));
}

// ---------- the catalogue ----------
export const CATEGORIES = [
  { id: 'basic', label: 'Basics', icon: 'Shapes' },
  { id: 'type', label: 'Typography', icon: 'Type' },
  { id: 'glass', label: 'Liquid Glass', icon: 'Droplets' },
  { id: 'buttons', label: 'Buttons', icon: 'MousePointerClick' },
  { id: 'forms', label: 'Forms & Inputs', icon: 'TextCursorInput' },
  { id: 'cards', label: 'Cards', icon: 'CreditCard' },
  { id: 'nav', label: 'Navigation', icon: 'Navigation' },
  { id: 'data', label: 'Data & Charts', icon: 'ChartPie' },
  { id: 'feedback', label: 'Feedback', icon: 'Bell' },
  { id: 'sections', label: 'Sections', icon: 'LayoutTemplate' },
  { id: 'mobile', label: 'Mobile', icon: 'Smartphone' },
  { id: 'threed', label: '3D', icon: 'Box' },
  { id: 'decor', label: 'Backgrounds', icon: 'Paintbrush' },
  { id: 'templates', label: 'Page templates', icon: 'Files' },
];

const L = [];
const add = (cat, name, make, extra = {}) => L.push({ id: `${cat}-${L.length}`, cat, name, make, ...extra });

// BASICS
add('basic', 'Frame', (t) => F({ name: 'Frame', w: 320, h: 200, fill: solid(t.surface), radius: 16 }));
add('basic', 'Auto-layout row', (t) => row({ name: 'Row', fill: solid(t.surface), radius: 14, layout: { gap: 12, pad: pad(16) } }, [F({ w: 60, h: 60, fill: solid(t.accent), radius: 10 }), F({ w: 60, h: 60, fill: solid(t.accent2), radius: 10 }), F({ w: 60, h: 60, fill: solid(t.surface2), radius: 10 })]));
add('basic', 'Auto-layout column', (t) => col({ name: 'Stack', fill: solid(t.surface), radius: 14, layout: { gap: 10, pad: pad(16) } }, [F({ w: 160, h: 36, fill: solid(t.accent), radius: 8 }), F({ w: 160, h: 36, fill: solid(t.surface2), radius: 8 }), F({ w: 160, h: 36, fill: solid(t.surface2), radius: 8 })]));
add('basic', 'Rectangle', (t) => F({ name: 'Rectangle', w: 200, h: 120, fill: solid(t.accent), radius: 0 }));
add('basic', 'Rounded box', (t) => F({ name: 'Box', w: 200, h: 120, fill: solid(t.surface2), radius: 20 }));
add('basic', 'Circle', (t) => F({ name: 'Circle', w: 120, h: 120, fill: solid(t.accent2), radius: 999 }));
add('basic', 'Gradient blob', (t) => F({ name: 'Blob', w: 180, h: 180, fill: lin(t.accent, t.accent2), radii: [60, 120, 70, 140] }));
add('basic', 'Line', (t) => F({ name: 'Line', w: 300, h: 1, fill: solid(t.line) }));
add('basic', 'Text', (t) => T('Your text here', { color: t.text, w: 240, sizeW: 'hug' }));
add('basic', 'Paragraph', (t) => T('Forge lets you design visually and ship real code. Every element is fully editable — fonts, colours, effects, motion and more.', { color: t.mute, w: 380, fs: 16, lh: 1.6, valign: 'top' }));
add('basic', 'Image', () => img(photo('forge'), { w: 320, h: 220, radius: 16 }));
add('basic', 'Icon', (t) => I('Sparkles', { w: 32, h: 32, color: t.accent }));
add('basic', 'Video', () => createNode('video', { src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4' }));
add('basic', 'Custom HTML / CSS', () => createNode('code', {}));
add('basic', 'Embed (iframe)', () => createNode('code', { name: 'Embed', w: 480, h: 270, html: '<iframe src="https://www.openstreetmap.org/export/embed.html?bbox=-0.15,51.49,-0.1,51.52" style="width:100%;height:100%;border:0"></iframe>', css: '' }));

// TYPOGRAPHY
add('type', 'Display', (t) => T('Make it iconic.', { fs: 88, fw: 800, ls: -3, lh: 1, color: t.text, sizeW: 'hug' }));
add('type', 'Heading 1', (t) => T('Heading one', { fs: 56, fw: 800, ls: -1.5, lh: 1.05, color: t.text, sizeW: 'hug' }));
add('type', 'Heading 2', (t) => T('Heading two', { fs: 40, fw: 700, ls: -1, lh: 1.1, color: t.text, sizeW: 'hug' }));
add('type', 'Heading 3', (t) => T('Heading three', { fs: 28, fw: 700, ls: -0.5, color: t.text, sizeW: 'hug' }));
add('type', 'Gradient headline', (t) => T('Build the future', { fs: 64, fw: 800, ls: -2, lh: 1.05, gradText: true, fill: lin(t.accent, t.accent2, 90), sizeW: 'hug' }));
add('type', 'Eyebrow', (t) => T('NEW FEATURE', { fs: 12, fw: 700, ls: 2.5, color: t.accent, sizeW: 'hug' }));
add('type', 'Serif headline', (t) => T('Elegant by design', { font: 'Instrument Serif', fs: 64, fw: 400, italic: true, color: t.text, sizeW: 'hug' }));
add('type', 'Mono label', (t) => T('npm i forge-studio', { font: 'JetBrains Mono', fs: 14, color: t.mute, sizeW: 'hug' }));
add('type', 'Quote', (t) => col({ name: 'Quote', w: 460, sizeW: 'fixed', layout: { gap: 14 } }, [I('Quote', { w: 32, h: 32, color: t.accent }), T('“The best way to predict the future is to design it.”', { fs: 26, fw: 500, lh: 1.35, color: t.text, ...fillW }), T('— Buckminster Fuller', { fs: 14, color: t.mute, sizeW: 'hug' })]));
add('type', 'Outline text', (t) => T('OUTLINE', { fs: 96, fw: 900, color: 'transparent', textShadow: `1px 1px 0 ${t.text}, -1px -1px 0 ${t.text}, 1px -1px 0 ${t.text}, -1px 1px 0 ${t.text}`, sizeW: 'hug' }));
add('type', 'Glow text', () => T('NEON', { font: 'Orbitron', fs: 80, fw: 800, color: '#ffffff', textShadow: '0 0 8px #00e5ff, 0 0 24px #00e5ff, 0 0 48px #00a2ff', sizeW: 'hug' }));
add('type', 'Link', (t) => row({ name: 'Link' }, [T('Learn more', { fs: 15, fw: 600, color: t.accent, sizeW: 'hug' }), I('ArrowRight', { w: 16, h: 16, color: t.accent })]));
add('type', 'Badge', (t) => row({ name: 'Badge', fill: solid(t.accent + '22'), radius: 999, layout: { pad: pad(5, 12), gap: 6 } }, [F({ w: 6, h: 6, radius: 99, fill: solid(t.accent) }), T('Now in beta', { fs: 12, fw: 600, color: t.accent, sizeW: 'hug' })]));
add('type', 'Text with icon', (t) => row({ name: 'Feature line', layout: { gap: 10 } }, [I('CircleCheck', { w: 20, h: 20, color: '#22c55e' }), T('Unlimited projects & exports', { fs: 15, color: t.text, sizeW: 'hug' })]));

// BUTTONS
['primary', 'secondary', 'outline', 'ghost', 'gradient', 'glass', 'neon', 'danger', 'success', 'white', 'dark', 'soft', 'brutal'].forEach((v) =>
  add('buttons', `${v[0].toUpperCase() + v.slice(1)} button`, (t) => btn(t, v === 'danger' ? 'Delete' : v === 'success' ? 'Confirm' : 'Get started', v)));
add('buttons', 'Pill + arrow', (t) => btn(t, 'Continue', 'primary', { pill: true, icon: 'ArrowRight', iconRight: true }));
add('buttons', 'Icon + label', (t) => btn(t, 'Download', 'secondary', { icon: 'Download' }));
add('buttons', 'Large CTA', (t) => btn(t, 'Start free trial', 'gradient', { big: true, pill: true, fs: 17, icon: 'Sparkles' }));
add('buttons', 'Small', (t) => btn(t, 'Edit', 'secondary', { small: true, icon: 'Pencil', fs: 13 }));
add('buttons', 'Icon button', (t) => row({ name: 'Icon button', w: 44, h: 44, sizeW: 'fixed', sizeH: 'fixed', fill: solid(t.surface2), radius: 12, layout: { justify: 'center' }, anim: { hover: 'grow' } }, [I('Heart', { w: 20, h: 20, color: t.text })]));
add('buttons', 'Round FAB', (t) => row({ name: 'FAB', w: 60, h: 60, sizeW: 'fixed', sizeH: 'fixed', fill: lin(t.accent, t.accent2), radius: 999, layout: { justify: 'center' }, shadows: [{ x: 0, y: 10, blur: 30, spread: -6, color: t.accent, inset: false }], anim: { hover: 'rotate' } }, [I('Plus', { w: 26, h: 26, color: '#fff', stroke: 2.5 })]));
add('buttons', 'Button group', (t) => row({ name: 'Segmented', fill: solid(t.surface2), radius: 12, layout: { gap: 4, pad: pad(4) } }, ['Day', 'Week', 'Month'].map((x, i) => row({ fill: i === 1 ? solid(t.surface) : none, radius: 9, layout: { pad: pad(8, 16) }, shadows: i === 1 ? soft : [] }, [T(x, { fs: 14, fw: 600, color: i === 1 ? t.text : t.mute, sizeW: 'hug' })]))));
add('buttons', 'Store badges', () => row({ name: 'Store buttons', layout: { gap: 12 } }, [['Apple', 'App Store'], ['Play', 'Google Play']].map(([ic, l]) => row({ fill: solid('#000'), radius: 12, border: { w: 1, color: '#ffffff33', style: 'solid' }, layout: { gap: 10, pad: pad(10, 16) } }, [I(ic === 'Apple' ? 'Apple' : 'Play', { w: 24, h: 24, color: '#fff' }), col({ layout: { gap: 0 } }, [T(ic === 'Apple' ? 'Download on the' : 'Get it on', { fs: 10, color: '#ffffffaa', sizeW: 'hug' }), T(l, { fs: 16, fw: 600, color: '#fff', sizeW: 'hug' })])]))));
add('buttons', 'Shine button', (t) => btn(t, 'Upgrade to Pro', 'gradient', { icon: 'Crown', hover: 'shine', pill: true }));
add('buttons', 'Like counter', (t) => row({ name: 'Like', fill: solid('#ff4f6a22'), radius: 999, layout: { pad: pad(8, 14), gap: 6 }, anim: { hover: 'grow' } }, [I('Heart', { w: 18, h: 18, color: '#ff4f6a' }), T('2.4k', { fs: 14, fw: 600, color: '#ff4f6a', sizeW: 'hug' })]));

// FORMS
add('forms', 'Text input', (t) => input(t, 'Your name', null, { sizeW: 'fixed' }));
add('forms', 'Search', (t) => input(t, 'Search anything…', 'Search'));
add('forms', 'Email', (t) => input(t, 'you@email.com', 'Mail'));
add('forms', 'Password', (t) => input(t, '••••••••', 'Lock', { inputType: 'password' }));
add('forms', 'Labeled field', (t) => col({ name: 'Field', w: 300, sizeW: 'fixed', layout: { gap: 8 } }, [T('Email address', { fs: 13, fw: 600, color: t.text, sizeW: 'hug' }), input(t, 'you@company.com'), T('We never share your email.', { fs: 12, color: t.mute, sizeW: 'hug' })]));
add('forms', 'Textarea', (t) => createNode('input', { name: 'Textarea', inputType: 'textarea', placeholder: 'Write a message…', w: 320, h: 120, fill: solid(t.surface2), color: t.text, border: { w: 1, color: t.line, style: 'solid' }, radius: 12 }));
add('forms', 'Toggle', (t) => row({ name: 'Toggle row', layout: { gap: 12 } }, [createNode('toggle', { color: t.accent }), T('Dark mode', { fs: 15, color: t.text, sizeW: 'hug' })]));
add('forms', 'Checkbox', (t) => row({ name: 'Checkbox row', layout: { gap: 10 } }, [createNode('checkbox', { color: t.accent }), T('I agree to the terms', { fs: 15, color: t.text, sizeW: 'hug' })]));
add('forms', 'Radio group', (t) => col({ name: 'Radio group', layout: { gap: 10 } }, ['Starter', 'Pro', 'Enterprise'].map((x, i) => row({ layout: { gap: 10 } }, [F({ w: 20, h: 20, radius: 99, fill: none, border: { w: i === 1 ? 6 : 2, color: i === 1 ? t.accent : t.line, style: 'solid' } }), T(x, { fs: 15, color: t.text, sizeW: 'hug' })]))));
add('forms', 'Slider', (t) => col({ name: 'Slider', w: 260, sizeW: 'fixed', layout: { gap: 10 } }, [row({ ...fillW, layout: { justify: 'between' } }, [T('Volume', { fs: 14, color: t.text, sizeW: 'hug' }), T('60%', { fs: 14, color: t.mute, sizeW: 'hug' })]), createNode('slider', { color: t.accent, track: t.line, sizeW: 'fill' })]));
add('forms', 'Select', (t) => row({ name: 'Select', w: 260, sizeW: 'fixed', h: 46, sizeH: 'fixed', fill: solid(t.surface2), radius: 12, border: { w: 1, color: t.line, style: 'solid' }, layout: { pad: pad(0, 14), justify: 'between' } }, [T('Choose an option', { fs: 15, color: t.mute, sizeW: 'hug' }), I('ChevronDown', { w: 18, h: 18, color: t.mute })]));
add('forms', 'OTP code', (t) => row({ name: 'OTP', layout: { gap: 10 } }, ['4', '8', '1', ''].map((d, i) => row({ w: 56, h: 64, sizeW: 'fixed', sizeH: 'fixed', fill: solid(t.surface2), radius: 14, border: { w: i === 3 ? 2 : 1, color: i === 3 ? t.accent : t.line, style: 'solid' }, layout: { justify: 'center' } }, [T(d || ' ', { fs: 26, fw: 700, color: t.text, sizeW: 'hug' })]))));
add('forms', 'Newsletter', (t) => row({ name: 'Newsletter', w: 460, sizeW: 'fixed', fill: solid(t.surface), radius: 16, border: { w: 1, color: t.line, style: 'solid' }, layout: { gap: 8, pad: pad(6) } }, [createNode('input', { placeholder: 'Enter your email', sizeW: 'fill', h: 46, fill: none, color: t.text, border: { w: 0 }, radius: 10 }), btn(t, 'Subscribe', 'primary', { radius: 11 })]));
add('forms', 'Login form', (t) => card(t, [T('Welcome back', { fs: 26, fw: 700, color: t.text, sizeW: 'hug' }), T('Sign in to continue to your workspace', { fs: 14, color: t.mute, ...fillW }), input(t, 'Email', 'Mail'), input(t, 'Password', 'Lock', { inputType: 'password' }), row({ ...fillW, layout: { justify: 'between' } }, [row({ layout: { gap: 8 } }, [createNode('checkbox', { color: t.accent, w: 18, h: 18 }), T('Remember me', { fs: 13, color: t.mute, sizeW: 'hug' })]), T('Forgot?', { fs: 13, fw: 600, color: t.accent, sizeW: 'hug' })]), { ...btn(t, 'Sign in', 'primary'), sizeW: 'fill' }, row({ ...fillW, layout: { justify: 'center' } }, [T('No account? ', { fs: 13, color: t.mute, sizeW: 'hug' }), T('Create one', { fs: 13, fw: 600, color: t.accent, sizeW: 'hug' })])], { w: 380, layout: { gap: 16, pad: pad(32) } }));
add('forms', 'Contact form', (t) => card(t, [T('Get in touch', { fs: 24, fw: 700, color: t.text, sizeW: 'hug' }), row({ ...fillW, layout: { gap: 12 } }, [input(t, 'First name'), input(t, 'Last name')]), input(t, 'Email', 'Mail'), createNode('input', { inputType: 'textarea', placeholder: 'Your message', sizeW: 'fill', h: 110, fill: solid(t.surface2), color: t.text, border: { w: 1, color: t.line, style: 'solid' }, radius: 12 }), { ...btn(t, 'Send message', 'gradient', { icon: 'Send', iconRight: true }), sizeW: 'fill' }], { w: 440, layout: { gap: 14, pad: pad(28) } }));
add('forms', 'Tag input', (t) => row({ name: 'Tags', w: 340, sizeW: 'fixed', fill: solid(t.surface2), radius: 12, border: { w: 1, color: t.line, style: 'solid' }, layout: { gap: 6, pad: pad(8), wrap: true, align: 'center' } }, ['design', 'react', 'three.js'].map((x) => row({ fill: solid(t.accent + '26'), radius: 8, layout: { pad: pad(4, 8), gap: 4 } }, [T(x, { fs: 13, color: t.accent, sizeW: 'hug' }), I('X', { w: 12, h: 12, color: t.accent })]))));
add('forms', 'File upload', (t) => col({ name: 'Dropzone', w: 360, sizeW: 'fixed', fill: solid(t.surface), radius: 16, border: { w: 2, color: t.line, style: 'dashed' }, layout: { gap: 10, pad: pad(32), align: 'center' } }, [row({ w: 52, h: 52, sizeW: 'fixed', sizeH: 'fixed', fill: solid(t.accent + '22'), radius: 14, layout: { justify: 'center' } }, [I('CloudUpload', { w: 26, h: 26, color: t.accent })]), T('Drop files here or browse', { fs: 15, fw: 600, color: t.text, sizeW: 'hug' }), T('PNG, JPG, PDF up to 50MB', { fs: 13, color: t.mute, sizeW: 'hug' })]));

// CARDS
add('cards', 'Simple card', (t) => card(t, [row({ w: 44, h: 44, sizeW: 'fixed', sizeH: 'fixed', fill: solid(t.accent + '22'), radius: 12, layout: { justify: 'center' } }, [I('Zap', { w: 22, h: 22, color: t.accent })]), T('Lightning fast', { fs: 20, fw: 700, color: t.text, sizeW: 'hug' }), T('Ship pixel-perfect interfaces in minutes, not days.', { fs: 15, lh: 1.55, color: t.mute, ...fillW })]));
add('cards', 'Glass card', (t) => card(t, [T('Glassmorphism', { fs: 22, fw: 700, color: '#fff', sizeW: 'hug' }), T('Frosted, layered and luminous.', { fs: 15, color: '#ffffffb3', ...fillW })], { fill: solid('#ffffff12'), backdrop: 24, border: { w: 1, color: '#ffffff2e', style: 'solid' } }));
add('cards', 'Image card', (t) => col({ name: 'Image card', w: 320, sizeW: 'fixed', fill: solid(t.surface), radius: 20, clip: true, border: { w: 1, color: t.line, style: 'solid' }, layout: { gap: 0 }, anim: { hover: 'lift' } }, [img(photo('mountain'), { sizeW: 'fill', h: 190, radius: 0 }), col({ ...fillW, layout: { gap: 8, pad: pad(20) } }, [T('TRAVEL', { fs: 11, fw: 700, ls: 2, color: t.accent, sizeW: 'hug' }), T('Into the alpine silence', { fs: 19, fw: 700, color: t.text, ...fillW }), T('A week of hiking, cabins and quiet mornings.', { fs: 14, color: t.mute, ...fillW })])]));
add('cards', 'Profile card', (t) => card(t, [img(avatarImg(12), { w: 84, h: 84, radius: 999, border: { w: 3, color: t.accent, style: 'solid' } }), T('Ava Martinez', { fs: 20, fw: 700, color: t.text, sizeW: 'hug' }), T('Product Designer · Lisbon', { fs: 14, color: t.mute, sizeW: 'hug' }), row({ layout: { gap: 24, pad: pad(8, 0) } }, [['1.2k', 'Posts'], ['48k', 'Followers'], ['312', 'Following']].map(([a, b]) => col({ layout: { gap: 2, align: 'center' } }, [T(a, { fs: 18, fw: 700, color: t.text, sizeW: 'hug' }), T(b, { fs: 12, color: t.mute, sizeW: 'hug' })]))), row({ ...fillW, layout: { gap: 10 } }, [{ ...btn(t, 'Follow', 'primary'), sizeW: 'fill' }, { ...btn(t, 'Message', 'secondary'), sizeW: 'fill' }])], { layout: { gap: 10, pad: pad(28), align: 'center' } }));
add('cards', 'Pricing card', (t) => card(t, [row({ ...fillW, layout: { justify: 'between' } }, [T('Pro', { fs: 18, fw: 700, color: t.text, sizeW: 'hug' }), row({ fill: lin(t.accent, t.accent2), radius: 99, layout: { pad: pad(4, 10) } }, [T('POPULAR', { fs: 10, fw: 800, ls: 1, color: '#fff', sizeW: 'hug' })])]), row({ layout: { gap: 4, align: 'end' } }, [T('$29', { fs: 48, fw: 800, color: t.text, sizeW: 'hug' }), T('/month', { fs: 15, color: t.mute, sizeW: 'hug' })]), F({ sizeW: 'fill', h: 1, fill: solid(t.line) }), ...['Unlimited projects', 'Code export', '3D components', 'Priority support'].map((x) => row({ layout: { gap: 10 } }, [I('Check', { w: 18, h: 18, color: '#22c55e' }), T(x, { fs: 15, color: t.text, sizeW: 'hug' })])), { ...btn(t, 'Choose Pro', 'gradient'), sizeW: 'fill' }], { w: 320, layout: { gap: 14, pad: pad(28) }, border: { w: 1.5, color: t.accent, style: 'solid' } }));
add('cards', 'Stat card', (t) => card(t, [row({ ...fillW, layout: { justify: 'between' } }, [T('Revenue', { fs: 14, color: t.mute, sizeW: 'hug' }), I('TrendingUp', { w: 18, h: 18, color: '#22c55e' })]), T('$48,920', { fs: 34, fw: 800, color: t.text, sizeW: 'hug' }), row({ layout: { gap: 6 } }, [row({ fill: solid('#22c55e22'), radius: 6, layout: { pad: pad(2, 6) } }, [T('+12.4%', { fs: 12, fw: 700, color: '#22c55e', sizeW: 'hug' })]), T('vs last month', { fs: 12, color: t.mute, sizeW: 'hug' })])], { w: 260 }));
add('cards', 'Testimonial', (t) => card(t, [stars(), T('“Forge replaced three tools for our team. We go from idea to shipped UI in an afternoon.”', { fs: 16, lh: 1.55, color: t.text, ...fillW }), row({ layout: { gap: 12 } }, [img(avatarImg(32), { w: 42, h: 42, radius: 99 }), col({ layout: { gap: 2 } }, [T('Liam Chen', { fs: 14, fw: 700, color: t.text, sizeW: 'hug' }), T('CTO, Northwind', { fs: 13, color: t.mute, sizeW: 'hug' })])])], { w: 360, layout: { gap: 16, pad: pad(24) } }));
add('cards', 'Product card', (t) => col({ name: 'Product', w: 260, sizeW: 'fixed', fill: solid(t.surface), radius: 20, clip: true, layout: { gap: 0 }, anim: { hover: 'lift' } }, [img(photo('sneaker', 600, 600), { sizeW: 'fill', h: 220, radius: 0 }), col({ ...fillW, layout: { gap: 6, pad: pad(16) } }, [T('Aero Runner X', { fs: 16, fw: 700, color: t.text, sizeW: 'hug' }), stars(5), row({ ...fillW, layout: { justify: 'between' } }, [T('$129', { fs: 20, fw: 800, color: t.text, sizeW: 'hug' }), row({ w: 38, h: 38, sizeW: 'fixed', sizeH: 'fixed', fill: solid(t.accent), radius: 10, layout: { justify: 'center' } }, [I('ShoppingBag', { w: 18, h: 18, color: '#fff' })])])])]));
add('cards', 'Feature card (gradient)', (t) => card(t, [I('Rocket', { w: 36, h: 36, color: '#fff' }), T('Launch faster', { fs: 22, fw: 800, color: '#fff', sizeW: 'hug' }), T('Deploy to web, Android and desktop with one click.', { fs: 15, color: '#ffffffcc', ...fillW })], { fill: lin(t.accent, t.accent2), border: { w: 0 }, shadows: [{ x: 0, y: 20, blur: 40, spread: -10, color: t.accent + 'aa', inset: false }] }));
add('cards', 'Notification', (t) => row({ name: 'Notification', w: 360, sizeW: 'fixed', fill: solid(t.surface), radius: 16, border: { w: 1, color: t.line, style: 'solid' }, shadows: soft, layout: { gap: 12, pad: pad(14), align: 'start' } }, [img(avatarImg(5), { w: 40, h: 40, radius: 99 }), col({ sizeW: 'fill', layout: { gap: 3 } }, [row({ ...fillW, layout: { justify: 'between' } }, [T('Sofia Rossi', { fs: 14, fw: 700, color: t.text, sizeW: 'hug' }), T('2m', { fs: 12, color: t.mute, sizeW: 'hug' })]), T('Commented on your design: “Love the motion here!”', { fs: 13, color: t.mute, ...fillW })])]));
add('cards', 'Blog card', (t) => col({ name: 'Blog card', w: 340, sizeW: 'fixed', layout: { gap: 12 } }, [img(photo('desk'), { sizeW: 'fill', h: 200, radius: 16 }), row({ layout: { gap: 8 } }, [T('Design', { fs: 12, fw: 700, color: t.accent, sizeW: 'hug' }), T('· 6 min read', { fs: 12, color: t.mute, sizeW: 'hug' })]), T('The art of motion in interfaces', { fs: 20, fw: 700, color: t.text, ...fillW }), T('How micro-interactions make products feel alive.', { fs: 14, color: t.mute, ...fillW })]));
add('cards', 'Credit card', () => col({ name: 'Credit card', w: 340, h: 210, sizeW: 'fixed', sizeH: 'fixed', fill: lin('#1e1b4b', '#7c3aed', 125, '#db2777'), radius: 20, shadows: [{ x: 0, y: 24, blur: 50, spread: -14, color: '#7c3aedaa', inset: false }], layout: { gap: 0, pad: pad(24), justify: 'between' }, anim: { hover: 'tilt' } }, [row({ ...fillW, layout: { justify: 'between' } }, [T('FORGE', { fs: 16, fw: 800, ls: 3, color: '#fff', sizeW: 'hug' }), I('Nfc', { w: 24, h: 24, color: '#fff' })]), T('4242  ••••  ••••  1028', { font: 'JetBrains Mono', fs: 20, color: '#fff', sizeW: 'hug' }), row({ ...fillW, layout: { justify: 'between' } }, [T('AVA MARTINEZ', { fs: 13, fw: 600, ls: 1, color: '#ffffffcc', sizeW: 'hug' }), T('09/29', { fs: 13, color: '#ffffffcc', sizeW: 'hug' })])]));
add('cards', 'Team member', (t) => col({ name: 'Team member', w: 220, sizeW: 'fixed', layout: { gap: 8, align: 'center' } }, [img(avatarImg(47), { w: 120, h: 120, radius: 999 }), T('Noah Patel', { fs: 17, fw: 700, color: t.text, sizeW: 'hug' }), T('Engineering Lead', { fs: 13, color: t.mute, sizeW: 'hug' }), row({ layout: { gap: 10 } }, ['Twitter', 'Linkedin', 'Github'].map((x) => I(x, { w: 18, h: 18, color: t.mute })))]));

// NAVIGATION
add('nav', 'Navbar', (t) => row({ name: 'Navbar', w: 1200, sizeW: 'fixed', fill: solid(t.surface + 'cc'), backdrop: 16, radius: 16, border: { w: 1, color: t.line, style: 'solid' }, layout: { pad: pad(12, 20), justify: 'between' } }, [row({ layout: { gap: 10 } }, [row({ w: 32, h: 32, sizeW: 'fixed', sizeH: 'fixed', fill: lin(t.accent, t.accent2), radius: 9, layout: { justify: 'center' } }, [I('Zap', { w: 18, h: 18, color: '#fff' })]), T('Forge', { fs: 18, fw: 800, color: t.text, sizeW: 'hug' })]), row({ layout: { gap: 28 } }, ['Product', 'Features', 'Pricing', 'Docs', 'Blog'].map((x) => T(x, { fs: 15, fw: 500, color: t.mute, sizeW: 'hug', anim: { hover: 'brighten' } }))), row({ layout: { gap: 10 } }, [btn(t, 'Log in', 'ghost', { small: true }), btn(t, 'Sign up', 'primary', { small: true })])]));
add('nav', 'Bottom tab bar', (t) => row({ name: 'Tab bar', w: 390, sizeW: 'fixed', fill: solid(t.surface), radius: 24, border: { w: 1, color: t.line, style: 'solid' }, shadows: soft, layout: { pad: pad(12, 20), justify: 'between' } }, [['House', 'Home'], ['Search', 'Search'], ['Heart', 'Saved'], ['User', 'Profile']].map(([ic, l], i) => col({ layout: { gap: 4, align: 'center' } }, [I(ic, { w: 22, h: 22, color: i === 0 ? t.accent : t.mute }), T(l, { fs: 11, fw: 600, color: i === 0 ? t.accent : t.mute, sizeW: 'hug' })]))));
add('nav', 'Sidebar', (t) => col({ name: 'Sidebar', w: 260, h: 640, sizeW: 'fixed', sizeH: 'fixed', fill: solid(t.surface), border: { w: 1, color: t.line, style: 'solid' }, radius: 20, layout: { gap: 4, pad: pad(20, 14) } }, [row({ layout: { gap: 10, pad: pad(0, 8, 16, 8) } }, [row({ w: 32, h: 32, sizeW: 'fixed', sizeH: 'fixed', fill: lin(t.accent, t.accent2), radius: 9, layout: { justify: 'center' } }, [I('Zap', { w: 18, h: 18, color: '#fff' })]), T('Forge', { fs: 18, fw: 800, color: t.text, sizeW: 'hug' })]), ...[['LayoutDashboard', 'Dashboard'], ['ChartLine', 'Analytics'], ['FolderKanban', 'Projects'], ['Users', 'Team'], ['MessageSquare', 'Messages'], ['Settings', 'Settings']].map(([ic, l], i) => row({ ...fillW, fill: i === 0 ? solid(t.accent + '1f') : none, radius: 10, layout: { gap: 12, pad: pad(10, 12) } }, [I(ic, { w: 18, h: 18, color: i === 0 ? t.accent : t.mute }), T(l, { fs: 14, fw: i === 0 ? 600 : 500, color: i === 0 ? t.text : t.mute, sizeW: 'hug' })]))]));
add('nav', 'Tabs', (t) => row({ name: 'Tabs', layout: { gap: 24 }, border: { w: 0 } }, ['Overview', 'Activity', 'Settings'].map((x, i) => col({ layout: { gap: 10, align: 'center' } }, [T(x, { fs: 15, fw: 600, color: i === 0 ? t.text : t.mute, sizeW: 'hug' }), F({ sizeW: 'fill', h: 2, radius: 2, fill: solid(i === 0 ? t.accent : 'transparent') })]))));
add('nav', 'Breadcrumbs', (t) => row({ name: 'Breadcrumbs', layout: { gap: 8 } }, ['Home', '/', 'Projects', '/', 'Forge'].map((x, i) => T(x, { fs: 14, color: i === 4 ? t.text : t.mute, fw: i === 4 ? 600 : 400, sizeW: 'hug' }))));
add('nav', 'Pagination', (t) => row({ name: 'Pagination', layout: { gap: 6 } }, ['‹', '1', '2', '3', '…', '9', '›'].map((x, i) => row({ w: 38, h: 38, sizeW: 'fixed', sizeH: 'fixed', radius: 10, fill: i === 2 ? solid(t.accent) : solid(t.surface2), layout: { justify: 'center' } }, [T(x, { fs: 14, fw: 600, color: i === 2 ? '#fff' : t.text, sizeW: 'hug' })]))));
add('nav', 'Stepper', (t) => row({ name: 'Stepper', layout: { gap: 10 } }, [1, 2, 3, 4].flatMap((n, i) => { const done = n < 3; const nodes = [row({ w: 34, h: 34, sizeW: 'fixed', sizeH: 'fixed', radius: 99, fill: solid(done ? t.accent : n === 3 ? t.accent + '22' : t.surface2), border: { w: n === 3 ? 2 : 0, color: t.accent, style: 'solid' }, layout: { justify: 'center' } }, [done ? I('Check', { w: 16, h: 16, color: '#fff' }) : T(String(n), { fs: 14, fw: 700, color: n === 3 ? t.accent : t.mute, sizeW: 'hug' })])]; if (i < 3) nodes.push(F({ w: 50, h: 2, fill: solid(done ? t.accent : t.line) })); return nodes; })));
add('nav', 'Footer', (t) => row({ name: 'Footer', w: 1200, sizeW: 'fixed', layout: { justify: 'between', align: 'start', pad: pad(40, 0) } }, [col({ layout: { gap: 10 } }, [T('Forge', { fs: 20, fw: 800, color: t.text, sizeW: 'hug' }), T('Design. Code. Ship.', { fs: 14, color: t.mute, sizeW: 'hug' })]), ...[['Product', ['Features', 'Pricing', 'Changelog']], ['Company', ['About', 'Careers', 'Press']], ['Resources', ['Docs', 'Community', 'Support']]].map(([h, items]) => col({ layout: { gap: 10 } }, [T(h, { fs: 14, fw: 700, color: t.text, sizeW: 'hug' }), ...items.map((x) => T(x, { fs: 14, color: t.mute, sizeW: 'hug' }))]))]));
add('nav', 'Mobile header', (t) => row({ name: 'App header', w: 390, sizeW: 'fixed', layout: { justify: 'between', pad: pad(12, 20) } }, [I('ChevronLeft', { w: 24, h: 24, color: t.text }), T('Details', { fs: 17, fw: 700, color: t.text, sizeW: 'hug' }), I('Ellipsis', { w: 24, h: 24, color: t.text })]));
add('nav', 'Command bar', (t) => row({ name: 'Command bar', w: 520, sizeW: 'fixed', fill: solid(t.surface), radius: 14, border: { w: 1, color: t.line, style: 'solid' }, shadows: soft, layout: { gap: 12, pad: pad(14, 16) } }, [I('Search', { w: 18, h: 18, color: t.mute }), T('Search or jump to…', { fs: 15, color: t.mute, sizeW: 'fill' }), row({ fill: solid(t.surface2), radius: 6, layout: { pad: pad(3, 8) } }, [T('⌘K', { fs: 12, fw: 600, color: t.mute, sizeW: 'hug' })])]));

// DATA
const chart = (kind, extra = {}) => (t) => createNode('chart', { kind, color: t.accent, color2: t.accent2, gridColor: t.line, labelColor: t.mute, ...extra });
add('data', 'Bar chart', chart('bar'));
add('data', 'Line chart', chart('line'));
add('data', 'Area chart', chart('area'));
add('data', 'Donut chart', chart('donut', { w: 200, h: 200, data: [45, 25, 18, 12] }));
add('data', 'Pie chart', chart('pie', { w: 200, h: 200, data: [40, 30, 20, 10] }));
add('data', 'Sparkline', chart('sparkline', { w: 140, h: 40, grid: false }));
add('data', 'Radial progress', (t) => createNode('progress', { ring: true, w: 120, h: 120, value: 72, color: t.accent, track: t.line }));
add('data', 'Progress bar', (t) => col({ name: 'Progress', w: 280, sizeW: 'fixed', layout: { gap: 8 } }, [row({ ...fillW, layout: { justify: 'between' } }, [T('Storage', { fs: 14, color: t.text, sizeW: 'hug' }), T('65%', { fs: 14, color: t.mute, sizeW: 'hug' })]), createNode('progress', { sizeW: 'fill', color: t.accent, track: t.line })]));
add('data', 'Chart card', (t) => card(t, [row({ ...fillW, layout: { justify: 'between' } }, [col({ layout: { gap: 4 } }, [T('Weekly visitors', { fs: 14, color: t.mute, sizeW: 'hug' }), T('128,402', { fs: 28, fw: 800, color: t.text, sizeW: 'hug' })]), btn(t, 'Week', 'secondary', { small: true, icon: 'ChevronDown', iconRight: true, fs: 13 })]), createNode('chart', { kind: 'area', sizeW: 'fill', h: 160, color: t.accent, color2: t.accent2, gridColor: t.line, labelColor: t.mute })], { w: 440 }));
add('data', 'KPI row', (t) => row({ name: 'KPIs', layout: { gap: 16 } }, [['Users', '24.8k', '+8%'], ['Sessions', '91.2k', '+14%'], ['Bounce', '32%', '-3%'], ['Revenue', '$12.4k', '+21%']].map(([a, b, c]) => card(t, [T(a, { fs: 13, color: t.mute, sizeW: 'hug' }), T(b, { fs: 26, fw: 800, color: t.text, sizeW: 'hug' }), T(c, { fs: 12, fw: 700, color: c.startsWith('-') ? '#ef4444' : '#22c55e', sizeW: 'hug' })], { w: 180, layout: { gap: 6, pad: pad(18) } }))));
add('data', 'Table', (t) => col({ name: 'Table', w: 640, sizeW: 'fixed', fill: solid(t.surface), radius: 16, border: { w: 1, color: t.line, style: 'solid' }, clip: true, layout: { gap: 0 } }, [['Customer', 'Plan', 'Status', 'Amount'], ['Ava Martinez', 'Pro', 'Active', '$29'], ['Liam Chen', 'Team', 'Active', '$99'], ['Sofia Rossi', 'Starter', 'Trial', '$0'], ['Noah Patel', 'Pro', 'Past due', '$29']].map((r, i) => row({ ...fillW, fill: i === 0 ? solid(t.surface2) : none, border: { w: 0 }, layout: { gap: 0, pad: pad(14, 20) } }, r.map((c, j) => (j === 2 && i > 0 ? row({ sizeW: 'fill' }, [row({ fill: solid(c === 'Active' ? '#22c55e22' : c === 'Trial' ? '#eab30822' : '#ef444422'), radius: 99, layout: { pad: pad(3, 10) } }, [T(c, { fs: 12, fw: 600, color: c === 'Active' ? '#22c55e' : c === 'Trial' ? '#eab308' : '#ef4444', sizeW: 'hug' })])]) : T(c, { fs: 14, fw: i === 0 ? 600 : 400, color: i === 0 ? t.mute : t.text, sizeW: 'fill' })))))));
add('data', 'Avatar group', () => row({ name: 'Avatars', layout: { gap: -10 } }, [1, 5, 9, 12, 15].map((s) => img(avatarImg(s), { w: 40, h: 40, radius: 99, border: { w: 2, color: '#0b0b12', style: 'solid' } }))));
add('data', 'Timeline', (t) => col({ name: 'Timeline', w: 340, sizeW: 'fixed', layout: { gap: 18 } }, [['Project created', '9:00 AM'], ['Design approved', '11:24 AM'], ['Deployed to production', '3:10 PM']].map(([a, b], i) => row({ ...fillW, layout: { gap: 14, align: 'start' } }, [F({ w: 12, h: 12, radius: 99, fill: solid(i === 2 ? t.accent : t.line), border: { w: 3, color: t.accent + '44', style: 'solid' } }), col({ layout: { gap: 2 } }, [T(a, { fs: 15, fw: 600, color: t.text, sizeW: 'hug' }), T(b, { fs: 13, color: t.mute, sizeW: 'hug' })])]))));
add('data', 'Leaderboard', (t) => card(t, [T('Top creators', { fs: 18, fw: 700, color: t.text, sizeW: 'hug' }), ...[['Ava', 12, '9,820'], ['Liam', 32, '8,410'], ['Sofia', 5, '7,995']].map(([n, a, s], i) => row({ ...fillW, layout: { gap: 12 } }, [T(`#${i + 1}`, { fs: 14, fw: 800, color: t.accent, sizeW: 'hug' }), img(avatarImg(a), { w: 34, h: 34, radius: 99 }), T(n, { fs: 15, fw: 600, color: t.text, sizeW: 'fill' }), T(s, { fs: 14, color: t.mute, sizeW: 'hug' })]))], { w: 320 }));

// FEEDBACK
const alert = (kind, icon, col1, title, msg) => (t) => row({ name: `${kind} alert`, w: 420, sizeW: 'fixed', fill: solid(col1 + '1a'), radius: 14, border: { w: 1, color: col1 + '55', style: 'solid' }, layout: { gap: 12, pad: pad(14, 16), align: 'start' } }, [I(icon, { w: 20, h: 20, color: col1 }), col({ sizeW: 'fill', layout: { gap: 3 } }, [T(title, { fs: 14, fw: 700, color: t.text, sizeW: 'hug' }), T(msg, { fs: 13, color: t.mute, ...fillW })])]);
add('feedback', 'Success alert', alert('Success', 'CircleCheck', '#22c55e', 'Payment received', 'Your invoice #2048 has been paid.'));
add('feedback', 'Warning alert', alert('Warning', 'TriangleAlert', '#eab308', 'Storage almost full', 'You have used 92% of your plan.'));
add('feedback', 'Error alert', alert('Error', 'CircleX', '#ef4444', 'Build failed', 'Check the logs for more details.'));
add('feedback', 'Info alert', alert('Info', 'Info', '#3b82f6', 'New version available', 'Forge 2.0 is ready to install.'));
add('feedback', 'Toast', (t) => row({ name: 'Toast', fill: solid('#111118'), radius: 12, shadows: soft, border: { w: 1, color: '#ffffff1a', style: 'solid' }, layout: { gap: 10, pad: pad(12, 16) }, anim: { enter: 'up' } }, [I('CircleCheck', { w: 18, h: 18, color: '#22c55e' }), T('Changes saved', { fs: 14, fw: 500, color: '#fff', sizeW: 'hug' }), T('Undo', { fs: 14, fw: 700, color: t.accent, sizeW: 'hug' })]));
add('feedback', 'Modal dialog', (t) => card(t, [row({ w: 48, h: 48, sizeW: 'fixed', sizeH: 'fixed', fill: solid('#ef444422'), radius: 99, layout: { justify: 'center' } }, [I('Trash2', { w: 22, h: 22, color: '#ef4444' })]), T('Delete project?', { fs: 20, fw: 700, color: t.text, sizeW: 'hug' }), T('This will permanently remove the project and all its pages. This action cannot be undone.', { fs: 14, lh: 1.55, color: t.mute, ...fillW }), row({ ...fillW, layout: { gap: 10, justify: 'end' } }, [btn(t, 'Cancel', 'secondary'), btn(t, 'Delete', 'danger')])], { w: 420, layout: { gap: 14, pad: pad(28) }, anim: { enter: 'pop' } }));
add('feedback', 'Tooltip', () => col({ name: 'Tooltip', layout: { gap: 0, align: 'center' } }, [row({ fill: solid('#111118'), radius: 8, layout: { pad: pad(7, 12) } }, [T('Copy to clipboard', { fs: 13, color: '#fff', sizeW: 'hug' })]), F({ w: 10, h: 10, fill: solid('#111118'), rotation: 45, y: -5 })]));
add('feedback', 'Skeleton', (t) => col({ name: 'Skeleton', w: 320, sizeW: 'fixed', layout: { gap: 12 } }, [row({ ...fillW, layout: { gap: 12 } }, [F({ w: 48, h: 48, radius: 99, fill: lin(t.surface2, t.line, 90, t.surface2), anim: { loop: 'shimmer', loopDur: 1600 } }), col({ sizeW: 'fill', layout: { gap: 8 } }, [F({ sizeW: 'fill', h: 12, radius: 6, fill: lin(t.surface2, t.line, 90, t.surface2), anim: { loop: 'shimmer', loopDur: 1600 } }), F({ w: 140, h: 12, radius: 6, fill: lin(t.surface2, t.line, 90, t.surface2), anim: { loop: 'shimmer', loopDur: 1600 } })])]), F({ sizeW: 'fill', h: 140, radius: 14, fill: lin(t.surface2, t.line, 90, t.surface2), anim: { loop: 'shimmer', loopDur: 1600 } })]));
add('feedback', 'Empty state', (t) => col({ name: 'Empty state', w: 340, sizeW: 'fixed', layout: { gap: 12, align: 'center' } }, [row({ w: 80, h: 80, sizeW: 'fixed', sizeH: 'fixed', fill: solid(t.surface2), radius: 24, layout: { justify: 'center' }, anim: { loop: 'float' } }, [I('Inbox', { w: 36, h: 36, color: t.mute })]), T('No messages yet', { fs: 20, fw: 700, color: t.text, sizeW: 'hug' }), T('When you get messages, they’ll show up here.', { fs: 14, color: t.mute, align: 'center', ...fillW }), btn(t, 'Start a conversation', 'primary', { icon: 'Plus' })]));
add('feedback', 'Spinner', (t) => I('LoaderCircle', { w: 36, h: 36, color: t.accent, anim: { loop: 'spin', loopDur: 900 } }));
add('feedback', 'Live dot', () => row({ name: 'Live', layout: { gap: 8 } }, [F({ w: 10, h: 10, radius: 99, fill: solid('#ef4444'), anim: { loop: 'pulse', loopDur: 1200 } }), T('LIVE', { fs: 12, fw: 800, ls: 2, color: '#ef4444', sizeW: 'hug' })]));
add('feedback', 'Cookie banner', (t) => row({ name: 'Cookie banner', w: 640, sizeW: 'fixed', fill: solid(t.surface), radius: 16, border: { w: 1, color: t.line, style: 'solid' }, shadows: soft, layout: { gap: 16, pad: pad(16, 20) } }, [I('Cookie', { w: 24, h: 24, color: t.accent }), T('We use cookies to improve your experience.', { fs: 14, color: t.text, sizeW: 'fill' }), btn(t, 'Decline', 'ghost', { small: true }), btn(t, 'Accept', 'primary', { small: true })]));

// SECTIONS (1200–1440 wide)
add('sections', 'Hero centered', (t) => col({ name: 'Hero', w: 1200, sizeW: 'fixed', layout: { gap: 24, align: 'center', pad: pad(80, 40) } }, [row({ fill: solid(t.surface2), radius: 999, border: { w: 1, color: t.line, style: 'solid' }, layout: { gap: 8, pad: pad(6, 14) }, anim: { enter: 'fade' } }, [row({ fill: solid(t.accent), radius: 99, layout: { pad: pad(2, 8) } }, [T('NEW', { fs: 11, fw: 800, color: '#fff', sizeW: 'hug' })]), T('Forge 2.0 is here — now with 3D', { fs: 13, color: t.text, sizeW: 'hug' })]), T('Design it. Code it.\nShip it everywhere.', { fs: 76, fw: 800, ls: -3, lh: 1.02, align: 'center', color: t.text, sizeW: 'hug', anim: { enter: 'up', delay: 100 } }), T('The visual builder for teams who want premium interfaces and real, clean code — web, Android and desktop.', { fs: 19, lh: 1.55, color: t.mute, align: 'center', w: 640, sizeW: 'fixed', anim: { enter: 'up', delay: 200 } }), row({ layout: { gap: 12 }, anim: { enter: 'up', delay: 300 } }, [btn(t, 'Start building free', 'gradient', { big: true, pill: true, icon: 'ArrowRight', iconRight: true }), btn(t, 'Watch demo', 'outline', { big: true, pill: true, icon: 'Play' })])]));
add('sections', 'Hero split + 3D', (t) => row({ name: 'Hero split', w: 1200, sizeW: 'fixed', layout: { gap: 40, justify: 'between', pad: pad(60, 40) } }, [col({ sizeW: 'fill', layout: { gap: 22 } }, [T('BUILD IN 3D', { fs: 13, fw: 700, ls: 3, color: t.accent, sizeW: 'hug' }), T('Interfaces with real depth', { fs: 64, fw: 800, ls: -2.5, lh: 1.02, color: t.text, ...fillW, anim: { enter: 'up' } }), T('Drop interactive Three.js scenes into any layout. Tweak materials, lighting and motion live.', { fs: 18, lh: 1.6, color: t.mute, ...fillW }), row({ layout: { gap: 12 } }, [btn(t, 'Get started', 'primary', { big: true }), btn(t, 'Explore', 'ghost', { big: true, icon: 'ArrowRight', iconRight: true })])]), createNode('three', { w: 480, h: 480, shape: 'blob', material: 'distort', color: t.accent, color2: t.accent2 })]));
add('sections', 'Feature grid', (t) => col({ name: 'Features', w: 1200, sizeW: 'fixed', layout: { gap: 40, align: 'center', pad: pad(60, 40) } }, [col({ layout: { gap: 12, align: 'center' } }, [T('FEATURES', { fs: 13, fw: 700, ls: 3, color: t.accent, sizeW: 'hug' }), T('Everything you need to ship', { fs: 44, fw: 800, ls: -1.5, color: t.text, sizeW: 'hug' })]), row({ ...fillW, layout: { gap: 20, wrap: true, justify: 'center', align: 'stretch' } }, [['WandSparkles', 'Visual editing', 'Drag, drop and style anything with pixel precision.'], ['CodeXml', 'Clean code', 'Export React, Vue, HTML, Tailwind and React Native.'], ['Box', '3D scenes', 'Interactive Three.js objects with live materials.'], ['Smartphone', 'Android APK', 'One-click Android projects with full permissions control.'], ['Monitor', 'Desktop apps', 'Windows, macOS & Linux builds via Electron.'], ['Layers', 'Components', 'Save, categorize and reuse your own library.']].map(([ic, h, p]) => card(t, [row({ w: 48, h: 48, sizeW: 'fixed', sizeH: 'fixed', fill: lin(t.accent + '33', t.accent2 + '33'), radius: 14, layout: { justify: 'center' } }, [I(ic, { w: 24, h: 24, color: t.accent })]), T(h, { fs: 19, fw: 700, color: t.text, sizeW: 'hug' }), T(p, { fs: 15, lh: 1.55, color: t.mute, ...fillW })], { w: 360, anim: { hover: 'lift' } })))]));
add('sections', 'CTA banner', (t) => col({ name: 'CTA', w: 1200, sizeW: 'fixed', fill: lin(t.accent, t.accent2), radius: 32, layout: { gap: 20, align: 'center', pad: pad(64, 40) }, shadows: [{ x: 0, y: 30, blur: 80, spread: -20, color: t.accent + 'aa', inset: false }] }, [T('Ready to build something great?', { fs: 48, fw: 800, ls: -1.5, color: '#fff', sizeW: 'hug' }), T('Join 120,000+ creators shipping with Forge.', { fs: 18, color: '#ffffffcc', sizeW: 'hug' }), row({ layout: { gap: 12 } }, [btn(t, 'Start for free', 'white', { big: true, pill: true }), btn(t, 'Talk to sales', 'glass', { big: true, pill: true })])]));
add('sections', 'Pricing (3 tiers)', (t) => row({ name: 'Pricing', w: 1100, sizeW: 'fixed', layout: { gap: 20, align: 'stretch', justify: 'center' } }, [['Starter', '$0', ['3 projects', 'Basic export', 'Community']], ['Pro', '$29', ['Unlimited projects', 'All exporters', '3D & motion', 'APK + Desktop']], ['Team', '$99', ['Everything in Pro', 'Shared library', 'SSO', 'Priority support']]].map(([n, p, f], i) => card(t, [T(n, { fs: 18, fw: 700, color: i === 1 ? '#fff' : t.text, sizeW: 'hug' }), row({ layout: { gap: 4, align: 'end' } }, [T(p, { fs: 46, fw: 800, color: i === 1 ? '#fff' : t.text, sizeW: 'hug' }), T('/mo', { fs: 15, color: i === 1 ? '#ffffffbb' : t.mute, sizeW: 'hug' })]), ...f.map((x) => row({ layout: { gap: 10 } }, [I('Check', { w: 18, h: 18, color: i === 1 ? '#fff' : '#22c55e' }), T(x, { fs: 15, color: i === 1 ? '#fff' : t.text, sizeW: 'hug' })])), { ...btn(t, i === 1 ? 'Go Pro' : 'Choose', i === 1 ? 'white' : 'secondary'), sizeW: 'fill' }], { w: 340, layout: { gap: 16, pad: pad(30) }, ...(i === 1 ? { fill: lin(t.accent, t.accent2), border: { w: 0 }, shadows: [{ x: 0, y: 24, blur: 60, spread: -16, color: t.accent, inset: false }] } : {}) }))));
add('sections', 'Logo cloud', (t) => col({ name: 'Logos', w: 1100, sizeW: 'fixed', layout: { gap: 24, align: 'center' } }, [T('TRUSTED BY TEAMS AT', { fs: 12, fw: 700, ls: 3, color: t.mute, sizeW: 'hug' }), row({ layout: { gap: 56 } }, [['Hexagon', 'Hexa'], ['Triangle', 'Vertex'], ['Circle', 'Orbit'], ['Square', 'Blocky'], ['Diamond', 'Prism'], ['Star', 'Nova']].map(([ic, n]) => row({ layout: { gap: 8 }, opacity: 0.7 }, [I(ic, { w: 22, h: 22, color: t.text }), T(n, { fs: 20, fw: 800, color: t.text, sizeW: 'hug' })])))]));
add('sections', 'Stats band', (t) => row({ name: 'Stats', w: 1100, sizeW: 'fixed', fill: solid(t.surface), radius: 24, border: { w: 1, color: t.line, style: 'solid' }, layout: { justify: 'around', pad: pad(40) } }, [['120k+', 'Creators'], ['4.9★', 'Rating'], ['2M+', 'Exports'], ['99.99%', 'Uptime']].map(([a, b]) => col({ layout: { gap: 6, align: 'center' } }, [T(a, { fs: 44, fw: 800, ls: -1, gradText: true, fill: lin(t.accent, t.accent2, 90), sizeW: 'hug' }), T(b, { fs: 15, color: t.mute, sizeW: 'hug' })]))));
add('sections', 'FAQ', (t) => col({ name: 'FAQ', w: 760, sizeW: 'fixed', layout: { gap: 12 } }, [T('Frequently asked questions', { fs: 36, fw: 800, color: t.text, sizeW: 'hug' }), ...['Can I export real code?', 'Does it work offline?', 'Can I build Android apps?', 'Is there a free plan?'].map((q, i) => col({ ...fillW, fill: solid(t.surface), radius: 14, border: { w: 1, color: t.line, style: 'solid' }, layout: { gap: 10, pad: pad(18, 20) } }, [row({ ...fillW, layout: { justify: 'between' } }, [T(q, { fs: 16, fw: 600, color: t.text, sizeW: 'hug' }), I(i === 0 ? 'Minus' : 'Plus', { w: 18, h: 18, color: t.mute })]), ...(i === 0 ? [T('Yes — React, Vue, HTML/CSS, Tailwind, React Native and full Vite projects.', { fs: 14, color: t.mute, ...fillW })] : [])]))]));
add('sections', 'Testimonials row', (t) => row({ name: 'Testimonials', w: 1200, sizeW: 'fixed', layout: { gap: 20, align: 'stretch' } }, [[12, 'Ava M.', 'Designer'], [32, 'Liam C.', 'CTO'], [47, 'Noah P.', 'Founder']].map(([a, n, r]) => card(t, [stars(), T('“Absolutely the fastest way I’ve found to go from idea to production UI.”', { fs: 16, lh: 1.55, color: t.text, ...fillW }), row({ layout: { gap: 10 } }, [img(avatarImg(a), { w: 38, h: 38, radius: 99 }), col({ layout: { gap: 2 } }, [T(n, { fs: 14, fw: 700, color: t.text, sizeW: 'hug' }), T(r, { fs: 12, color: t.mute, sizeW: 'hug' })])])], { w: 386, sizeW: 'fill' }))));
add('sections', 'Bento grid', (t) => row({ name: 'Bento', w: 1100, sizeW: 'fixed', layout: { gap: 16, align: 'stretch' } }, [col({ sizeW: 'fill', layout: { gap: 16 } }, [card(t, [T('Realtime', { fs: 22, fw: 800, color: '#fff', sizeW: 'hug' }), T('Collaborate live.', { fs: 15, color: '#ffffffcc', sizeW: 'hug' })], { sizeW: 'fill', h: 220, sizeH: 'fixed', fill: lin(t.accent, t.accent2) }), card(t, [createNode('chart', { kind: 'area', sizeW: 'fill', h: 110, color: t.accent, color2: t.accent2, gridColor: t.line, labelColor: t.mute, grid: false })], { sizeW: 'fill' })]), col({ sizeW: 'fill', layout: { gap: 16 } }, [card(t, [createNode('three', { w: 300, h: 230, sizeW: 'fill', shape: 'torusKnot', material: 'physical', color: t.accent })], { sizeW: 'fill', layout: { pad: pad(0) }, clip: true }), card(t, [T('99.99%', { fs: 40, fw: 800, color: t.text, sizeW: 'hug' }), T('Uptime this year', { fs: 14, color: t.mute, sizeW: 'hug' })], { sizeW: 'fill' })])]));
add('sections', 'Newsletter section', (t) => col({ name: 'Newsletter section', w: 900, sizeW: 'fixed', fill: solid(t.surface), radius: 28, border: { w: 1, color: t.line, style: 'solid' }, layout: { gap: 16, align: 'center', pad: pad(48) } }, [I('Mail', { w: 36, h: 36, color: t.accent }), T('Stay in the loop', { fs: 34, fw: 800, color: t.text, sizeW: 'hug' }), T('Product updates, tutorials and design inspiration. No spam.', { fs: 16, color: t.mute, sizeW: 'hug' }), row({ w: 460, sizeW: 'fixed', fill: solid(t.surface2), radius: 14, layout: { gap: 8, pad: pad(6) } }, [createNode('input', { placeholder: 'you@email.com', sizeW: 'fill', h: 44, fill: none, color: t.text, border: { w: 0 } }), btn(t, 'Subscribe', 'primary')])]));

// MOBILE
add('mobile', 'Status bar', (t) => row({ name: 'Status bar', w: 390, sizeW: 'fixed', layout: { justify: 'between', pad: pad(14, 28, 6, 28) } }, [T('9:41', { fs: 16, fw: 700, color: t.text, sizeW: 'hug' }), row({ layout: { gap: 6 } }, [I('Signal', { w: 16, h: 16, color: t.text }), I('Wifi', { w: 16, h: 16, color: t.text }), I('BatteryFull', { w: 22, h: 16, color: t.text })])]));
add('mobile', 'List row', (t) => row({ name: 'List row', w: 360, sizeW: 'fixed', fill: solid(t.surface), radius: 16, layout: { gap: 14, pad: pad(14) } }, [row({ w: 44, h: 44, sizeW: 'fixed', sizeH: 'fixed', fill: solid(t.accent + '22'), radius: 12, layout: { justify: 'center' } }, [I('Music', { w: 20, h: 20, color: t.accent })]), col({ sizeW: 'fill', layout: { gap: 2 } }, [T('Morning playlist', { fs: 15, fw: 600, color: t.text, sizeW: 'hug' }), T('24 songs · 1h 32m', { fs: 13, color: t.mute, sizeW: 'hug' })]), I('ChevronRight', { w: 18, h: 18, color: t.mute })]));
add('mobile', 'Settings list', (t) => col({ name: 'Settings', w: 360, sizeW: 'fixed', fill: solid(t.surface), radius: 18, clip: true, layout: { gap: 0 } }, [['Bell', 'Notifications', true], ['Moon', 'Dark mode', true], ['Shield', 'Privacy', null], ['Globe', 'Language', null]].map(([ic, l, tg]) => row({ ...fillW, layout: { gap: 14, pad: pad(14, 16) } }, [I(ic, { w: 20, h: 20, color: t.accent }), T(l, { fs: 15, color: t.text, sizeW: 'fill' }), tg !== null ? createNode('toggle', { color: t.accent, offColor: t.line, checked: tg }) : I('ChevronRight', { w: 18, h: 18, color: t.mute })]))));
add('mobile', 'Chat bubbles', (t) => col({ name: 'Chat', w: 340, sizeW: 'fixed', layout: { gap: 8 } }, [row({ fill: solid(t.surface2), radii: [18, 18, 18, 4], layout: { pad: pad(10, 14) } }, [T('Hey! Did you see the new build? 🚀', { fs: 15, color: t.text, sizeW: 'hug' })]), row({ ...fillW, layout: { justify: 'end' } }, [row({ fill: solid(t.accent), radii: [18, 18, 4, 18], layout: { pad: pad(10, 14) } }, [T('Yes!! The 3D hero looks unreal', { fs: 15, color: '#fff', sizeW: 'hug' })])]), row({ fill: solid(t.surface2), radii: [18, 18, 18, 4], layout: { pad: pad(12, 16), gap: 4 } }, [0, 1, 2].map((i) => F({ w: 8, h: 8, radius: 99, fill: solid(t.mute), anim: { loop: 'bounce', loopDur: 1000 + i * 150 } })))]));
add('mobile', 'Stories', (t) => row({ name: 'Stories', layout: { gap: 14 } }, [3, 8, 14, 20, 25].map((s, i) => col({ layout: { gap: 6, align: 'center' } }, [F({ w: 66, h: 66, radius: 99, fill: i === 0 ? solid(t.line) : lin('#f59e0b', '#ec4899', 45, '#8b5cf6'), layout: { mode: 'row', gap: 0, pad: pad(3), align: 'center', justify: 'center' } }, [img(avatarImg(s), { w: 60, h: 60, radius: 99, border: { w: 3, color: t.bg, style: 'solid' } })]), T(['You', 'ava', 'liam', 'sofia', 'noah'][i], { fs: 12, color: t.text, sizeW: 'hug' })]))));
add('mobile', 'Music player', (t) => card(t, [img(photo('album', 600, 600), { sizeW: 'fill', h: 280, radius: 16 }), col({ ...fillW, layout: { gap: 2 } }, [T('Midnight City', { fs: 20, fw: 700, color: t.text, sizeW: 'hug' }), T('M83', { fs: 14, color: t.mute, sizeW: 'hug' })]), createNode('progress', { sizeW: 'fill', h: 5, value: 38, color: t.accent, track: t.line }), row({ ...fillW, layout: { justify: 'between' } }, [I('Shuffle', { w: 20, h: 20, color: t.mute }), I('SkipBack', { w: 26, h: 26, color: t.text }), row({ w: 60, h: 60, sizeW: 'fixed', sizeH: 'fixed', fill: solid(t.accent), radius: 99, layout: { justify: 'center' } }, [I('Pause', { w: 26, h: 26, color: '#fff' })]), I('SkipForward', { w: 26, h: 26, color: t.text }), I('Repeat', { w: 20, h: 20, color: t.mute })])], { w: 340, layout: { gap: 16, pad: pad(20) } }));
add('mobile', 'Wallet balance', (t) => col({ name: 'Wallet', w: 360, sizeW: 'fixed', fill: lin(t.accent, t.accent2), radius: 24, layout: { gap: 10, pad: pad(24) } }, [T('Total balance', { fs: 14, color: '#ffffffcc', sizeW: 'hug' }), T('$24,562.80', { fs: 36, fw: 800, color: '#fff', sizeW: 'hug' }), row({ ...fillW, layout: { gap: 10, pad: pad(10, 0, 0, 0) } }, [['ArrowUpRight', 'Send'], ['ArrowDownLeft', 'Receive'], ['Plus', 'Top up']].map(([ic, l]) => col({ sizeW: 'fill', fill: solid('#ffffff22'), radius: 14, layout: { gap: 6, align: 'center', pad: pad(12) } }, [I(ic, { w: 20, h: 20, color: '#fff' }), T(l, { fs: 12, fw: 600, color: '#fff', sizeW: 'hug' })])))]));
add('mobile', 'Onboarding', (t) => col({ name: 'Onboarding', w: 360, sizeW: 'fixed', layout: { gap: 18, align: 'center' } }, [createNode('three', { w: 260, h: 260, shape: 'icosahedron', material: 'glass', color: t.accent }), T('Create without limits', { fs: 28, fw: 800, color: t.text, sizeW: 'hug' }), T('Design stunning apps and export them anywhere.', { fs: 15, color: t.mute, align: 'center', ...fillW }), row({ layout: { gap: 6 } }, [F({ w: 24, h: 8, radius: 99, fill: solid(t.accent) }), F({ w: 8, h: 8, radius: 99, fill: solid(t.line) }), F({ w: 8, h: 8, radius: 99, fill: solid(t.line) })]), { ...btn(t, 'Next', 'primary', { pill: true }), sizeW: 'fill' }]));
add('mobile', 'Search + filters', (t) => col({ name: 'Search bar', w: 360, sizeW: 'fixed', layout: { gap: 12 } }, [input(t, 'Search places', 'Search'), row({ layout: { gap: 8 } }, ['All', 'Beach', 'Mountain', 'City'].map((x, i) => row({ fill: solid(i === 0 ? t.accent : t.surface2), radius: 99, layout: { pad: pad(7, 14) } }, [T(x, { fs: 13, fw: 600, color: i === 0 ? '#fff' : t.text, sizeW: 'hug' })])))]));

// 3D
const three = (name, p) => ({ make: (t) => createNode('three', { name, color: t.accent, color2: t.accent2, ...p }), thumb3d: p });
[
  ['Glass torus knot', { shape: 'torusKnot', material: 'glass' }],
  ['Liquid blob', { shape: 'blob', material: 'distort', distort: 0.5 }],
  ['Chrome sphere', { shape: 'sphere', material: 'chrome', color: '#d4d4dc' }],
  ['Wobble cube', { shape: 'box', material: 'wobble' }],
  ['Wireframe icosa', { shape: 'icosahedron', material: 'standard', wireframe: true }],
  ['Neon torus', { shape: 'torus', material: 'neon' }],
  ['Gem', { shape: 'octahedron', material: 'glass', color: '#00e5ff' }],
  ['Gold ring', { shape: 'torus', material: 'chrome', color: '#f5c542' }],
  ['Particles field', { shape: 'particles', material: 'standard', count: 1 }],
  ['Floating cubes', { shape: 'cubes', material: 'physical', count: 12 }],
  ['Matte capsule', { shape: 'capsule', material: 'matte' }],
  ['Holo dodecahedron', { shape: 'dodecahedron', material: 'holo' }],
  ['Starfield', { shape: 'stars', material: 'standard' }],
  ['Spiky ball', { shape: 'spiky', material: 'physical' }],
  ['Cone', { shape: 'cone', material: 'toon' }],
  ['Cylinder', { shape: 'cylinder', material: 'physical' }],
  ['Rounded box', { shape: 'roundedBox', material: 'physical' }],
  ['Planet + ring', { shape: 'planet', material: 'standard' }],
  ['DNA helix', { shape: 'helix', material: 'physical' }],
  ['Wave grid', { shape: 'wave', material: 'standard', wireframe: true }],
].forEach(([n, p]) => { const x = three(n, p); add('threed', n, x.make, { thumb3d: x.thumb3d }); });

// BACKGROUNDS / DECOR
add('decor', 'Mesh gradient', (t) => F({ name: 'Mesh gradient', w: 800, h: 500, fill: { type: 'mesh', color: t.bg, stops: [{ c: t.accent, p: 0 }, { c: t.accent2, p: 33 }, { c: '#00c6ff', p: 66 }, { c: '#22c55e', p: 100 }] }, radius: 24 }));
add('decor', 'Glow orb', (t) => F({ name: 'Glow orb', w: 400, h: 400, radius: 999, fill: { type: 'radial', stops: [{ c: t.accent + 'cc', p: 0 }, { c: t.accent + '00', p: 70 }] }, blur: 20, anim: { loop: 'breathe', loopDur: 6000 } }));
add('decor', 'Aurora', (t) => F({ name: 'Aurora', w: 900, h: 420, radius: 0, fill: lin(t.accent + '00', t.accent2 + '88', 120, '#00e5ff00'), blur: 60, anim: { loop: 'gradient', loopDur: 8000 } }));
add('decor', 'Animated gradient', (t) => F({ name: 'Animated gradient', w: 600, h: 320, radius: 24, fill: lin(t.accent, t.accent2, 120, '#00c6ff'), anim: { loop: 'gradient', loopDur: 6000 } }));
add('decor', 'Grid pattern', (t) => createNode('code', { name: 'Grid pattern', w: 800, h: 500, html: '<div class="g"></div>', css: `.g{width:100%;height:100%;background-image:linear-gradient(${t.line} 1px,transparent 1px),linear-gradient(90deg,${t.line} 1px,transparent 1px);background-size:40px 40px;mask-image:radial-gradient(ellipse at center,#000 30%,transparent 75%)}` }));
add('decor', 'Dot pattern', (t) => createNode('code', { name: 'Dot pattern', w: 800, h: 500, html: '<div class="d"></div>', css: `.d{width:100%;height:100%;background-image:radial-gradient(${t.mute} 1.2px,transparent 1.2px);background-size:22px 22px;opacity:.5;mask-image:radial-gradient(ellipse at center,#000 30%,transparent 75%)}` }));
add('decor', 'Noise glass panel', () => F({ name: 'Glass panel', w: 500, h: 300, radius: 28, fill: solid('#ffffff0d'), backdrop: 30, border: { w: 1, color: '#ffffff22', style: 'solid' }, shadows: [{ x: 0, y: 1, blur: 0, spread: 0, color: '#ffffff22', inset: true }] }));
add('decor', 'Spotlight', () => F({ name: 'Spotlight', w: 700, h: 500, radius: 0, fill: { type: 'radial', stops: [{ c: '#ffffff22', p: 0 }, { c: '#ffffff00', p: 60 }] } }));
add('decor', 'Conic ring', (t) => F({ name: 'Conic ring', w: 300, h: 300, radius: 999, fill: { type: 'conic', angle: 0, stops: [{ c: t.accent, p: 0 }, { c: t.accent2, p: 50 }, { c: t.accent, p: 100 }] }, blur: 2, anim: { loop: 'spin', loopDur: 8000 } }));
add('decor', 'Stripes', (t) => createNode('code', { name: 'Stripes', w: 600, h: 300, html: '<div class="s"></div>', css: `.s{width:100%;height:100%;background:repeating-linear-gradient(45deg,${t.accent}22 0 12px,transparent 12px 24px);border-radius:24px}` }));
add('decor', 'Marquee', (t) => createNode('code', { name: 'Marquee', w: 1000, h: 60, html: '<div class="m"><span>DESIGN ✦ CODE ✦ SHIP ✦ 3D ✦ MOTION ✦ DESIGN ✦ CODE ✦ SHIP ✦ 3D ✦ MOTION ✦</span></div>', css: `.m{overflow:hidden;white-space:nowrap;height:100%;display:flex;align-items:center}.m span{display:inline-block;font:800 32px Inter;color:${t.text};animation:mq 14s linear infinite}@keyframes mq{to{transform:translateX(-50%)}}` }));
add('decor', 'Typewriter', (t) => createNode('code', { name: 'Typewriter', w: 520, h: 60, html: '<div class="tw">Hello, Forge.</div>', css: `.tw{font:700 40px 'JetBrains Mono',monospace;color:${t.text};width:13ch;white-space:nowrap;overflow:hidden;border-right:3px solid ${t.accent};animation:ty 2.5s steps(13) infinite alternate,bl .7s step-end infinite}@keyframes ty{from{width:0}}@keyframes bl{50%{border-color:transparent}}` }));

// LIQUID GLASS — frosted layers with real depth: backdrop blur, specular rim, inner glow, layered shadow
const glassSkin = (o = {}) => ({
  fill: solid(o.tint || '#ffffff14'), backdrop: o.blur ?? 28, radius: o.radius ?? 28,
  border: { w: 1, color: '#ffffff33', style: 'solid' },
  shadows: [
    { x: 0, y: 1, blur: 0, spread: 0, color: '#ffffff59', inset: true },
    { x: 0, y: -1, blur: 0, spread: 0, color: '#00000040', inset: true },
    { x: 0, y: 0, blur: 24, spread: 0, color: '#ffffff12', inset: true },
    { x: 0, y: 24, blur: 48, spread: -16, color: '#0a001fb3', inset: false },
    { x: 0, y: 8, blur: 16, spread: -8, color: '#0a001f80', inset: false },
  ],
});
const liquidBackdrop = (t, w = 900, h = 560) => createNode('code', {
  name: 'Liquid backdrop', w, h,
  html: '<div class="lq"><i></i><i></i><i></i></div>',
  css: `.lq{position:relative;width:100%;height:100%;overflow:hidden;background:#0b0718;border-radius:28px}.lq i{position:absolute;width:62%;aspect-ratio:1;border-radius:42% 58% 63% 37%/41% 44% 56% 59%;filter:blur(30px);opacity:.85;animation:d 16s ease-in-out infinite alternate,m 9s ease-in-out infinite alternate}.lq i:nth-child(1){left:-10%;top:-20%;background:${t.accent}}.lq i:nth-child(2){right:-12%;top:10%;background:${t.accent2};animation-delay:-5s,-3s}.lq i:nth-child(3){left:25%;bottom:-35%;background:#22d3ee;animation-delay:-9s,-6s;opacity:.6}@keyframes d{to{transform:translate(12%,10%) rotate(60deg) scale(1.1)}}@keyframes m{50%{border-radius:63% 37% 41% 59%/58% 36% 64% 42%}to{border-radius:36% 64% 52% 48%/46% 61% 39% 54%}}`,
});
add('glass', 'Liquid backdrop (animated)', (t) => liquidBackdrop(t));
add('glass', 'Liquid glass card', () => col({ name: 'Liquid glass card', w: 340, sizeW: 'fixed', ...glassSkin(), layout: { gap: 12, pad: pad(28) } }, [
  row({ w: 48, h: 48, sizeW: 'fixed', sizeH: 'fixed', ...glassSkin({ radius: 16, tint: '#ffffff1f', blur: 12 }), layout: { justify: 'center' } }, [I('Sparkles', { w: 22, h: 22, color: '#ffffff' })]),
  T('Liquid Glass', { fs: 24, fw: 700, color: '#ffffff', sizeW: 'hug' }),
  T('Frosted layers, specular edges and real depth.', { fs: 15, lh: 1.5, color: '#ffffffb3', ...fillW }),
]));
add('glass', 'Glass button', () => row({ name: 'Glass button', ...glassSkin({ radius: 999, tint: '#ffffff1f', blur: 20 }), layout: { gap: 8, pad: pad(14, 26), justify: 'center' }, anim: { hover: 'lift' }, cursor: 'pointer' }, [T('Continue', { fs: 16, fw: 600, color: '#ffffff', sizeW: 'hug' }), I('ArrowRight', { w: 18, h: 18, color: '#ffffff' })]));
add('glass', 'Liquid gradient button', (t) => row({ name: 'Liquid button', radius: 999, fill: lin(t.accent, t.accent2, 120, '#22d3ee'), border: { w: 1, color: '#ffffff59', style: 'solid' }, shadows: [{ x: 0, y: 1, blur: 0, spread: 0, color: '#ffffff99', inset: true }, { x: 0, y: -10, blur: 18, spread: -8, color: '#3b007066', inset: true }, { x: 0, y: 14, blur: 30, spread: -10, color: t.accent + 'cc', inset: false }], layout: { gap: 8, pad: pad(15, 28), justify: 'center' }, anim: { hover: 'shine', loop: 'gradient', loopDur: 7000 }, cursor: 'pointer' }, [I('Droplets', { w: 18, h: 18, color: '#ffffff' }), T('Get started', { fs: 16, fw: 700, color: '#ffffff', sizeW: 'hug' })]));
add('glass', 'Glass icon buttons', () => row({ name: 'Glass icon row', layout: { gap: 12 } }, ['Heart', 'Share2', 'Bookmark', 'Ellipsis'].map((ic) => row({ w: 52, h: 52, sizeW: 'fixed', sizeH: 'fixed', ...glassSkin({ radius: 18, tint: '#ffffff1a', blur: 18 }), layout: { justify: 'center' }, anim: { hover: 'grow' } }, [I(ic, { w: 22, h: 22, color: '#ffffff' })]))));
add('glass', 'Floating glass tab bar', (t) => row({ name: 'Glass tab bar', w: 360, sizeW: 'fixed', ...glassSkin({ radius: 999, tint: '#ffffff1a' }), layout: { pad: pad(10, 14), justify: 'between' } }, [['House', true], ['Search'], ['Plus'], ['Bell'], ['User']].map(([ic, on]) => row({ w: 52, h: 44, sizeW: 'fixed', sizeH: 'fixed', radius: 999, fill: on ? lin(t.accent, t.accent2, 135) : none, shadows: on ? [{ x: 0, y: 6, blur: 16, spread: -6, color: t.accent + 'cc', inset: false }, { x: 0, y: 1, blur: 0, spread: 0, color: '#ffffff80', inset: true }] : [], layout: { justify: 'center' } }, [I(ic, { w: 22, h: 22, color: on ? '#ffffff' : '#ffffffb3' })]))));
add('glass', 'Glass stat widget', (t) => col({ name: 'Glass stat', w: 260, sizeW: 'fixed', ...glassSkin(), layout: { gap: 8, pad: pad(22) } }, [
  row({ ...fillW, layout: { justify: 'between' } }, [T('Balance', { fs: 14, color: '#ffffffb3', sizeW: 'hug' }), row({ ...glassSkin({ radius: 999, tint: '#22c55e33', blur: 8 }), layout: { pad: pad(3, 9) } }, [T('+8.2%', { fs: 12, fw: 700, color: '#86efac', sizeW: 'hug' })])]),
  T('$48,920', { fs: 34, fw: 800, color: '#ffffff', sizeW: 'hug' }),
  createNode('chart', { kind: 'area', sizeW: 'fill', h: 70, color: '#ffffff', color2: t.accent2, grid: false }),
]));
add('glass', 'Glass profile card', () => col({ name: 'Glass profile', w: 300, sizeW: 'fixed', ...glassSkin({ radius: 32 }), layout: { gap: 10, pad: pad(28), align: 'center' } }, [
  img(avatarImg(32), { w: 88, h: 88, radius: 999, border: { w: 3, color: '#ffffff66', style: 'solid' } }),
  T('Maya Chen', { fs: 20, fw: 700, color: '#ffffff', sizeW: 'hug' }),
  T('Product designer', { fs: 14, color: '#ffffffb3', sizeW: 'hug' }),
  row({ ...fillW, ...glassSkin({ radius: 999, tint: '#ffffff26', blur: 14 }), layout: { pad: pad(12), justify: 'center' }, cursor: 'pointer', anim: { hover: 'lift' } }, [T('Follow', { fs: 15, fw: 700, color: '#ffffff', sizeW: 'hug' })]),
]));
add('glass', 'Glass toggle settings', (t) => col({ name: 'Glass settings', w: 320, sizeW: 'fixed', ...glassSkin(), layout: { gap: 0, pad: pad(8, 18) } }, [['Wifi', 'Wi-Fi', true], ['Bluetooth', 'Bluetooth', true], ['Moon', 'Focus', false]].map(([ic, l, on]) => row({ ...fillW, layout: { gap: 12, pad: pad(12, 0) } }, [I(ic, { w: 20, h: 20, color: '#ffffff' }), T(l, { fs: 15, color: '#ffffff', sizeW: 'fill' }), createNode('toggle', { color: t.accent, offColor: '#ffffff33', checked: on })]))));
add('glass', 'Layered depth stack', () => F({ name: 'Depth stack', w: 340, h: 260, fill: none }, [
  F({ name: 'Back layer', x: 40, y: 0, w: 260, h: 170, ...glassSkin({ tint: '#ffffff0d', radius: 26 }), opacity: 0.6 }),
  F({ name: 'Middle layer', x: 20, y: 30, w: 300, h: 180, ...glassSkin({ tint: '#ffffff12', radius: 26 }), opacity: 0.8 }),
  col({ name: 'Front layer', x: 0, y: 64, w: 340, sizeW: 'fixed', ...glassSkin({ tint: '#ffffff1f' }), layout: { gap: 6, pad: pad(22) } }, [T('Depth', { fs: 22, fw: 700, color: '#ffffff', sizeW: 'hug' }), T('Three frosted layers floating over each other.', { fs: 14, color: '#ffffffb3', ...fillW })]),
]));
add('glass', 'Glass hero (with backdrop)', (t) => F({ name: 'Glass hero', w: 900, h: 560, fill: none, clip: true, radius: 28 }, [
  { ...liquidBackdrop(t), x: 0, y: 0 },
  col({ name: 'Hero glass', x: 170, y: 150, w: 560, sizeW: 'fixed', ...glassSkin({ radius: 36 }), layout: { gap: 16, pad: pad(40), align: 'center' } }, [
    T('Liquid Glass', { fs: 52, fw: 800, ls: -1.5, color: '#ffffff', sizeW: 'hug' }),
    T('Interfaces that feel like light through water.', { fs: 17, color: '#ffffffcc', sizeW: 'hug' }),
    row({ layout: { gap: 12 } }, [
      row({ radius: 999, fill: solid('#ffffff'), layout: { pad: pad(13, 24) }, anim: { hover: 'lift' } }, [T('Get started', { fs: 15, fw: 700, color: '#140c33', sizeW: 'hug' })]),
      row({ ...glassSkin({ radius: 999, tint: '#ffffff1f', blur: 16 }), layout: { pad: pad(13, 24) }, anim: { hover: 'lift' } }, [T('Learn more', { fs: 15, fw: 600, color: '#ffffff', sizeW: 'hug' })]),
    ]),
  ]),
]));

export const LIBRARY = L;

// ---------- page templates ----------
export const TEMPLATES = [
  {
    name: 'SaaS landing', device: 'desktop', w: 1440, h: 2400,
    make: (t) => {
      const get = (n) => L.find((x) => x.name === n).make(t);
      const place = (n, y) => { n.x = Math.round((1440 - (n.w || 1200)) / 2); n.y = y; return n; };
      const nav = place(get('Navbar'), 24);
      const hero = place(get('Hero centered'), 120);
      const logos = place(get('Logo cloud'), 700);
      const feats = place(get('Feature grid'), 860);
      const price = place(get('Pricing (3 tiers)'), 1560);
      const cta = place(get('CTA banner'), 2040);
      const orb = { ...get('Glow orb'), x: 520, y: 40, w: 400, h: 400 };
      return [orb, nav, hero, logos, feats, price, cta];
    },
  },
  {
    name: 'Analytics dashboard', device: 'desktop', w: 1440, h: 1024,
    make: (t) => {
      const get = (n) => L.find((x) => x.name === n).make(t);
      const side = { ...get('Sidebar'), x: 24, y: 24, h: 976 };
      const head = T('Good morning, Ava 👋', { x: 316, y: 40, fs: 30, fw: 800, color: t.text, sizeW: 'hug' });
      const kpi = { ...get('KPI row'), x: 316, y: 100 };
      const chartCard = { ...get('Chart card'), x: 316, y: 260, w: 640 };
      const lb = { ...get('Leaderboard'), x: 976, y: 260, w: 420 };
      const table = { ...get('Table'), x: 316, y: 580, w: 1080 };
      return [side, head, kpi, chartCard, lb, table];
    },
  },
  {
    name: 'Mobile login', device: 'iphone', w: 402, h: 874,
    make: (t) => {
      const get = (n) => L.find((x) => x.name === n).make(t);
      const sb = { ...get('Status bar'), x: 6, y: 0 };
      const orb = { ...get('Glow orb'), x: -60, y: -80, w: 360, h: 360 };
      const logo = row({ x: 171, y: 140, w: 60, h: 60, sizeW: 'fixed', sizeH: 'fixed', fill: lin(t.accent, t.accent2), radius: 18, layout: { justify: 'center' }, anim: { enter: 'pop' } }, [I('Zap', { w: 30, h: 30, color: '#fff' })]);
      const form = { ...get('Login form'), x: 21, y: 240, w: 360, fill: none, border: { w: 0 }, shadows: [] };
      return [orb, sb, logo, form];
    },
  },
  {
    name: 'Mobile home', device: 'iphone', w: 402, h: 874,
    make: (t) => {
      const get = (n) => L.find((x) => x.name === n).make(t);
      return [
        { ...get('Status bar'), x: 6, y: 0 },
        T('Discover', { x: 21, y: 60, fs: 32, fw: 800, color: t.text, sizeW: 'hug' }),
        { ...get('Search + filters'), x: 21, y: 112 },
        { ...get('Stories'), x: 21, y: 230 },
        { ...get('Wallet balance'), x: 21, y: 350 },
        { ...get('List row'), x: 21, y: 560 },
        { ...get('Bottom tab bar'), x: 6, y: 770 },
      ];
    },
  },
  {
    name: 'Portfolio', device: 'desktop', w: 1440, h: 1400,
    make: (t) => {
      const get = (n) => L.find((x) => x.name === n).make(t);
      return [
        { ...get('Mesh gradient'), x: 0, y: 0, w: 1440, h: 760, radius: 0, opacity: 0.35 },
        T('Hi, I’m Ava —\nI design delightful products.', { x: 120, y: 200, fs: 72, fw: 800, ls: -2.5, lh: 1.05, color: t.text, sizeW: 'hug', anim: { enter: 'up' } }),
        { ...get('Pill + arrow'), x: 120, y: 420 },
        { ...get('Liquid blob').valueOf(), x: 900, y: 140, w: 440, h: 440 },
        { ...get('Image card'), x: 120, y: 820 },
        { ...get('Blog card'), x: 480, y: 820 },
        { ...get('Product card'), x: 860, y: 820 },
      ];
    },
  },
];
