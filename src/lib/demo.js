import { uid, createNode } from './nodes.js';
import { THEMES } from './constants.js';
import { TEMPLATES } from './library.js';
import { defaultPublish } from './publishDefaults.js';

export function demoProject() {
  const t = THEMES.Midnight;
  const page = (tpl, name) => {
    const T = TEMPLATES.find((x) => x.name === tpl);
    return { id: uid(), name, w: T.w, h: T.h, device: T.device, fill: { type: 'solid', color: t.bg }, nodes: T.make(t) };
  };
  const home = page('SaaS landing', 'Home');
  home.nodes.push(createNode('three', { name: '3D accent', x: 1170, y: 330, w: 220, h: 220, shape: 'blob', material: 'distort', color: t.accent, color2: t.accent2 }));
  return {
    v: 2,
    name: 'My Forge Project',
    theme: { name: 'Midnight', tokens: { ...t } },
    pages: [home, page('Analytics dashboard', 'Dashboard'), page('Mobile home', 'Mobile app')],
    components: [],
    categories: ['General', 'Buttons', 'Cards', 'Sections'],
    publish: defaultPublish(),
  };
}
