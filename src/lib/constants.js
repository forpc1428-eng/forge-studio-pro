export const FONTS = [
  'Inter', 'Manrope', 'Plus Jakarta Sans', 'DM Sans', 'Outfit', 'Sora', 'Space Grotesk', 'Poppins', 'Montserrat', 'Urbanist',
  'Lexend', 'Figtree', 'Onest', 'Geist', 'Rubik', 'Nunito', 'Work Sans', 'Raleway', 'Lato', 'Roboto', 'Open Sans', 'Archivo',
  'Bricolage Grotesque', 'Syne', 'Unbounded', 'Clash Display', 'Bebas Neue', 'Anton', 'Oswald', 'Playfair Display',
  'Instrument Serif', 'DM Serif Display', 'Fraunces', 'Cormorant Garamond', 'Lora', 'Merriweather', 'Libre Baskerville',
  'JetBrains Mono', 'Fira Code', 'IBM Plex Mono', 'Space Mono', 'Caveat', 'Pacifico', 'Permanent Marker', 'Righteous', 'Orbitron',
  'Press Start 2P', 'Audiowide', 'Monoton', 'Lobster',
];

export const WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];

export const GRADIENTS = [
  ['#7c5cff', '#ff4fa3'], ['#00c6ff', '#0072ff'], ['#f7971e', '#ffd200'], ['#ff512f', '#dd2476'], ['#11998e', '#38ef7d'],
  ['#fc466b', '#3f5efb'], ['#c471f5', '#fa71cd'], ['#4facfe', '#00f2fe'], ['#43e97b', '#38f9d7'], ['#fa709a', '#fee140'],
  ['#30cfd0', '#330867'], ['#a18cd1', '#fbc2eb'], ['#ff9a9e', '#fecfef'], ['#667eea', '#764ba2'], ['#f093fb', '#f5576c'],
  ['#5ee7df', '#b490ca'], ['#d299c2', '#fef9d7'], ['#0f2027', '#2c5364'], ['#232526', '#414345'], ['#ee0979', '#ff6a00'],
  ['#8e2de2', '#4a00e0'], ['#00b09b', '#96c93d'], ['#e96443', '#904e95'], ['#1d976c', '#93f9b9'], ['#ff0844', '#ffb199'],
  ['#3a1c71', '#d76d77', '#ffaf7b'], ['#12c2e9', '#c471ed', '#f64f59'], ['#00dbde', '#fc00ff'], ['#f9d423', '#ff4e50'],
  ['#0ba360', '#3cba92'], ['#b721ff', '#21d4fd'], ['#ff6e7f', '#bfe9ff'], ['#000000', '#434343'], ['#e0c3fc', '#8ec5fc'],
  ['#fdfbfb', '#ebedee'], ['#2b5876', '#4e4376'],
];

export const SWATCHES = [
  '#ffffff', '#f5f5f7', '#d4d4dc', '#9a9aab', '#5c5c6e', '#2e2e3c', '#1c1c26', '#111118', '#000000',
  '#7c5cff', '#6366f1', '#3b82f6', '#06b6d4', '#14b8a6', '#22c55e', '#84cc16', '#eab308', '#f59e0b',
  '#f97316', '#ef4444', '#ec4899', '#d946ef', '#a855f7', '#ff4fa3', '#00e5ff', '#39ff14', '#ffd60a',
];

export const SHADOW_PRESETS = {
  'Soft': [{ x: 0, y: 4, blur: 16, spread: 0, color: '#00000033', inset: false }],
  'Medium': [{ x: 0, y: 10, blur: 30, spread: -6, color: '#00000059', inset: false }],
  'Large': [{ x: 0, y: 24, blur: 60, spread: -12, color: '#00000080', inset: false }],
  'Hard': [{ x: 6, y: 6, blur: 0, spread: 0, color: '#000000', inset: false }],
  'Glow': [{ x: 0, y: 0, blur: 32, spread: 0, color: '#7c5cffaa', inset: false }],
  'Neon': [{ x: 0, y: 0, blur: 8, spread: 0, color: '#00e5ff', inset: false }, { x: 0, y: 0, blur: 30, spread: 2, color: '#00e5ff88', inset: false }],
  'Inner': [{ x: 0, y: 2, blur: 6, spread: 0, color: '#00000066', inset: true }],
  'Neumorph': [{ x: 8, y: 8, blur: 16, spread: 0, color: '#00000066', inset: false }, { x: -8, y: -8, blur: 16, spread: 0, color: '#ffffff12', inset: false }],
  'Layered': [{ x: 0, y: 1, blur: 2, spread: 0, color: '#0000001f', inset: false }, { x: 0, y: 4, blur: 8, spread: 0, color: '#0000001f', inset: false }, { x: 0, y: 16, blur: 32, spread: 0, color: '#0000002e', inset: false }],
  'Rim light': [{ x: 0, y: 1, blur: 0, spread: 0, color: '#ffffff22', inset: true }],
};

export const ENTER_ANIMS = ['none', 'fade', 'up', 'down', 'left', 'right', 'zoom', 'zoomOut', 'pop', 'blur', 'flip', 'rotate', 'swing', 'drop', 'skew', 'reveal'];
export const HOVER_FX = ['none', 'lift', 'grow', 'shrink', 'glow', 'tilt', 'brighten', 'rotate', 'shine', 'border', 'float', 'press'];
export const LOOP_FX = ['none', 'float', 'pulse', 'spin', 'bounce', 'wiggle', 'breathe', 'shimmer', 'heartbeat', 'orbit', 'gradient', 'blink'];
export const EASINGS = {
  smooth: 'cubic-bezier(.22,1,.36,1)', spring: 'cubic-bezier(.34,1.56,.64,1)', linear: 'linear', ease: 'ease',
  easeIn: 'cubic-bezier(.55,0,1,.45)', easeOut: 'cubic-bezier(0,.55,.45,1)', bounce: 'cubic-bezier(.68,-0.6,.32,1.6)', snappy: 'cubic-bezier(.2,.9,.1,1)',
};
export const BLENDS = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'];
export const CURSORS = ['auto', 'pointer', 'grab', 'text', 'crosshair', 'move', 'not-allowed', 'zoom-in', 'help'];

export const DEVICES = [
  { key: 'desktop', label: 'Desktop', w: 1440, h: 1024, icon: 'Monitor' },
  { key: 'laptop', label: 'Laptop', w: 1280, h: 800, icon: 'Laptop' },
  { key: 'tablet', label: 'iPad Pro', w: 1024, h: 1366, icon: 'Tablet' },
  { key: 'tabletL', label: 'Tablet landscape', w: 1194, h: 834, icon: 'Tablet' },
  { key: 'iphone', label: 'iPhone 16 Pro', w: 402, h: 874, icon: 'Smartphone' },
  { key: 'iphoneSE', label: 'iPhone SE', w: 375, h: 667, icon: 'Smartphone' },
  { key: 'android', label: 'Android', w: 412, h: 915, icon: 'Smartphone' },
  { key: 'watch', label: 'Watch', w: 198, h: 242, icon: 'Watch' },
  { key: 'tv', label: 'TV 1080p', w: 1920, h: 1080, icon: 'Tv' },
  { key: 'social', label: 'Instagram post', w: 1080, h: 1080, icon: 'Square' },
  { key: 'story', label: 'Story', w: 1080, h: 1920, icon: 'RectangleVertical' },
  { key: 'og', label: 'OG image', w: 1200, h: 630, icon: 'RectangleHorizontal' },
];

export const THEMES = {
  Midnight: { bg: '#0b0b12', surface: '#16161f', surface2: '#1f1f2b', text: '#f5f5f7', mute: '#9a9aab', line: '#2a2a38', accent: '#7c5cff', accent2: '#ff4fa3' },
  Daylight: { bg: '#f7f7fa', surface: '#ffffff', surface2: '#f0f0f5', text: '#111118', mute: '#6b6b7b', line: '#e4e4ec', accent: '#5b4bff', accent2: '#ff3d8b' },
  Ocean: { bg: '#04121f', surface: '#0b2236', surface2: '#12304a', text: '#eaf6ff', mute: '#8db3cc', line: '#1b3d5a', accent: '#00b4ff', accent2: '#00f0c8' },
  Forest: { bg: '#0b1410', surface: '#13221b', surface2: '#1a2e24', text: '#eef7f1', mute: '#93ad9f', line: '#22392d', accent: '#22c55e', accent2: '#a3e635' },
  Sunset: { bg: '#1a0b10', surface: '#2a1219', surface2: '#371923', text: '#fff1ec', mute: '#c79a9a', line: '#4a2230', accent: '#ff6a3d', accent2: '#ffc93c' },
  Mono: { bg: '#0a0a0a', surface: '#161616', surface2: '#202020', text: '#fafafa', mute: '#8a8a8a', line: '#2a2a2a', accent: '#ffffff', accent2: '#a3a3a3' },
  Paper: { bg: '#f4efe6', surface: '#fffaf1', surface2: '#efe7d8', text: '#2b2118', mute: '#87766a', line: '#e1d5c3', accent: '#c2410c', accent2: '#0f766e' },
  Cyber: { bg: '#05010d', surface: '#110727', surface2: '#1b0d3a', text: '#f0e9ff', mute: '#a58fd6', line: '#2c1a55', accent: '#ff00e5', accent2: '#00fff0' },
  Royal: { bg: '#0d0b1f', surface: '#17143a', surface2: '#211c50', text: '#f3f0ff', mute: '#a39ccf', line: '#2e2866', accent: '#f5c542', accent2: '#8b5cf6' },
  Candy: { bg: '#fff5fa', surface: '#ffffff', surface2: '#ffe8f3', text: '#3b0a2a', mute: '#a26b8c', line: '#ffd1e6', accent: '#ff2d95', accent2: '#7c3aed' },
};

export const ICON_SUGGEST = ['Heart', 'Star', 'Zap', 'Sparkles', 'ArrowRight', 'Check', 'X', 'Plus', 'Search', 'Bell', 'Settings', 'User', 'House', 'Mail', 'ShoppingCart', 'Play', 'Camera', 'Lock', 'Globe', 'Rocket', 'Flame', 'Crown', 'Gem', 'Shield', 'Cloud', 'Music', 'Calendar', 'MapPin', 'Phone', 'Send'];

export const SHAPES = ['torusKnot', 'sphere', 'box', 'roundedBox', 'icosahedron', 'octahedron', 'dodecahedron', 'torus', 'capsule', 'cone', 'cylinder', 'blob', 'spiky', 'particles', 'stars', 'cubes', 'planet', 'helix', 'wave'];
export const MATERIALS = ['physical', 'standard', 'glass', 'chrome', 'matte', 'distort', 'wobble', 'neon', 'holo', 'toon'];
export const ENVS = ['studio', 'sunset', 'night', 'neon', 'none'];
