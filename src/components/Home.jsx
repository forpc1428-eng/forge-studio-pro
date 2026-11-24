import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store.js';
import { Icon, Toggle } from '../ui/controls.jsx';
import { TEMPLATES } from '../lib/library.js';
import { DEVICES } from '../lib/constants.js';
import { usePrefs, setPref } from '../lib/uiPrefs.js';
import { uid, countNodes } from '../lib/nodes.js';

const SIZES = [
  ['iphone', 'Phone app', 'Smartphone'],
  ['desktop', 'Website', 'Monitor'],
  ['tablet', 'Tablet app', 'Tablet'],
  ['social', 'Social post', 'Square'],
];

export default function Home({ onClose }) {
  const S = useStore.getState;
  const project = useStore((s) => s.project);
  const prefs = usePrefs();
  const [view, setView] = useState('main');
  const t = project.theme.tokens;
  const go = (fn) => { fn(); onClose(); };
  const newPage = (key) => go(() => {
    const d = DEVICES.find((x) => x.key === key);
    S().addPage({ id: uid(), name: `${d.label} design`, w: d.w, h: d.h, device: d.key, fill: { type: 'solid', color: t.bg }, nodes: [] });
    S().set({ leftTab: 'library' });
    S().toast('New blank page. Add parts from the Library on the left.');
  });
  const layers = project.pages.reduce((a, p) => a + countNodes(p.nodes), 0);

  return createPortal(
    <div className="home">
      <div className="home-in">
        <header className="home-h">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" width="52" height="52" />
          <div>
            <h1>Forge Studio Pro</h1>
            <p>Design apps visually, or turn your HTML into a real app.</p>
          </div>
          <div className="grow" />
          <button type="button" className="btn ghost" onClick={onClose}>Go to editor <Icon n="ArrowRight" s={15} /></button>
        </header>

        {view === 'main' && (
          <>
            <div className="home-grid">
              <button type="button" className="home-card hero" onClick={() => { S().updatePublish({ source: 'html' }); S().set({ modal: 'quickApp' }); }}>
                <span className="hc-ic"><Icon n="Smartphone" s={26} /></span>
                <b>HTML to App</b>
                <span>Paste your HTML code (or a file or link) and get an <strong>Android APK</strong>, a Windows app or a website. One click.</span>
                <em>Most popular</em>
              </button>
              <button type="button" className="home-card" onClick={() => { S().updatePublish({ source: 'url' }); S().set({ modal: 'quickApp' }); }}>
                <span className="hc-ic"><Icon n="Link" s={22} /></span>
                <b>Website link to App</b>
                <span>Turn any website address into an Android app.</span>
              </button>
              <button type="button" className="home-card" onClick={() => setView('new')}>
                <span className="hc-ic"><Icon n="PenTool" s={22} /></span>
                <b>Design something new</b>
                <span>Start from a blank phone, website or tablet page.</span>
              </button>
              <button type="button" className="home-card" onClick={() => setView('templates')}>
                <span className="hc-ic"><Icon n="LayoutTemplate" s={22} /></span>
                <b>Start from a template</b>
                <span>Landing page, dashboard, login, phone home and more.</span>
              </button>
              <button type="button" className="home-card" onClick={onClose}>
                <span className="hc-ic"><Icon n="FolderOpen" s={22} /></span>
                <b>Continue my project</b>
                <span>“{project.name}”: {project.pages.length} page{project.pages.length > 1 ? 's' : ''}, {layers} parts.</span>
              </button>
              <button type="button" className="home-card" onClick={() => go(() => S().openProject?.())}>
                <span className="hc-ic"><Icon n="FileUp" s={22} /></span>
                <b>Open a saved file</b>
                <span>Open a .forge.json project you saved before.</span>
              </button>
              <button type="button" className="home-card" onClick={() => go(() => S().set({ modal: 'publish' }))}>
                <span className="hc-ic"><Icon n="Rocket" s={22} /></span>
                <b>Publish my design</b>
                <span>Turn your design into an APK, a Windows app or a website.</span>
              </button>
            </div>
            <div className="home-tips">
              <div><Icon n="MousePointerClick" s={14} /> <b>Add things:</b> Library (left), then click a part.</div>
              <div><Icon n="Move" s={14} /> <b>Move around:</b> drag empty space, scroll, or Ctrl + scroll to zoom.</div>
              <div><Icon n="PanelLeftClose" s={14} /> <b>More room:</b> hide the side panels with the buttons at the top, or press Tab.</div>
              <div><Icon n="Search" s={14} /> <b>Find anything:</b> press Ctrl + K and type.</div>
            </div>
          </>
        )}

        {view === 'new' && (
          <>
            <button type="button" className="btn sm ghost" onClick={() => setView('main')}><Icon n="ArrowLeft" s={14} /> Back</button>
            <h2>What size?</h2>
            <div className="home-grid four">
              {SIZES.map(([k, l, ic]) => {
                const d = DEVICES.find((x) => x.key === k);
                return (
                  <button type="button" key={k} className="home-card" onClick={() => newPage(k)}>
                    <span className="hc-ic"><Icon n={ic} s={22} /></span>
                    <b>{l}</b>
                    <span>{d.w} × {d.h}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {view === 'templates' && (
          <>
            <button type="button" className="btn sm ghost" onClick={() => setView('main')}><Icon n="ArrowLeft" s={14} /> Back</button>
            <h2>Pick a template</h2>
            <div className="home-grid">
              {TEMPLATES.map((tpl) => (
                <button type="button" key={tpl.name} className="home-card" onClick={() => go(() => { S().addPage({ name: tpl.name, w: tpl.w, h: tpl.h, device: tpl.device, fill: { type: 'solid', color: t.bg }, nodes: tpl.make(t) }); S().toast(`Added “${tpl.name}”. Click anything to edit it.`); })}>
                  <span className="hc-ic"><Icon n={tpl.device === 'iphone' ? 'Smartphone' : 'Monitor'} s={22} /></span>
                  <b>{tpl.name}</b>
                  <span>{tpl.w} × {tpl.h}</span>
                </button>
              ))}
            </div>
          </>
        )}

        <footer className="home-f">
          <Toggle label="Show this screen when Forge starts" checked={prefs.home !== false} onChange={(v) => setPref('home', v)} />
          <span className="hint">Open it any time with the house button at the top left.</span>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
