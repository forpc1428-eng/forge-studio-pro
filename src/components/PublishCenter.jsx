import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store.js';
import { Modal, Icon, Row, Num, Select, Seg, Toggle, TextIn, ColorField, IconBtn } from '../ui/controls.jsx';
import { LucideIcon } from './NodeView.jsx';
import { PERMISSIONS, PRESETS, buildZip, iconDataURL, pkgProblems, safePkg, versionCode, slug } from '../lib/publish.js';
import { downloadBlob, readZip } from '../lib/zip.js';
import { ICON_SUGGEST, GRADIENTS } from '../lib/constants.js';
import { icons } from 'lucide-react';

const NAV = [
  ['source', 'Source', 'FileInput'],
  ['identity', 'App identity', 'BadgeInfo'],
  ['icon', 'Icon & splash', 'Image'],
  ['perms', 'Permissions', 'ShieldCheck'],
  ['android', 'Android', 'Smartphone'],
  ['desktop', 'Desktop', 'Monitor'],
  ['web', 'Website & SEO', 'Globe'],
];

export default function PublishCenter({ onClose }) {
  const cfg = useStore((s) => s.project.publish);
  const project = useStore((s) => s.project);
  const up = useStore((s) => s.updatePublish);
  const toast = useStore((s) => s.toast);
  const [sec, setSec] = useState('source');
  const [busy, setBusy] = useState(null);
  const [iconUrl, setIconUrl] = useState(null);
  const bodyRef = useRef(null);

  // sensible defaults from the project the first time
  useEffect(() => {
    if (!cfg.appName) up({ appName: project.name, shortName: project.name.slice(0, 12), packageId: `com.forge.${slug(project.name).replace(/-/g, '')}`.slice(0, 60), iconBg: project.theme.tokens.accent, splashBg: project.theme.tokens.bg, themeColor: project.theme.tokens.bg });
  }, []); // eslint-disable-line

  useEffect(() => {
    let live = true;
    iconDataURL(cfg, 256).then((u) => live && setIconUrl(u)).catch(() => {});
    return () => { live = false; };
  }, [cfg.icon, cfg.iconBg, cfg.iconBg2, cfg.iconGlyph, cfg.iconPadding, cfg.iconShape, cfg.iconFg, cfg.iconStroke]);

  const build = async (kind) => {
    const probs = pkgProblems(cfg.packageId);
    if (kind !== 'web' && probs.length && !/^[a-z][\w]*(\.[a-z][\w]*)+$/.test(cfg.packageId)) { setSec('identity'); return toast(`Package ID: ${probs[0]}`, 'warn'); }
    if (cfg.source === 'html' && !cfg.html && !cfg.htmlFiles) { setSec('source'); return toast('Add your HTML file or folder first', 'warn'); }
    if (cfg.source === 'url' && !/^https?:\/\//.test(cfg.url)) { setSec('source'); return toast('Enter a full URL starting with https://', 'warn'); }
    setBusy(kind);
    try {
      const { blob, file } = await buildZip(kind, project, cfg);
      downloadBlob(blob, file);
      toast(`${file} ready (${(blob.size / 1024 / 1024).toFixed(2)} MB)`);
    } catch (e) {
      console.error(e);
      toast(`Build failed: ${e.message}`, 'warn');
    } finally { setBusy(null); }
  };

  const go = (k) => { setSec(k); bodyRef.current?.querySelector(`#pub-${k}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  return (
    <Modal title="Publish Center" icon="Rocket" onClose={onClose} wide className="publish">
      <div className="pub">
        <nav className="pub-nav">
          {NAV.map(([k, l, ic]) => <button type="button" key={k} className={sec === k ? 'on' : ''} onClick={() => go(k)}><Icon n={ic} s={15} />{l}</button>)}
          <div className="grow" />
          <div className="pub-note"><Icon n="Info" s={13} /> Settings save with your project automatically.</div>
        </nav>

        <div className="pub-body" ref={bodyRef} onScroll={(e) => {
          const top = e.currentTarget.scrollTop + 140;
          let cur = 'source';
          for (const [k] of NAV) { const el = e.currentTarget.querySelector(`#pub-${k}`); if (el && el.offsetTop <= top) cur = k; }
          if (cur !== sec) setSec(cur);
        }}>
          <SourceSec cfg={cfg} up={up} />
          <IdentitySec cfg={cfg} up={up} />
          <IconSec cfg={cfg} up={up} iconUrl={iconUrl} />
          <PermSec cfg={cfg} up={up} />
          <AndroidSec cfg={cfg} up={up} />
          <DesktopSec cfg={cfg} up={up} />
          <WebSec cfg={cfg} up={up} />
        </div>

        <aside className="pub-side">
          <PhonePreview cfg={cfg} iconUrl={iconUrl} />
          <div className="build-cards">
            <BuildCard kind="android" icon="Smartphone" title="Android app" sub={`APK + AAB project · ${safePkg(cfg.packageId)}`} busy={busy} onBuild={build} />
            <BuildCard kind="desktop" icon="Monitor" title="Desktop software" sub={`Windows .exe · macOS .dmg · Linux`} busy={busy} onBuild={build} />
            <BuildCard kind="web" icon="Globe" title="Website / PWA" sub="Installable, offline, SEO ready" busy={busy} onBuild={build} />
          </div>
          <button type="button" className="btn primary big wfull" disabled={!!busy} onClick={async () => { for (const k of ['android', 'desktop', 'web']) await build(k); }}>
            <Icon n="Zap" s={16} /> Build all three
          </button>
          <div className="pub-honest">
            <Icon n="CircleHelp" s={13} />
            <span>Browsers can't run the Android/desktop compilers, so each download is a complete, ready-to-build project. Upload it to GitHub and the included workflow builds the real <b>.apk / .aab / .exe / .dmg</b> for free in a few minutes. You can also build it with one double-click if Android Studio or Node.js is installed. Instructions are inside each zip.</span>
          </div>
        </aside>
      </div>
    </Modal>
  );
}

function BuildCard({ kind, icon, title, sub, busy, onBuild }) {
  return (
    <div className="bcard">
      <span className="bic"><Icon n={icon} s={18} /></span>
      <div className="bt"><b>{title}</b><small>{sub}</small></div>
      <button type="button" className="btn sm primary" disabled={!!busy} onClick={() => onBuild(kind)}>
        {busy === kind ? <><Icon n="LoaderCircle" s={13} className="spin" /> Building</> : <><Icon n="Download" s={13} /> Build</>}
      </button>
    </div>
  );
}

function Sec({ id, title, icon, desc, children }) {
  return (
    <section className="psec" id={`pub-${id}`}>
      <h4><Icon n={icon} s={16} /> {title}</h4>
      {desc && <p className="pdesc">{desc}</p>}
      {children}
    </section>
  );
}

// ---------- source ----------
function SourceSec({ cfg, up }) {
  const fileRef = useRef(null);
  const toast = useStore((s) => s.toast);
  const pages = useStore((s) => s.project.pages.length);
  const load = async (f) => {
    if (!f) return;
    if (/\.zip$/i.test(f.name)) {
      const files = await readZip(f);
      const html = Object.keys(files).find((k) => /(^|\/)index\.html?$/i.test(k)) || Object.keys(files).find((k) => /\.html?$/i.test(k));
      if (!html) return toast('No .html file found in that zip', 'warn');
      if (html !== 'index.html') { files['index.html'] = files[html]; }
      up({ source: 'html', htmlFiles: files, html: '', htmlName: `${f.name} · ${Object.keys(files).length} files` });
    } else {
      up({ source: 'html', html: await f.text(), htmlFiles: null, htmlName: f.name });
    }
    toast(`Loaded ${f.name}`);
  };
  const opts = [
    ['design', 'This Forge design', `${pages} page${pages > 1 ? 's' : ''}, with links, animations and 3D`, 'PenTool'],
    ['html', 'My own HTML', 'Single .html file, a zipped site folder, or pasted code', 'FileCode'],
    ['url', 'A live website', 'Wrap any URL into an app (web-to-app)', 'Link'],
  ];
  return (
    <Sec id="source" title="What should the app contain?" icon="FileInput" desc="Choose what goes inside your APK, desktop app or website. Any HTML works: a game, a tool, a whole multi-file site.">
      <div className="srcs">
        {opts.map(([k, t, d, ic]) => (
          <button type="button" key={k} className={`src ${cfg.source === k ? 'on' : ''}`} onClick={() => up({ source: k })}>
            <span className="src-ic"><Icon n={ic} s={20} /></span><b>{t}</b><small>{d}</small>
            {cfg.source === k && <span className="src-check"><Icon n="Check" s={12} /></span>}
          </button>
        ))}
      </div>
      {cfg.source === 'html' && (
        <div className="dropzone" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); load(e.dataTransfer.files[0]); }} onClick={() => fileRef.current.click()}>
          <Icon n="CloudUpload" s={28} />
          <b>{cfg.htmlName || 'Drop your .html or .zip here'}</b>
          <small>{cfg.htmlName ? 'Click to replace' : 'or click to browse. A zip can contain CSS, JS, images and fonts.'}</small>
          <input ref={fileRef} type="file" hidden accept=".html,.htm,.zip" onChange={(e) => load(e.target.files[0])} />
        </div>
      )}
      {cfg.source === 'html' && !cfg.htmlFiles && (
        <Row label="…or paste HTML"><TextIn multiline mono rows={6} value={cfg.html} placeholder="<!doctype html>…" onChange={(v) => up({ html: v, htmlName: v ? 'Pasted HTML' : '' })} onBlurCommit /></Row>
      )}
      {cfg.source === 'url' && (
        <>
          <Row label="Website URL"><TextIn value={cfg.url} placeholder="https://your-site.com" onChange={(v) => up({ url: v.trim() })} onBlurCommit /></Row>
          <div className="hint">The app opens this site full-screen. Links to the same domain stay inside the app, other links open in the browser, and an offline page shows when there's no connection.</div>
        </>
      )}
    </Sec>
  );
}

// ---------- identity ----------
function IdentitySec({ cfg, up }) {
  const probs = pkgProblems(cfg.packageId);
  return (
    <Sec id="identity" title="App identity" icon="BadgeInfo" desc="Name, package ID and version shown on the phone, in the store and in the installer.">
      <div className="g2">
        <Row label="App name"><TextIn value={cfg.appName} onChange={(v) => up({ appName: v })} placeholder="My App" /></Row>
        <Row label="Short name (home screen)"><TextIn value={cfg.shortName} onChange={(v) => up({ shortName: v.slice(0, 30) })} placeholder="MyApp" /></Row>
        <Row label="Package ID / bundle ID">
          <div>
            <TextIn value={cfg.packageId} onChange={(v) => up({ packageId: v.trim() })} placeholder="com.company.app" mono />
            {probs.length ? <div className="warn"><Icon n="TriangleAlert" s={12} /> {probs[0]} → will use <code>{safePkg(cfg.packageId)}</code></div> : <div className="okline"><Icon n="CircleCheck" s={12} /> Valid. This is permanent once published on Google Play.</div>}
          </div>
        </Row>
        <Row label="Version" cols="1fr 1fr">
          <TextIn value={cfg.version} onChange={(v) => up({ version: v })} placeholder="1.0.0" />
          <Num label="Code" value={cfg.versionCode || versionCode(cfg.version)} min={1} onChange={(v) => up({ versionCode: v })} title="Android versionCode: must increase with every Play Store update" />
        </Row>
        <Row label="Description"><TextIn value={cfg.description} onChange={(v) => up({ description: v })} /></Row>
        <Row label="Author / company"><TextIn value={cfg.author} onChange={(v) => up({ author: v })} /></Row>
        <Row label="Website"><TextIn value={cfg.website} onChange={(v) => up({ website: v })} placeholder="https://" /></Row>
        <Row label="Language"><Select value={cfg.lang} onChange={(v) => up({ lang: v })} options={[['en', 'English'], ['hi', 'Hindi'], ['es', 'Spanish'], ['fr', 'French'], ['de', 'German'], ['pt', 'Portuguese'], ['ar', 'Arabic'], ['ja', 'Japanese'], ['zh', 'Chinese'], ['ru', 'Russian'], ['id', 'Indonesian'], ['bn', 'Bengali'], ['ta', 'Tamil'], ['te', 'Telugu'], ['mr', 'Marathi'], ['ur', 'Urdu']]} /></Row>
      </div>
    </Sec>
  );
}

// ---------- icon ----------
function IconSec({ cfg, up, iconUrl }) {
  const fileRef = useRef(null);
  const [q, setQ] = useState('');
  const names = useMemo(() => (q ? Object.keys(icons).filter((n) => n.toLowerCase().includes(q.toLowerCase())).slice(0, 60) : ICON_SUGGEST), [q]);
  return (
    <Sec id="icon" title="App icon & splash screen" icon="Image" desc="Upload your own logo or design one here. Forge exports every size: Android densities, adaptive icon, round icon, Play Store 512px, PWA, favicon and desktop.">
      <div className="iconlab">
        <div className="iconbig">
          {iconUrl ? <img src={iconUrl} alt="App icon" /> : <div className="iconph" />}
          <div className="iconsizes">{[64, 40, 28].map((s) => iconUrl && <img key={s} src={iconUrl} width={s} height={s} alt="" />)}</div>
        </div>
        <div className="iconctl">
          <Row label="Source"><Seg small value={cfg.icon ? 'upload' : 'glyph'} onChange={(v) => { if (v === 'glyph') up({ icon: null }); else fileRef.current.click(); }} options={[['glyph', 'Design one'], ['upload', 'Upload logo']]} /></Row>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => up({ icon: r.result }); r.readAsDataURL(f); }} />
          {cfg.icon && <div className="btnrow"><button type="button" className="btn sm" onClick={() => fileRef.current.click()}><Icon n="Upload" s={13} /> Replace</button><button type="button" className="btn sm ghost" onClick={() => up({ icon: null })}><Icon n="X" s={13} /> Remove</button></div>}
          <Row label="Shape"><Seg small value={cfg.iconShape} onChange={(v) => up({ iconShape: v })} options={[['squircle', 'Squircle'], ['rounded', 'Rounded'], ['circle', 'Circle'], ['square', 'Square']]} /></Row>
          <Row label="Background" cols="1fr 1fr"><ColorField value={cfg.iconBg} onChange={(c) => up({ iconBg: c })} /><ColorField value={cfg.iconBg2 || cfg.iconBg} onChange={(c) => up({ iconBg2: c })} label="→" /></Row>
          <div className="gpresets small">
            {GRADIENTS.slice(0, 18).map((g, i) => <button type="button" key={i} style={{ background: `linear-gradient(135deg, ${g[0]}, ${g[g.length - 1]})` }} onClick={() => up({ iconBg: g[0], iconBg2: g[g.length - 1] })} />)}
            <button type="button" className="ctrans" title="Solid" onClick={() => up({ iconBg2: null })} />
          </div>
          <Row label="Padding"><input type="range" min="0" max="40" value={cfg.iconPadding} onChange={(e) => up({ iconPadding: +e.target.value })} /></Row>
          {!cfg.icon && (
            <>
              <Row label="Glyph colour"><ColorField value={cfg.iconFg || '#ffffff'} onChange={(c) => up({ iconFg: c })} /></Row>
              <Row label="Stroke"><input type="range" min="1" max="3.5" step="0.25" value={cfg.iconStroke || 2} onChange={(e) => up({ iconStroke: +e.target.value })} /></Row>
              <div className="search sm"><Icon n="Search" s={13} /><input placeholder="Search 1,500+ glyphs…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.stopPropagation()} /></div>
              <div className="glyphs">{names.map((n) => <button type="button" key={n} className={cfg.iconGlyph === n ? 'on' : ''} onClick={() => up({ iconGlyph: n })} title={n}><LucideIcon name={n} size={18} /></button>)}</div>
            </>
          )}
        </div>
      </div>
      <div className="g2" style={{ marginTop: 14 }}>
        <Toggle label="Show splash screen" checked={cfg.splash} onChange={(v) => up({ splash: v })} />
        <Row label="Splash background"><ColorField value={cfg.splashBg} onChange={(c) => up({ splashBg: c })} /></Row>
        <Row label="Status / title bar colour"><ColorField value={cfg.themeColor} onChange={(c) => up({ themeColor: c })} /></Row>
        <Row label="Status bar icons"><Seg small value={cfg.statusBar} onChange={(v) => up({ statusBar: v })} options={[['dark', 'Light icons'], ['light', 'Dark icons']]} /></Row>
      </div>
    </Sec>
  );
}

// ---------- permissions ----------
function PermSec({ cfg, up }) {
  const [q, setQ] = useState('');
  const sel = new Set(cfg.permissions || []);
  const toggle = (p) => { const s = new Set(sel); if (s.has(p)) s.delete(p); else s.add(p); up({ permissions: [...s] }); };
  return (
    <Sec id="perms" title="Permissions" icon="ShieldCheck" desc="Pick exactly what your app can access. Sensitive ones (marked) are asked at runtime with Android's system prompt. Camera, mic and location also work from your web code (getUserMedia, geolocation).">
      <div className="btnrow">
        {Object.entries(PRESETS).map(([k, list]) => <button type="button" key={k} className="chip" onClick={() => up({ permissions: list })}>{k}</button>)}
        <button type="button" className="chip" onClick={() => up({ permissions: [] })}>Clear all</button>
      </div>
      <div className="search sm"><Icon n="Search" s={13} /><input placeholder="Search permissions…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.stopPropagation()} /><span className="count">{sel.size} selected</span></div>
      <div className="perm-groups">
        {PERMISSIONS.map((g) => {
          const items = g.items.filter(([id, l, d]) => !q || `${id} ${l} ${d}`.toLowerCase().includes(q.toLowerCase()));
          if (!items.length) return null;
          return (
            <div key={g.group} className="pgroup">
              <div className="pg-h">{g.group}<span>{items.filter(([id]) => sel.has(id)).length}/{items.length}</span></div>
              {items.map(([id, l, d, danger]) => (
                <label key={id} className={`perm ${sel.has(id) ? 'on' : ''}`}>
                  <input type="checkbox" checked={sel.has(id)} onChange={() => toggle(id)} />
                  <span className="pcheck"><Icon n="Check" s={11} /></span>
                  <span className="ptxt"><b>{l}{danger && <em>asks user</em>}</b><small>{d}</small><code>{id}</code></span>
                </label>
              ))}
            </div>
          );
        })}
      </div>
      <Row label="Custom permission"><TextIn placeholder="e.g. com.google.android.gms.permission.AD_ID or FOREGROUND_SERVICE_LOCATION" onChange={(v) => { if (v.trim()) up({ permissions: [...new Set([...(cfg.permissions || []), v.trim().replace(/^android\.permission\./, '')])] }); }} onBlurCommit mono /></Row>
    </Sec>
  );
}

// ---------- android ----------
function AndroidSec({ cfg, up }) {
  const T = (k, l) => <Toggle label={l} checked={cfg[k]} onChange={(v) => up({ [k]: v })} />;
  return (
    <Sec id="android" title="Android options" icon="Smartphone" desc="Every switch maps to real Android code in the generated project.">
      <div className="g2">
        <Row label="Orientation"><Seg small value={cfg.orientation} onChange={(v) => up({ orientation: v })} options={[['unspecified', 'Auto'], ['portrait', 'Portrait'], ['landscape', 'Landscape'], ['sensor', 'Sensor']]} /></Row>
        <Row label="Back button"><Seg small value={cfg.backButton} onChange={(v) => up({ backButton: v })} options={[['history', 'Go back in app'], ['exit', 'Exit app']]} /></Row>
        <Row label="External links"><Seg small value={cfg.allowExternal} onChange={(v) => up({ allowExternal: v })} options={[['browser', 'Open in browser'], ['inside', 'Open inside app']]} /></Row>
        <Row label="SDK" cols="1fr 1fr">
          <Select value={String(cfg.minSdk)} onChange={(v) => up({ minSdk: +v })} options={[['21', 'Min 21 · Android 5'], ['23', 'Min 23 · Android 6'], ['24', 'Min 24 · Android 7'], ['26', 'Min 26 · Android 8'], ['28', 'Min 28 · Android 9'], ['29', 'Min 29 · Android 10'], ['31', 'Min 31 · Android 12']]} />
          <Select value={String(cfg.targetSdk)} onChange={(v) => up({ targetSdk: +v })} options={[['33', 'Target 33'], ['34', 'Target 34 (Play 2024)'], ['35', 'Target 35 (Play 2025)']]} />
        </Row>
        <Row label="Custom user-agent suffix"><TextIn value={cfg.userAgent} placeholder="MyAppAndroid/1.0" onChange={(v) => up({ userAgent: v })} onBlurCommit /></Row>
      </div>
      <div className="tgrid">
        {T('fullscreen', 'Fullscreen (hide status bar)')}
        {T('immersive', 'Immersive mode (hide nav bar)')}
        {T('keepAwake', 'Keep screen awake')}
        {T('pullToRefresh', 'Pull to refresh')}
        {T('zoom', 'Pinch to zoom')}
        {T('fileUpload', 'File upload / camera picker')}
        {T('downloads', 'Downloads to Downloads folder')}
        {T('cache', 'Cache pages')}
        {T('javascript', 'JavaScript')}
        {T('domStorage', 'Local storage')}
        {T('hardware', 'Hardware acceleration')}
        {T('debuggable', 'Chrome remote debugging')}
      </div>
      <div className="hint"><Icon n="Code" s={12} /> Your page can call <code>Android.toast()</code>, <code>Android.vibrate(ms)</code>, <code>Android.share(text)</code>, <code>Android.appVersion()</code>, <code>Android.exit()</code>.</div>
    </Sec>
  );
}

function DesktopSec({ cfg, up }) {
  const T = (k, l) => <Toggle label={l} checked={cfg[k]} onChange={(v) => up({ [k]: v })} />;
  const tg = new Set(cfg.targets || []);
  return (
    <Sec id="desktop" title="Desktop software" icon="Monitor" desc="An Electron app with a Windows installer + portable .exe, a macOS .dmg, and a Linux AppImage/.deb.">
      <div className="g2">
        <Row label="Window size" cols="1fr 1fr"><Num label="W" value={cfg.winWidth} min={320} onChange={(v) => up({ winWidth: v })} /><Num label="H" value={cfg.winHeight} min={240} onChange={(v) => up({ winHeight: v })} /></Row>
        <Row label="Platforms">
          <div className="btnrow">
            {[['win', 'Windows', 'AppWindow'], ['mac', 'macOS', 'Apple'], ['linux', 'Linux', 'Terminal']].map(([k, l, ic]) => (
              <button type="button" key={k} className={`chip ${tg.has(k) ? 'on' : ''}`} onClick={() => { const s = new Set(tg); if (s.has(k)) s.delete(k); else s.add(k); up({ targets: [...s].length ? [...s] : ['win'] }); }}><Icon n={ic} s={12} /> {l}</button>
            ))}
          </div>
        </Row>
      </div>
      <div className="tgrid">
        {T('resizable', 'Resizable window')}
        {T('frame', 'Native title bar / frame')}
        {T('menuBar', 'Show menu bar')}
        {T('alwaysOnTop', 'Always on top')}
        {T('kiosk', 'Kiosk mode')}
        {T('tray', 'System tray icon')}
        {T('singleInstance', 'Single instance')}
        {T('devTools', 'Allow DevTools')}
      </div>
    </Sec>
  );
}

function WebSec({ cfg, up }) {
  const T = (k, l) => <Toggle label={l} checked={cfg[k]} onChange={(v) => up({ [k]: v })} />;
  return (
    <Sec id="web" title="Website & SEO" icon="Globe" desc="A ready-to-host site with an installable PWA, offline cache, social previews and deploy configs.">
      <div className="g2">
        <Row label="SEO title"><TextIn value={cfg.seoTitle} placeholder={cfg.appName} onChange={(v) => up({ seoTitle: v })} /></Row>
        <Row label="Meta description"><TextIn value={cfg.seoDesc} placeholder={cfg.description} onChange={(v) => up({ seoDesc: v })} /></Row>
        <Row label="Social image URL (og:image)"><TextIn value={cfg.ogImage} placeholder="https://…/preview.png" onChange={(v) => up({ ogImage: v })} onBlurCommit /></Row>
        <Row label="Google Analytics ID"><TextIn value={cfg.analytics} placeholder="G-XXXXXXX" onChange={(v) => up({ analytics: v.trim() })} onBlurCommit /></Row>
      </div>
      <div className="tgrid">
        {T('pwa', 'Installable PWA')}
        {T('offline', 'Works offline')}
        {T('robots', 'Allow search engines')}
        {T('sitemap', 'sitemap.xml')}
        {T('netlify', 'Netlify config')}
        {T('vercel', 'Vercel config')}
      </div>
      <div className="snippet">
        <div className="snip-h">Google preview</div>
        <div className="gprev"><small>{(cfg.website || 'https://example.com').replace(/^https?:\/\//, '')}</small><b>{cfg.seoTitle || cfg.appName}</b><span>{cfg.seoDesc || cfg.description}</span></div>
      </div>
    </Sec>
  );
}

// ---------- preview ----------
function PhonePreview({ cfg, iconUrl }) {
  const [mode, setMode] = useState('home');
  useEffect(() => { if (mode !== 'splash') return undefined; const t = setTimeout(() => setMode('home'), 1800); return () => clearTimeout(t); }, [mode]);
  const shapeR = { squircle: '28%', rounded: '18%', circle: '50%', square: '6px' }[cfg.iconShape];
  return (
    <div className="phone-wrap">
      <div className="phone">
        <div className="notch" />
        {mode === 'splash' ? (
          <div className="splash" style={{ background: cfg.splashBg }}>
            {iconUrl && <img src={iconUrl} alt="" style={{ borderRadius: shapeR }} />}
          </div>
        ) : (
          <div className="home">
            <div className="sbar" style={{ color: '#fff' }}><span>9:41</span><span><Icon n="Wifi" s={10} /> <Icon n="BatteryFull" s={12} /></span></div>
            <div className="appgrid">
              {['Camera', 'Map', 'Music', 'Mail', 'Calendar', 'Settings', 'MessageCircle'].map((n, i) => (
                <div className="happ" key={n}><span className="aicon" style={{ background: `hsl(${i * 50}, 60%, 45%)`, borderRadius: shapeR }}><LucideIcon name={n} size={18} color="#fff" /></span><small>{n === 'MessageCircle' ? 'Chat' : n}</small></div>
              ))}
              <div className="happ mine" onClick={() => setMode('splash')} title="Tap to preview splash">
                <span className="aicon" style={{ borderRadius: shapeR }}>{iconUrl && <img src={iconUrl} alt="" />}</span>
                <small>{(cfg.shortName || cfg.appName || 'App').slice(0, 12)}</small>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="phone-cap"><Icon n="MousePointerClick" s={12} /> Tap your icon to preview the splash</div>
    </div>
  );
}
