import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store.js';
import { Modal, Icon, Seg, TextIn } from '../ui/controls.jsx';
import { LucideIcon } from './NodeView.jsx';
import { buildZip, iconDataURL, slug, ALL_PERMISSIONS, BASIC_PERMISSIONS, SIMPLE_PERMS, isAsked } from '../lib/publish.js';
import { downloadBlob, readZip } from '../lib/zip.js';
import { detectBuilder, buildApkHere, revealApk } from '../lib/localBuild.js';

const SAMPLE = `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>My App</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: system-ui; background: linear-gradient(135deg, #7c5cff, #ff4fa3); color: #fff; }
    button { font-size: 20px; padding: 14px 28px; border: 0; border-radius: 14px; background: #fff; color: #5b21b6; font-weight: 700; }
  </style>
</head>
<body>
  <div style="text-align:center">
    <h1>Hello from my app 👋</h1>
    <p id="n">Taps: 0</p>
    <button onclick="n.textContent = 'Taps: ' + (++window.c || (window.c = 1))">Tap me</button>
  </div>
</body>
</html>`;

const COLORS = ['#7c5cff', '#ff4fa3', '#22c55e', '#0ea5e9', '#f59e0b', '#ef4444', '#111827', '#14b8a6'];
const GLYPHS = ['Zap', 'Smartphone', 'Gamepad2', 'ShoppingBag', 'Music', 'Heart', 'Star', 'Rocket', 'BookOpen', 'Camera', 'MessageCircle', 'Globe'];

export default function QuickApp({ onClose }) {
  const cfg = useStore((s) => s.project.publish);
  const project = useStore((s) => s.project);
  const up = useStore((s) => s.updatePublish);
  const toast = useStore((s) => s.toast);
  const [tab, setTab] = useState(cfg.source === 'url' ? 'link' : cfg.htmlFiles ? 'file' : 'paste');
  const [iconUrl, setIconUrl] = useState(null);
  const [builder, setBuilder] = useState({ mode: undefined, tools: null });
  const [job, setJob] = useState(null); // { kind, state: 'running'|'done'|'error', log: [], t0, result, error }
  const fileRef = useRef(null);
  const iconRef = useRef(null);

  // start every visit in "HTML" mode with a sensible app name
  useEffect(() => {
    const patch = { source: cfg.source === 'design' ? 'html' : cfg.source };
    if (!cfg.appName || cfg.appName === project.name) patch.appName = cfg.appName || 'My App';
    up(patch);
    detectBuilder().then(setBuilder);
  }, []); // eslint-disable-line

  useEffect(() => {
    let live = true;
    iconDataURL(cfg, 192).then((u) => live && setIconUrl(u)).catch(() => {});
    return () => { live = false; };
  }, [cfg.icon, cfg.iconBg, cfg.iconBg2, cfg.iconGlyph, cfg.iconShape]);

  const setName = (v) => up({ appName: v, shortName: v.slice(0, 12), packageId: `com.forge.${slug(v).replace(/-/g, '') || 'myapp'}`.slice(0, 60) });
  const hasContent = tab === 'paste' ? !!cfg.html?.trim() : tab === 'file' ? !!(cfg.htmlFiles || cfg.html) : /^https?:\/\/.+\..+/.test(cfg.url || '');
  const canBuildHere = builder.mode && builder.tools?.ok;

  const previewDoc = useMemo(() => {
    if (tab === 'link') return null;
    if (cfg.htmlFiles) return cfg.htmlFiles['index.html'];
    return cfg.html || '';
  }, [tab, cfg.html, cfg.htmlFiles]);

  const loadFile = async (f) => {
    if (!f) return;
    if (/\.zip$/i.test(f.name)) {
      const files = await readZip(f);
      const main = Object.keys(files).find((k) => /(^|\/)index\.html?$/i.test(k)) || Object.keys(files).find((k) => /\.html?$/i.test(k));
      if (!main) return toast('That zip has no .html file inside', 'warn');
      if (main !== 'index.html') files['index.html'] = files[main];
      up({ source: 'html', htmlFiles: files, html: '', htmlName: `${f.name} (${Object.keys(files).length} files)` });
    } else {
      up({ source: 'html', html: await f.text(), htmlFiles: null, htmlName: f.name });
    }
    toast(`Loaded ${f.name}`);
  };

  const switchTab = (t) => {
    setTab(t);
    if (t === 'link') up({ source: 'url' });
    else if (t === 'paste') up({ source: 'html', htmlFiles: null });
    else up({ source: 'html' });
  };

  const run = async (kind) => {
    if (!hasContent) return toast(tab === 'link' ? 'Enter a full link starting with https://' : 'Add your HTML first', 'warn');
    if (!cfg.appName?.trim()) return toast('Give your app a name', 'warn');
    const c = useStore.getState().project.publish;
    if (kind === 'apk' && canBuildHere) {
      const j = { kind, state: 'running', log: [], t0: Date.now() };
      setJob(j);
      try {
        const result = await buildApkHere(builder.mode, useStore.getState().project, c, (line) => setJob((s) => s && { ...s, log: [...s.log.slice(-200), line] }));
        setJob((s) => ({ ...s, state: 'done', result }));
      } catch (e) {
        console.error('APK build failed', e); setJob((s) => ({ ...s, state: 'error', error: (e && (e.message || String(e))) || 'Unknown error' }));
      }
      return;
    }
    const target = kind === 'apk' ? 'android' : kind === 'exe' ? 'desktop' : 'web';
    try {
      const { blob, file } = await buildZip(target, useStore.getState().project, c);
      downloadBlob(blob, file);
      setJob({ kind, state: 'zip', file });
    } catch (e) { toast(`Could not create it: ${e.message}`, 'warn'); }
  };

  return (
    <Modal title="HTML to App" icon="Smartphone" wide onClose={onClose} className="quick">
      <div className="qa">
        <div className="qa-main">
          <section className="qa-step">
            <h4><span className="qa-n">1</span> What goes in your app?</h4>
            <Seg value={tab} onChange={switchTab} options={[['paste', 'Paste HTML code'], ['file', 'Upload .html / .zip'], ['link', 'Website link']]} />
            {tab === 'paste' && (
              <>
                <textarea className="qa-code" spellCheck={false} placeholder="Paste your full HTML here (with <style> and <script> if you have them)…" value={cfg.html || ''}
                  onChange={(e) => up({ source: 'html', html: e.target.value, htmlFiles: null, htmlName: 'Pasted HTML' })} onKeyDown={(e) => e.stopPropagation()} />
                <div className="qa-row">
                  <button type="button" className="btn sm ghost" onClick={() => up({ source: 'html', html: SAMPLE, htmlFiles: null })}><Icon n="Sparkles" s={13} /> Try a sample</button>
                  {cfg.html && <button type="button" className="btn sm ghost" onClick={() => up({ html: '' })}><Icon n="X" s={13} /> Clear</button>}
                  <span className="hint">{cfg.html ? `${(cfg.html.length / 1024).toFixed(1)} KB` : 'Games, tools, websites: any single HTML file works.'}</span>
                </div>
              </>
            )}
            {tab === 'file' && (
              <div className="dropzone" onClick={() => fileRef.current.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); loadFile(e.dataTransfer.files[0]); }}>
                <Icon n="CloudUpload" s={28} />
                <b>{cfg.htmlName || 'Drop your .html file or a .zip of your site here'}</b>
                <small>{cfg.htmlName ? 'Click to choose a different file' : 'or click to browse. A .zip can include CSS, JS, images and fonts.'}</small>
                <input ref={fileRef} type="file" hidden accept=".html,.htm,.zip" onChange={(e) => loadFile(e.target.files[0])} />
              </div>
            )}
            {tab === 'link' && (
              <>
                <TextIn value={cfg.url} placeholder="https://your-website.com" onChange={(v) => up({ source: 'url', url: v.trim() })} />
                <div className="hint">The app opens this website full-screen, like a real app. It needs internet to load the site.</div>
              </>
            )}
          </section>

          <section className="qa-step">
            <h4><span className="qa-n">2</span> Name and icon</h4>
            <div className="qa-id">
              <div className="qa-icon" onClick={() => iconRef.current.click()} title="Click to upload your own icon">{iconUrl ? <img src={iconUrl} alt="" /> : null}<span><Icon n="Upload" s={12} /></span></div>
              <input ref={iconRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => up({ icon: r.result }); r.readAsDataURL(f); }} />
              <div className="qa-idr">
                <TextIn value={cfg.appName} placeholder="App name" onChange={setName} />
                <div className="qa-sw">{COLORS.map((c) => <button type="button" key={c} style={{ background: c }} className={cfg.iconBg === c && !cfg.icon ? 'on' : ''} onClick={() => up({ iconBg: c, iconBg2: null, icon: null })} title="Icon colour" />)}</div>
                <div className="qa-gl">{GLYPHS.map((g) => <button type="button" key={g} className={cfg.iconGlyph === g && !cfg.icon ? 'on' : ''} onClick={() => up({ iconGlyph: g, icon: null })} title={g}><LucideIcon name={g} size={16} /></button>)}</div>
              </div>
            </div>
            <div className="hint">App ID: <code>{cfg.packageId}</code> · version {cfg.version}</div>
          </section>

          <PermissionsStep cfg={cfg} up={up} />

          <section className="qa-step">
            <h4><span className="qa-n">4</span> Make it</h4>
            <button type="button" className="btn primary big wfull" disabled={job?.state === 'running'} onClick={() => run('apk')}>
              <Icon n="Smartphone" s={18} /> {canBuildHere ? 'Make Android APK' : 'Make Android APK (project .zip)'}
            </button>
            <div className="qa-row">
              <button type="button" className="btn wfull" onClick={() => run('exe')}><Icon n="Monitor" s={15} /> Windows app (.zip)</button>
              <button type="button" className="btn wfull" onClick={() => run('web')}><Icon n="Globe" s={15} /> Website (.zip)</button>
            </div>
            <BuildHelp builder={builder} />
            <button type="button" className="link" onClick={() => useStore.getState().set({ modal: 'publish' })}>More options: permissions, splash screen, version, screen rotation…</button>
          </section>

          {job && <JobPanel job={job} mode={builder.mode} onClose={() => setJob(null)} />}
        </div>

        <aside className="qa-side">
          <div className="qa-phone">
            <div className="qa-notch" />
            {tab === 'link'
              ? <div className="qa-empty"><Icon n="Globe" s={26} /><span>{cfg.url || 'Your website will open here'}</span></div>
              : previewDoc
                ? <iframe title="App preview" sandbox="allow-scripts allow-forms allow-modals" srcDoc={previewDoc} />
                : <div className="qa-empty"><Icon n="Code" s={26} /><span>Your app preview shows here</span></div>}
          </div>
          <div className="qa-cap"><Icon n="MousePointerClick" s={12} /> Live preview: try tapping it</div>
        </aside>
      </div>
    </Modal>
  );
}

function PermissionsStep({ cfg, up }) {
  const sel = new Set(cfg.permissions || []);
  const allOn = ALL_PERMISSIONS.every((p) => sel.has(p));
  const asked = [...sel].filter((id) => isAsked(id) && id !== 'ACCESS_BACKGROUND_LOCATION').length; // Android only grants background location later, in Settings
  const toggleGroup = (ids, on) => {
    const s = new Set(sel);
    ids.forEach((id) => (on ? s.add(id) : s.delete(id)));
    BASIC_PERMISSIONS.forEach((id) => s.add(id)); // internet is always on
    up({ permissions: [...s] });
  };
  return (
    <section className="qa-step">
      <h4><span className="qa-n">3</span> Permissions (what the app may use)</h4>
      <label className={`qa-all ${allOn ? 'on' : ''}`}>
        <input type="checkbox" checked={allOn} onChange={(e) => up({ permissions: e.target.checked ? [...ALL_PERMISSIONS] : [...BASIC_PERMISSIONS] })} />
        <span className="pcheck"><Icon n="Check" s={12} /></span>
        <span><b>Turn on ALL permissions</b><small>Camera, microphone, location, files, notifications, contacts, Bluetooth and every other one ({ALL_PERMISSIONS.length} in total). Android asks the user to allow them when the app first opens.</small></span>
      </label>
      <div className="qa-perms">
        {SIMPLE_PERMS.map(([label, ic, ids]) => {
          const on = ids.every((id) => sel.has(id));
          return (
            <button type="button" key={label} className={`qa-perm ${on ? 'on' : ''}`} onClick={() => toggleGroup(ids, !on)}>
              <Icon n={ic} s={15} /><span>{label}</span><i>{on ? 'On' : 'Off'}</i>
            </button>
          );
        })}
      </div>
      <div className="hint"><Icon n="ShieldCheck" s={12} /> Internet is always on. {asked ? `${asked} permission${asked > 1 ? 's' : ''} will be asked as pop-ups when the app opens.` : 'No pop-ups: this app only uses the internet.'} Your HTML can use them straight away (camera, microphone and location work through normal web code).</div>
      {allOn && <div className="warn"><Icon n="TriangleAlert" s={12} /> Fine for your own phone and sharing the APK. The Google Play Store rejects apps that ask for things they don't use (like SMS), so turn off what you don't need before publishing there.</div>}
    </section>
  );
}

function BuildHelp({ builder }) {
  if (builder.mode === undefined) return <div className="hint"><Icon n="LoaderCircle" s={12} className="spin" /> Checking this computer…</div>;
  if (builder.mode && builder.tools?.ok) return <div className="okline"><Icon n="CircleCheck" s={13} /> This PC can build APKs directly. One click gives you a ready .apk in your Downloads folder.</div>;
  if (builder.mode && !builder.tools?.ok) return <div className="warn"><Icon n="TriangleAlert" s={13} /> Missing {builder.tools.missing.join(' and ')}. Install Android Studio (free) once to build APKs here. Until then you get a project .zip.</div>;
  return <div className="hint"><Icon n="Info" s={12} /> On the website you get a ready project .zip. For a real one-click .apk, use the Forge Studio Pro desktop app or Start Forge Pro.bat.</div>;
}

function JobPanel({ job, mode, onClose }) {
  const [now, setNow] = useState(Date.now());
  const logRef = useRef(null);
  useEffect(() => { if (job.state !== 'running') return undefined; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, [job.state]);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [job.log?.length]);
  const secs = Math.round(((job.state === 'running' ? now : Date.now()) - (job.t0 || Date.now())) / 1000);
  return (
    <section className={`qa-job ${job.state}`}>
      {job.state === 'running' && <h4><Icon n="LoaderCircle" s={16} className="spin" /> Building your APK… {secs}s</h4>}
      {job.state === 'done' && (
        <>
          <h4><Icon n="CircleCheck" s={18} /> Your APK is ready ({job.result.seconds}s)</h4>
          <code className="qa-path">{job.result.apkPath}</code>
          <div className="qa-row">
            <button type="button" className="btn primary" onClick={() => revealApk(mode, job.result.apkPath)}><Icon n="FolderOpen" s={14} /> Show in folder</button>
            <button type="button" className="btn ghost" onClick={onClose}>Done</button>
          </div>
          <div className="hint">Put it on your phone: send it to yourself (WhatsApp, email, Drive or USB cable), tap it, and allow "Install unknown apps".</div>
        </>
      )}
      {job.state === 'error' && (
        <>
          <h4><Icon n="TriangleAlert" s={16} /> Build didn't finish</h4>
          <div className="warn">{job.error}</div>
          <button type="button" className="btn sm ghost" onClick={onClose}>Close</button>
        </>
      )}
      {job.state === 'zip' && (
        <>
          <h4><Icon n="Download" s={16} /> Downloaded {job.file}</h4>
          <div className="hint">{job.kind === 'apk' ? 'Unzip it and double-click build-apk.bat (needs Android Studio installed), or upload the folder to GitHub to build it for free. Steps are in HOW-TO-BUILD.txt inside.' : job.kind === 'exe' ? 'Unzip it and double-click build-windows.bat (needs Node.js). You get an installer and a portable .exe.' : 'Unzip it and drag the folder onto app.netlify.com/drop to put it online in a minute.'}</div>
          <button type="button" className="btn sm ghost" onClick={onClose}>OK</button>
        </>
      )}
      {(job.state === 'running' || job.state === 'error') && job.log?.length > 0 && (
        <pre className="qa-log" ref={logRef}>{job.log.slice(-60).join('\n')}</pre>
      )}
    </section>
  );
}
