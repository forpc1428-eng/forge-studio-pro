import React, { useMemo, useState } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-json';
import { useStore } from '../store.js';
import { genHTML, genReact, genTailwind, genVue, genReactNative, reactProjectFiles, threeR3F, pascal } from '../lib/codegen.js';
import { Icon, IconBtn, Seg } from '../ui/controls.jsx';
import { downloadBlob, zipFiles } from '../lib/zip.js';

export const LANGS = [
  ['react', 'React', 'Atom'],
  ['tailwind', 'Tailwind', 'Wind'],
  ['html', 'HTML', 'FileCode'],
  ['css', 'CSS', 'Hash'],
  ['vue', 'Vue', 'Triangle'],
  ['rn', 'React Native', 'Smartphone'],
  ['three', 'Three.js', 'Box'],
  ['json', 'JSON', 'Braces'],
];

export function useGeneratedCode(lang, scope) {
  const project = useStore((s) => s.project);
  const page = useStore((s) => s.page());
  const sel = useStore((s) => s.selectedNodes());
  return useMemo(() => {
    const usePage = scope === 'page' || !sel.length;
    const nodes = usePage ? page.nodes : sel;
    const opts = usePage ? { page, name: page.name } : { name: sel.length === 1 ? sel[0].name : 'Selection' };
    try {
      switch (lang) {
        case 'react': { const r = genReact(nodes, opts); return { code: r.jsx, lang: 'jsx', file: `${r.name}.jsx`, extra: { code: r.css, file: `${r.name}.css`, lang: 'css' } }; }
        case 'tailwind': { const r = genTailwind(nodes, opts); return { code: r.jsx, lang: 'jsx', file: `${r.name}.jsx` }; }
        case 'html': return { code: genHTML(nodes, { ...opts, title: project.name }), lang: 'markup', file: 'index.html' };
        case 'css': { const r = genHTML(nodes, { ...opts, full: false }); return { code: r.css, lang: 'css', file: 'styles.css' }; }
        case 'vue': return { code: genVue(nodes, opts), lang: 'markup', file: `${pascal(opts.name)}.vue` };
        case 'rn': return { code: genReactNative(nodes, opts), lang: 'jsx', file: `${pascal(opts.name)}.native.jsx` };
        case 'three': {
          const threes = [];
          const visit = (n) => { if (n.type === 'three') threes.push(n); (n.children || []).forEach(visit); };
          nodes.forEach(visit);
          if (!threes.length) return { code: '// No 3D objects in this selection.\n// Add one from Library → 3D, then come back here for its React Three Fiber code.', lang: 'jsx', file: 'Scene.jsx' };
          return { code: threes.map((t) => threeR3F(t).code).join('\n\n'), lang: 'jsx', file: 'Scene.jsx' };
        }
        default: return { code: JSON.stringify(usePage ? page : (sel.length === 1 ? sel[0] : sel), null, 2), lang: 'json', file: 'forge.json' };
      }
    } catch (e) {
      console.error(e);
      return { code: `// Could not generate code: ${e.message}`, lang: 'jsx', file: 'error.txt' };
    }
  }, [lang, scope, project, page, sel]);
}

export function Highlight({ code, lang }) {
  const html = useMemo(() => {
    if (code.length > 400000) return code.replace(/</g, '&lt;');
    try { return Prism.highlight(code, Prism.languages[lang] || Prism.languages.markup, lang); } catch { return code.replace(/</g, '&lt;'); }
  }, [code, lang]);
  const lines = useMemo(() => code.split('\n').length, [code]);
  return (
    <div className="codebox">
      <div className="gutter">{Array.from({ length: Math.min(lines, 20000) }, (_, i) => <span key={i}>{i + 1}</span>)}</div>
      <pre className={`language-${lang}`}><code dangerouslySetInnerHTML={{ __html: html }} /></pre>
    </div>
  );
}

export default function CodeView({ inline }) {
  const [lang, setLang] = useState('react');
  const [scope, setScope] = useState('auto');
  const [showExtra, setShowExtra] = useState(false);
  const sel = useStore((s) => s.selection);
  const project = useStore((s) => s.project);
  const toast = useStore((s) => s.toast);
  const set = useStore((s) => s.set);
  const out = useGeneratedCode(lang, scope);
  const view = showExtra && out.extra ? out.extra : out;
  const copy = async () => { await navigator.clipboard.writeText(view.code); toast(`Copied ${view.file}`); };
  const dl = () => downloadBlob(new Blob([view.code], { type: 'text/plain' }), view.file);
  const dlProject = async () => {
    const files = reactProjectFiles(project);
    const blob = await zipFiles(files, project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-react/');
    downloadBlob(blob, `${project.name.replace(/\s+/g, '-')}-react.zip`);
    toast('React project downloaded — run npm install && npm run dev');
  };
  return (
    <div className={`codeview ${inline ? 'inline' : ''}`}>
      <div className="code-top">
        <div className="langs">
          {LANGS.map(([k, l, ic]) => <button type="button" key={k} className={lang === k ? 'on' : ''} onClick={() => { setLang(k); setShowExtra(false); }}><Icon n={ic} s={13} />{l}</button>)}
        </div>
      </div>
      <div className="code-bar">
        <Seg small value={scope === 'page' || !sel.length ? 'page' : 'sel'} onChange={(v) => setScope(v === 'page' ? 'page' : 'auto')} options={[['sel', sel.length ? `Selection (${sel.length})` : 'Selection'], ['page', 'Whole page']]} />
        {out.extra && <Seg small value={showExtra ? 'css' : 'main'} onChange={(v) => setShowExtra(v === 'css')} options={[['main', out.file], ['css', out.extra.file]]} />}
        <div className="grow" />
        <IconBtn icon="Copy" title="Copy" onClick={copy} />
        <IconBtn icon="Download" title={`Download ${view.file}`} onClick={dl} />
        {inline && <IconBtn icon="Maximize2" title="Open large" onClick={() => set({ modal: 'code' })} />}
      </div>
      <Highlight code={view.code} lang={view.lang} />
      <div className="code-foot">
        <span><Icon n="FileCode" s={12} /> {view.file} · {view.code.split('\n').length} lines · {(view.code.length / 1024).toFixed(1)} KB</span>
        <div className="grow" />
        <button type="button" className="btn sm" onClick={dlProject}><Icon n="Package" s={13} /> Full React project (.zip)</button>
      </div>
    </div>
  );
}
