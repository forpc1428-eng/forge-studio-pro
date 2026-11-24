// Publish engine — Android (APK/AAB project), Website (PWA) and Desktop (Electron) from a Forge design,
// your own HTML (file or zipped folder) or a live URL. Everything is configurable in the Publish Center.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LucideIcon } from '../components/NodeView.jsx';
import { buildSite } from './codegen.js';
import { zipFiles } from './zip.js';
import { WRAPPER_JAR_B64, WRAPPER_PROPS, GRADLEW, GRADLEW_BAT } from './gradleWrapper.js';

const b64bytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

// ---------- permission catalogue ----------
export const PERMISSIONS = [
  { group: 'Network', items: [
    ['INTERNET', 'Internet access', 'Load online content and APIs', false],
    ['ACCESS_NETWORK_STATE', 'Network state', 'Know if the device is online', false],
    ['ACCESS_WIFI_STATE', 'Wi-Fi state', 'Read Wi-Fi connection info', false],
    ['CHANGE_WIFI_STATE', 'Change Wi-Fi', 'Turn Wi-Fi on/off', false],
  ] },
  { group: 'Camera & media', items: [
    ['CAMERA', 'Camera', 'Take photos / video, scan QR codes (getUserMedia)', true],
    ['RECORD_AUDIO', 'Microphone', 'Record audio, voice input', true],
    ['MODIFY_AUDIO_SETTINGS', 'Audio settings', 'Required for WebRTC audio', false],
    ['READ_MEDIA_IMAGES', 'Photos (Android 13+)', 'Pick images from the gallery', true],
    ['READ_MEDIA_VIDEO', 'Videos (Android 13+)', 'Pick videos from the gallery', true],
    ['READ_MEDIA_AUDIO', 'Music (Android 13+)', 'Read audio files', true],
    ['READ_EXTERNAL_STORAGE', 'Read storage (≤ Android 12)', 'Read files on older devices', true],
    ['WRITE_EXTERNAL_STORAGE', 'Write storage (≤ Android 9)', 'Save downloads on old devices', true],
  ] },
  { group: 'Location', items: [
    ['ACCESS_FINE_LOCATION', 'Precise location', 'GPS position (navigator.geolocation)', true],
    ['ACCESS_COARSE_LOCATION', 'Approximate location', 'Network-based position', true],
    ['ACCESS_BACKGROUND_LOCATION', 'Background location', 'Location while app is closed', true],
  ] },
  { group: 'Device', items: [
    ['VIBRATE', 'Vibration', 'navigator.vibrate() & haptics', false],
    ['WAKE_LOCK', 'Keep awake', 'Prevent the screen from sleeping', false],
    ['FLASHLIGHT', 'Flashlight', 'Torch control', false],
    ['POST_NOTIFICATIONS', 'Notifications (Android 13+)', 'Show notifications', true],
    ['RECEIVE_BOOT_COMPLETED', 'Run at startup', 'Start after the phone boots', false],
    ['FOREGROUND_SERVICE', 'Foreground service', 'Long-running tasks', false],
    ['USE_BIOMETRIC', 'Biometrics', 'Fingerprint / face unlock', false],
    ['NFC', 'NFC', 'Read NFC tags', false],
    ['BLUETOOTH_CONNECT', 'Bluetooth connect', 'Connect to paired devices', true],
    ['BLUETOOTH_SCAN', 'Bluetooth scan', 'Find nearby devices', true],
    ['SCHEDULE_EXACT_ALARM', 'Exact alarms', 'Alarms & reminders', false],
    ['REQUEST_INSTALL_PACKAGES', 'Install apps', 'Install downloaded APKs', false],
  ] },
  { group: 'Personal data', items: [
    ['READ_CONTACTS', 'Read contacts', 'Access the address book', true],
    ['WRITE_CONTACTS', 'Write contacts', 'Add or edit contacts', true],
    ['READ_CALENDAR', 'Read calendar', 'Read events', true],
    ['WRITE_CALENDAR', 'Write calendar', 'Add events', true],
    ['CALL_PHONE', 'Phone calls', 'Start calls directly', true],
    ['READ_PHONE_STATE', 'Phone state', 'Read call / SIM state', true],
    ['SEND_SMS', 'Send SMS', 'Send text messages', true],
    ['READ_SMS', 'Read SMS', 'Read text messages', true],
    ['BODY_SENSORS', 'Body sensors', 'Heart-rate and similar sensors', true],
    ['ACTIVITY_RECOGNITION', 'Activity recognition', 'Steps, walking, driving', true],
  ] },
];
const DANGEROUS = new Set(PERMISSIONS.flatMap((g) => g.items.filter((i) => i[3]).map((i) => i[0])));
const PERM_SDK = { READ_EXTERNAL_STORAGE: 'android:maxSdkVersion="32"', WRITE_EXTERNAL_STORAGE: 'android:maxSdkVersion="28"' };

export const PRESETS = {
  'Basic web app': ['INTERNET', 'ACCESS_NETWORK_STATE'],
  'Camera / QR scanner': ['INTERNET', 'ACCESS_NETWORK_STATE', 'CAMERA', 'VIBRATE'],
  'Video call': ['INTERNET', 'ACCESS_NETWORK_STATE', 'CAMERA', 'RECORD_AUDIO', 'MODIFY_AUDIO_SETTINGS', 'BLUETOOTH_CONNECT'],
  'Maps & delivery': ['INTERNET', 'ACCESS_NETWORK_STATE', 'ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION', 'POST_NOTIFICATIONS'],
  'Social / media': ['INTERNET', 'ACCESS_NETWORK_STATE', 'CAMERA', 'RECORD_AUDIO', 'READ_MEDIA_IMAGES', 'READ_MEDIA_VIDEO', 'POST_NOTIFICATIONS', 'VIBRATE'],
  'Offline (no internet)': [],
};

// ---------- helpers ----------
export const slug = (s) => (String(s || 'my-app').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'my-app');
export function safePkg(id) {
  let parts = String(id || '').toLowerCase().split('.').map((p) => p.replace(/[^a-z0-9_]/g, '')).filter(Boolean);
  parts = parts.map((p) => (/^[0-9_]/.test(p) ? 'a' + p : p));
  const reserved = ['abstract', 'class', 'new', 'package', 'public', 'private', 'static', 'int', 'char', 'default', 'import', 'return', 'switch', 'case', 'this', 'void', 'final', 'native', 'try', 'do', 'if', 'for', 'while', 'byte', 'long', 'short', 'boolean', 'float', 'double', 'super', 'enum', 'goto', 'const', 'throw', 'throws', 'catch', 'finally', 'interface', 'extends', 'implements', 'instanceof', 'synchronized', 'transient', 'volatile', 'assert', 'strictfp', 'continue', 'break', 'else', 'true', 'false', 'null'];
  parts = parts.map((p) => (reserved.includes(p) ? p + '_' : p));
  while (parts.length < 2) parts.unshift(parts.length ? 'com' : 'app');
  return parts.join('.');
}
export function pkgProblems(id) {
  const p = [];
  if (!/^[a-zA-Z][\w]*(\.[a-zA-Z][\w]*)+$/.test(id || '')) p.push('Use 2+ parts like com.yourname.app (letters, digits, _ ; each part starts with a letter)');
  if (/[A-Z]/.test(id || '')) p.push('Lowercase is recommended');
  return p;
}
export const versionCode = (v, override) => override || Math.max(1, String(v || '1.0.0').split('.').map((x) => parseInt(x, 10) || 0).reduce((a, x, i) => a + x * [10000, 100, 1][i] || a, 0));
const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, "\\'").replace(/"/g, '\\"');
const hexOnly = (c) => { const m = String(c || '').match(/^#([0-9a-f]{6})/i); return m ? '#' + m[1].toUpperCase() : '#0B0B12'; };
const luma = (hex) => { const h = hexOnly(hex).slice(1); const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };

// ---------- icon rendering ----------
function loadImg(src) {
  return new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
function shapePath(ctx, s, shape) {
  ctx.beginPath();
  if (shape === 'circle') ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
  else if (shape === 'square') ctx.rect(0, 0, s, s);
  else { const r = shape === 'rounded' ? s * 0.18 : s * 0.28; ctx.roundRect(0, 0, s, s, r); }
}
const glyphCache = new Map();
const uploadCache = new Map();
/** Render the app icon to PNG bytes. full=true → no shape mask (adaptive foreground / maskable). */
export async function renderIcon(cfg, size, { full = false, padScale = 1, bg = true } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  if (!full) { shapePath(ctx, size, cfg.iconShape); ctx.clip(); }
  if (bg) {
    if (cfg.iconBg2) { const g = ctx.createLinearGradient(0, 0, size, size); g.addColorStop(0, cfg.iconBg); g.addColorStop(1, cfg.iconBg2); ctx.fillStyle = g; } else ctx.fillStyle = cfg.iconBg;
    ctx.fillRect(0, 0, size, size);
  }
  const pad = (size * (cfg.iconPadding / 100)) * padScale + (full ? size * 0.17 : 0);
  if (cfg.icon) {
    try { if (!uploadCache.has(cfg.icon)) uploadCache.set(cfg.icon, loadImg(cfg.icon)); const img = await uploadCache.get(cfg.icon); const s = size - pad * 2; const k = Math.max(s / img.width, s / img.height) * (cfg.iconFit === 'contain' ? Math.min(s / img.width, s / img.height) / Math.max(s / img.width, s / img.height) : 1); const w = img.width * k, h = img.height * k; ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h); } catch { /* ignore */ }
  } else {
    const fg = cfg.iconFg || (luma(cfg.iconBg) > 0.6 ? '#111111' : '#ffffff');
    const svg = renderToStaticMarkup(React.createElement(LucideIcon, { name: cfg.iconGlyph || 'Zap', size: 256, color: fg, stroke: cfg.iconStroke || 2 }))
      .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
    if (!glyphCache.has(svg)) {
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      glyphCache.set(svg, loadImg(url).finally(() => setTimeout(() => URL.revokeObjectURL(url), 1000)));
    }
    const img = await glyphCache.get(svg);
    const s = size - pad * 2;
    ctx.drawImage(img, pad, pad, s, s);
  }
  // toDataURL is synchronous and ~100x faster than toBlob in some browsers
  return b64bytes(c.toDataURL('image/png').split(',')[1]);
}
export async function iconDataURL(cfg, size = 192) {
  const bytes = await renderIcon(cfg, size);
  let s = ''; bytes.forEach((b) => { s += String.fromCharCode(b); });
  return 'data:image/png;base64,' + btoa(s);
}

// ---------- app content (www folder) ----------
async function wwwFiles(project, cfg, { pwa = false } = {}) {
  if (cfg.source === 'html' && cfg.htmlFiles && Object.keys(cfg.htmlFiles).length) return { ...cfg.htmlFiles };
  if (cfg.source === 'html' && cfg.html) return { 'index.html': cfg.html };
  if (cfg.source === 'url') return { 'index.html': offlinePage(cfg) };
  const splash = cfg.splash && !pwa ? '' : '';
  return { 'index.html': buildSite(project, { title: cfg.appName || project.name, pwa, fit: 'width', splash }) };
}
function offlinePage(cfg) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${cfg.appName}</title>
<style>body{margin:0;height:100vh;display:grid;place-items:center;background:${cfg.splashBg};color:#fff;font:16px system-ui;text-align:center}button{margin-top:16px;padding:12px 22px;border:0;border-radius:12px;background:${cfg.iconBg};color:#fff;font-weight:600}</style></head>
<body><div><h2>You're offline</h2><p>Check your connection and try again.</p><button onclick="location.href='${cfg.url}'">Retry</button></div></body></html>`;
}

// ============ ANDROID ============
export async function androidProject(project, cfg) {
  const pkg = safePkg(cfg.packageId);
  const name = cfg.appName || project.name;
  const ver = cfg.version || '1.0.0';
  const vc = versionCode(ver, cfg.versionCode);
  const bg = hexOnly(cfg.splashBg);
  const theme = hexOnly(cfg.themeColor);
  const lightBars = cfg.statusBar === 'light';
  const perms = cfg.permissions || [];
  const pkgPath = pkg.replace(/\./g, '/');
  const target = Math.max(33, Number(cfg.targetSdk) || 34);
  const compile = Math.max(34, target);
  const files = {};
  const add = (n, d, exec) => { files[n] = exec ? { data: d, exec: true } : d; };
  const remote = cfg.source === 'url' && cfg.url;
  const usesSwipe = cfg.pullToRefresh;

  add('settings.gradle', `pluginManagement {\n    repositories { google(); mavenCentral(); gradlePluginPortal() }\n}\ndependencyResolutionManagement {\n    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)\n    repositories { google(); mavenCentral() }\n}\nrootProject.name = "${slug(name)}"\ninclude ':app'\n`);
  add('build.gradle', `plugins {\n    id 'com.android.application' version '8.7.2' apply false\n}\n`);
  add('gradle.properties', 'org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8\nandroid.useAndroidX=true\nandroid.nonTransitiveRClass=true\n');
  add('gradle/wrapper/gradle-wrapper.jar', b64bytes(WRAPPER_JAR_B64));
  add('gradle/wrapper/gradle-wrapper.properties', WRAPPER_PROPS);
  add('gradlew', GRADLEW, true);
  add('gradlew.bat', GRADLEW_BAT);
  add('app/build.gradle', `plugins {
    id 'com.android.application'
}

android {
    namespace '${pkg}'
    compileSdk ${compile}

    defaultConfig {
        applicationId '${pkg}'
        minSdk ${cfg.minSdk || 24}
        targetSdk ${target}
        versionCode ${vc}
        versionName '${ver}'
    }

    signingConfigs {
        release {
            // Set these 4 env vars (or GitHub secrets) to sign with your own key for Google Play.
            def ks = System.getenv('FORGE_KEYSTORE')
            if (ks != null && new File(ks).exists()) {
                storeFile file(ks)
                storePassword System.getenv('FORGE_KEYSTORE_PASSWORD')
                keyAlias System.getenv('FORGE_KEY_ALIAS')
                keyPassword System.getenv('FORGE_KEY_PASSWORD')
            }
        }
    }

    buildTypes {
        release {
            minifyEnabled false
            def ks = System.getenv('FORGE_KEYSTORE')
            signingConfig = (ks != null && new File(ks).exists()) ? signingConfigs.release : signingConfigs.debug
        }
        debug {
            debuggable true
        }
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_11
        targetCompatibility JavaVersion.VERSION_11
    }
}

dependencies {
    implementation 'androidx.core:core:1.13.1'
    implementation 'androidx.webkit:webkit:1.11.0'${usesSwipe ? "\n    implementation 'androidx.swiperefreshlayout:swiperefreshlayout:1.1.0'" : ''}
}
`);
  add('app/proguard-rules.pro', '# no rules\n');

  const permXml = perms.map((p) => `    <uses-permission android:name="android.permission.${p}"${PERM_SDK[p] ? ' ' + PERM_SDK[p] : ''} />`).join('\n');
  const features = [];
  if (perms.includes('CAMERA')) features.push('    <uses-feature android:name="android.hardware.camera" android:required="false" />');
  if (perms.includes('ACCESS_FINE_LOCATION')) features.push('    <uses-feature android:name="android.hardware.location.gps" android:required="false" />');
  if (perms.includes('NFC')) features.push('    <uses-feature android:name="android.hardware.nfc" android:required="false" />');
  const orient = { unspecified: '', portrait: '\n            android:screenOrientation="portrait"', landscape: '\n            android:screenOrientation="landscape"', sensor: '\n            android:screenOrientation="fullSensor"' }[cfg.orientation] || '';
  add('app/src/main/AndroidManifest.xml', `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

${permXml || '    <!-- no permissions -->'}
${features.join('\n')}

    <application
        android:allowBackup="true"
        android:hardwareAccelerated="${cfg.hardware !== false}"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:label="@string/app_name"
        android:usesCleartextTraffic="true"
        android:requestLegacyExternalStorage="true"
        android:theme="@style/AppTheme.Splash">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTask"${orient}
            android:configChanges="orientation|screenSize|smallestScreenSize|screenLayout|keyboardHidden|uiMode|density"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>${remote ? `
            <intent-filter android:autoVerify="false">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="${(() => { try { return new URL(cfg.url).host; } catch { return 'example.com'; } })()}" />
            </intent-filter>` : ''}
        </activity>

        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="\${applicationId}.files"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data android:name="android.support.FILE_PROVIDER_PATHS" android:resource="@xml/file_paths" />
        </provider>
    </application>
</manifest>
`);
  add('app/src/main/res/xml/file_paths.xml', '<?xml version="1.0" encoding="utf-8"?>\n<paths>\n    <cache-path name="cache" path="." />\n    <external-files-path name="files" path="." />\n</paths>\n');

  const runtime = perms.filter((p) => DANGEROUS.has(p) && p !== 'ACCESS_BACKGROUND_LOCATION');
  const startUrl = remote ? cfg.url : 'file:///android_asset/www/index.html';
  add(`app/src/main/java/${pkgPath}/MainActivity.java`, `package ${pkg};

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
${usesSwipe ? 'import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;\n' : ''}import java.util.ArrayList;
import java.util.List;

/**
 * ${name} — generated by Forge Studio Pro.
 * A hardened, full-featured WebView shell: runtime permissions, camera/mic for WebRTC,
 * geolocation, file upload, downloads, external links, back navigation, JS bridge (window.Android).
 */
public class MainActivity extends Activity {
    private static final String START_URL = "${startUrl}";
    private static final int REQ_PERMS = 41;
    private static final int REQ_FILE = 42;
    private WebView web;${usesSwipe ? '\n    private SwipeRefreshLayout swipe;' : ''}
    private ValueCallback<Uri[]> fileCallback;
    private PermissionRequest pendingWebPermission;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        setTheme(R.style.AppTheme);
        super.onCreate(savedInstanceState);
        Window w = getWindow();
        w.setStatusBarColor(Color.parseColor("${theme}"));
        w.setNavigationBarColor(Color.parseColor("${theme}"));${cfg.keepAwake ? '\n        w.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);' : ''}${cfg.fullscreen ? '\n        w.addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);' : ''}
        if (Build.VERSION.SDK_INT >= 23) {
            View decor = w.getDecorView();
            int flags = decor.getSystemUiVisibility();
            ${lightBars ? 'flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;' : 'flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;'}
            decor.setSystemUiVisibility(flags);
        }${cfg.debuggable ? '\n        WebView.setWebContentsDebuggingEnabled(true);' : ''}

        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("${bg}"));
        web.setOverScrollMode(WebView.OVER_SCROLL_NEVER);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(${cfg.javascript !== false});
        s.setDomStorageEnabled(${cfg.domStorage !== false});
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(${!!cfg.zoom});
        s.setBuiltInZoomControls(${!!cfg.zoom});
        s.setDisplayZoomControls(false);
        s.setTextZoom(100);
        s.setGeolocationEnabled(${perms.includes('ACCESS_FINE_LOCATION') || perms.includes('ACCESS_COARSE_LOCATION')});
        s.setCacheMode(${cfg.cache !== false ? 'WebSettings.LOAD_DEFAULT' : 'WebSettings.LOAD_NO_CACHE'});
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);${cfg.userAgent ? `\n        s.setUserAgentString(s.getUserAgentString() + " ${xml(cfg.userAgent)}");` : ''}
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);

        web.addJavascriptInterface(new Bridge(this), "Android");
        web.setWebViewClient(new Client());
        web.setWebChromeClient(new Chrome());${cfg.downloads !== false ? `
        web.setDownloadListener((url, userAgent, contentDisposition, mimeType, length) -> {
            try {
                if (url.startsWith("blob:") || url.startsWith("data:")) { Toast.makeText(this, "Download not supported for this file type", Toast.LENGTH_SHORT).show(); return; }
                DownloadManager.Request r = new DownloadManager.Request(Uri.parse(url));
                String fileName = URLUtil.guessFileName(url, contentDisposition, mimeType);
                r.setMimeType(mimeType);
                r.addRequestHeader("cookie", CookieManager.getInstance().getCookie(url));
                r.addRequestHeader("User-Agent", userAgent);
                r.setTitle(fileName);
                r.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                r.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);
                ((DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE)).enqueue(r);
                Toast.makeText(this, "Downloading " + fileName, Toast.LENGTH_SHORT).show();
            } catch (Exception e) { openExternal(url); }
        });` : ''}
${usesSwipe ? `
        swipe = new SwipeRefreshLayout(this);
        swipe.addView(web);
        swipe.setColorSchemeColors(Color.parseColor("${hexOnly(cfg.iconBg)}"));
        swipe.setOnRefreshListener(() -> web.reload());
        setContentView(swipe);` : '\n        setContentView(web);'}${cfg.immersive ? '\n        hideSystemBars();' : ''}

        if (savedInstanceState != null) web.restoreState(savedInstanceState);
        else web.loadUrl(START_URL);
        askRuntimePermissions();
    }
${cfg.immersive ? `
    private void hideSystemBars() {
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }
` : ''}
    private void askRuntimePermissions() {
        if (Build.VERSION.SDK_INT < 23) return;
        String[] wanted = new String[] { ${runtime.map((p) => `"android.permission.${p}"`).join(', ')} };
        List<String> missing = new ArrayList<>();
        for (String p : wanted) {
            if (p.endsWith("POST_NOTIFICATIONS") && Build.VERSION.SDK_INT < 33) continue;
            if (p.contains("READ_MEDIA_") && Build.VERSION.SDK_INT < 33) continue;
            if ((p.endsWith("READ_EXTERNAL_STORAGE")) && Build.VERSION.SDK_INT >= 33) continue;
            if ((p.endsWith("WRITE_EXTERNAL_STORAGE")) && Build.VERSION.SDK_INT >= 29) continue;
            if (p.contains("BLUETOOTH_") && Build.VERSION.SDK_INT < 31) continue;
            if (checkSelfPermission(p) != PackageManager.PERMISSION_GRANTED) missing.add(p);
        }
        if (!missing.isEmpty()) requestPermissions(missing.toArray(new String[0]), REQ_PERMS);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (pendingWebPermission != null) {
            pendingWebPermission.grant(pendingWebPermission.getResources());
            pendingWebPermission = null;
        }
    }

    private boolean isOnline() {
        try {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            NetworkInfo n = cm.getActiveNetworkInfo();
            return n != null && n.isConnected();
        } catch (Exception e) { return true; }
    }

    private boolean openExternal(String url) {
        try {
            Intent i;
            if (url.startsWith("intent:")) i = Intent.parseUri(url, Intent.URI_INTENT_SCHEME);
            else i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            startActivity(i);
        } catch (ActivityNotFoundException e) {
            Toast.makeText(this, "No app can open this link", Toast.LENGTH_SHORT).show();
        } catch (Exception ignored) { }
        return true;
    }

    private class Client extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            return handle(request.getUrl().toString());
        }

        @SuppressWarnings("deprecation")
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, String url) { return handle(url); }

        private boolean handle(String url) {
            if (url.startsWith("file:")) return false;
            if (url.startsWith("tel:") || url.startsWith("mailto:") || url.startsWith("sms:") || url.startsWith("geo:") || url.startsWith("whatsapp:") || url.startsWith("intent:") || url.startsWith("market:")) return openExternal(url);
            ${cfg.allowExternal === 'inside' ? 'return false; // open every link inside the app' : remote ? `String home = Uri.parse(START_URL).getHost();
            if (home != null && home.equals(Uri.parse(url).getHost())) return false;
            return openExternal(url);` : 'return openExternal(url);'}
        }

        @Override
        public void onPageFinished(WebView view, String url) {${usesSwipe ? '\n            swipe.setRefreshing(false);' : ''}
            super.onPageFinished(view, url);
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame() && !isOnline()) view.loadUrl("file:///android_asset/www/offline.html");
        }
    }

    private class Chrome extends WebChromeClient {
        @Override
        public void onPermissionRequest(final PermissionRequest request) {
            runOnUiThread(() -> {
                List<String> need = new ArrayList<>();
                for (String r : request.getResources()) {
                    if (r.equals(PermissionRequest.RESOURCE_VIDEO_CAPTURE)) need.add(Manifest.permission.CAMERA);
                    if (r.equals(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) need.add(Manifest.permission.RECORD_AUDIO);
                }
                List<String> missing = new ArrayList<>();
                for (String p : need) if (Build.VERSION.SDK_INT >= 23 && checkSelfPermission(p) != PackageManager.PERMISSION_GRANTED) missing.add(p);
                if (missing.isEmpty()) request.grant(request.getResources());
                else { pendingWebPermission = request; requestPermissions(missing.toArray(new String[0]), REQ_PERMS); }
            });
        }

        @Override
        public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
            callback.invoke(origin, true, false);
        }
${cfg.fileUpload !== false ? `
        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
            if (fileCallback != null) fileCallback.onReceiveValue(null);
            fileCallback = callback;
            try {
                Intent i = params.createIntent();
                i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE);
                startActivityForResult(Intent.createChooser(i, "Choose file"), REQ_FILE);
            } catch (Exception e) { fileCallback = null; return false; }
            return true;
        }
` : ''}
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_FILE && fileCallback != null) {
            Uri[] result = null;
            if (resultCode == RESULT_OK && data != null) {
                if (data.getClipData() != null) {
                    int n = data.getClipData().getItemCount();
                    result = new Uri[n];
                    for (int i = 0; i < n; i++) result[i] = data.getClipData().getItemAt(i).getUri();
                } else if (data.getData() != null) result = new Uri[] { data.getData() };
            }
            fileCallback.onReceiveValue(result);
            fileCallback = null;
        }
    }

    /** JavaScript bridge: window.Android.toast("hi"), .vibrate(80), .share("text"), .appVersion(), .exit() */
    public static class Bridge {
        private final MainActivity a;
        Bridge(MainActivity a) { this.a = a; }
        @JavascriptInterface public void toast(String msg) { a.runOnUiThread(() -> Toast.makeText(a, msg, Toast.LENGTH_SHORT).show()); }
        @JavascriptInterface public void vibrate(int ms) {
            Vibrator v = (Vibrator) a.getSystemService(Context.VIBRATOR_SERVICE);
            if (v == null) return;
            if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE)); else v.vibrate(ms);
        }
        @JavascriptInterface public void share(String text) {
            Intent i = new Intent(Intent.ACTION_SEND);
            i.setType("text/plain");
            i.putExtra(Intent.EXTRA_TEXT, text);
            a.startActivity(Intent.createChooser(i, "Share"));
        }
        @JavascriptInterface public void openExternal(String url) { a.runOnUiThread(() -> a.openExternal(url)); }
        @JavascriptInterface public String appVersion() { return "${ver}"; }
        @JavascriptInterface public String packageName() { return "${pkg}"; }
        @JavascriptInterface public void exit() { a.runOnUiThread(a::finishAffinity); }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        ${cfg.backButton === 'exit' ? 'super.onBackPressed();' : `web.evaluateJavascript("(window.forgeBack&&window.forgeBack())?'y':'n'", value -> {
            if (value != null && value.contains("y")) return;
            if (web.canGoBack()) web.goBack();
            else MainActivity.super.onBackPressed();
        });`}
    }
}
`);

  // resources
  add('app/src/main/res/values/strings.xml', `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <string name="app_name">${xml(name)}</string>\n</resources>\n`);
  add('app/src/main/res/values/colors.xml', `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="splash_bg">${bg}</color>\n    <color name="theme">${theme}</color>\n    <color name="accent">${hexOnly(cfg.iconBg)}</color>\n    <color name="ic_launcher_background">${hexOnly(cfg.iconBg)}</color>\n</resources>\n`);
  const parent = luma(bg) < 0.5 ? 'android:Theme.Material.NoActionBar' : 'android:Theme.Material.Light.NoActionBar';
  const style = (extra) => `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="${parent}">
        <item name="android:windowBackground">@color/splash_bg</item>
        <item name="android:statusBarColor">@color/theme</item>
        <item name="android:navigationBarColor">@color/theme</item>
        <item name="android:colorAccent">@color/accent</item>${cfg.fullscreen ? '\n        <item name="android:windowFullscreen">true</item>' : ''}${extra}
    </style>
    <style name="AppTheme.Splash" parent="AppTheme">
        <item name="android:windowBackground">${cfg.splash ? '@drawable/splash' : '@color/splash_bg'}</item>
    </style>
</resources>
`;
  add('app/src/main/res/values/themes.xml', style(''));
  add('app/src/main/res/values-v23/themes.xml', style(lightBars ? '\n        <item name="android:windowLightStatusBar">true</item>' : ''));
  add('app/src/main/res/drawable/splash.xml', `<?xml version="1.0" encoding="utf-8"?>\n<layer-list xmlns:android="http://schemas.android.com/apk/res/android">\n    <item android:drawable="@color/splash_bg" />\n    <item android:width="120dp" android:height="120dp" android:gravity="center">\n        <bitmap android:src="@drawable/splash_logo" android:gravity="fill" />\n    </item>\n</layer-list>\n`);

  // icons for every density + adaptive icon
  const dens = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
  for (const [d, s] of Object.entries(dens)) {
    add(`app/src/main/res/mipmap-${d}/ic_launcher.png`, await renderIcon(cfg, s));
    add(`app/src/main/res/mipmap-${d}/ic_launcher_round.png`, await renderIcon({ ...cfg, iconShape: 'circle' }, s));
    add(`app/src/main/res/mipmap-${d}/ic_launcher_foreground.png`, await renderIcon(cfg, Math.round(s * 2.25), { full: true, bg: false }));
  }
  add('app/src/main/res/drawable/splash_logo.png', await renderIcon(cfg, 432));
  add('app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml', '<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/ic_launcher_background" />\n    <foreground android:drawable="@mipmap/ic_launcher_foreground" />\n</adaptive-icon>\n');
  add('app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml', '<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/ic_launcher_background" />\n    <foreground android:drawable="@mipmap/ic_launcher_foreground" />\n</adaptive-icon>\n');
  add('playstore-icon-512.png', await renderIcon({ ...cfg, iconShape: 'square' }, 512));

  // web content
  const www = await wwwFiles(project, cfg);
  for (const [p, d] of Object.entries(www)) add(`app/src/main/assets/www/${p}`, d);
  add('app/src/main/assets/www/offline.html', offlinePage(cfg));

  add('.github/workflows/build-android.yml', `# Free cloud build — push this folder to GitHub, open the Actions tab, download the APK/AAB from Artifacts.
name: Build Android

on:
  push:
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '17'
      - uses: android-actions/setup-android@v3
      - uses: gradle/actions/setup-gradle@v4
      - name: Decode signing key (optional — add secrets KEYSTORE_BASE64, KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD)
        if: \${{ env.KS != '' }}
        env:
          KS: \${{ secrets.KEYSTORE_BASE64 }}
        run: echo "$KS" | base64 -d > $RUNNER_TEMP/release.jks && echo "FORGE_KEYSTORE=$RUNNER_TEMP/release.jks" >> $GITHUB_ENV
      - name: Build APK + AAB
        env:
          FORGE_KEYSTORE_PASSWORD: \${{ secrets.KEYSTORE_PASSWORD }}
          FORGE_KEY_ALIAS: \${{ secrets.KEY_ALIAS }}
          FORGE_KEY_PASSWORD: \${{ secrets.KEY_PASSWORD }}
        run: chmod +x gradlew && ./gradlew assembleRelease bundleRelease --no-daemon
      - uses: actions/upload-artifact@v4
        with:
          name: ${slug(name)}-v${ver}-apk
          path: app/build/outputs/apk/release/*.apk
      - uses: actions/upload-artifact@v4
        with:
          name: ${slug(name)}-v${ver}-aab-google-play
          path: app/build/outputs/bundle/release/*.aab
`);
  add('build-apk.bat', String.raw`@echo off
REM Builds app\build\outputs\apk\release\app-release.apk (needs JDK 17+ and the Android SDK, e.g. from Android Studio)
cd /d "%~dp0"
if not exist local.properties if defined ANDROID_HOME echo sdk.dir=%ANDROID_HOME:\=/%> local.properties
if not exist local.properties if exist "%LOCALAPPDATA%\Android\Sdk" echo sdk.dir=%LOCALAPPDATA:\=/%/Android/Sdk> local.properties
call "%~dp0gradlew.bat" assembleRelease
if errorlevel 1 (
  echo.
  echo First attempt failed - often a slow network while downloading Gradle. Retrying once...
  call "%~dp0gradlew.bat" assembleRelease
)
if errorlevel 1 (
  echo.
  echo Build failed. Easiest fix: open this folder in Android Studio, or upload it to GitHub - see HOW-TO-BUILD.txt
  pause
  exit /b 1
)
echo.
echo Done! Your APK: app\build\outputs\apk\release\app-release.apk
explorer app\build\outputs\apk\release
pause
`.replace(/\n/g, '\r\n'));
  add('build-apk.sh', `#!/usr/bin/env sh
cd "$(dirname "$0")" || exit 1
[ -f local.properties ] || { [ -n "$ANDROID_HOME" ] && echo "sdk.dir=$ANDROID_HOME" > local.properties; }
chmod +x gradlew && { ./gradlew assembleRelease || ./gradlew assembleRelease; } || { echo "Build failed. Open this folder in Android Studio, or upload it to GitHub (see HOW-TO-BUILD.txt)."; exit 1; }
echo "Done! app/build/outputs/apk/release/app-release.apk"
`, true);
  add('.gitignore', '.gradle/\nbuild/\napp/build/\nlocal.properties\n.idea/\n*.iml\n.DS_Store\n*.jks\n');
  add('HOW-TO-BUILD.txt', `${name} — Android project from Forge Studio Pro
==========================================================
Package: ${pkg}   Version: ${ver} (code ${vc})   minSdk ${cfg.minSdk} / targetSdk ${target}
Permissions: ${perms.join(', ') || 'none'}

GET YOUR APK — pick one:

A) NO INSTALL — GitHub builds it for free (~4 minutes)
   1. github.com → New repository → Create.
   2. "uploading an existing file" → drag EVERYTHING from this folder in
      (including the hidden .github folder — Windows: View → Show → Hidden items).
   3. Commit → open the "Actions" tab → wait for the green tick.
   4. Artifacts → download "${slug(name)}-v${ver}-apk" → unzip → app-release.apk
      You also get an .aab for Google Play.

B) ANDROID STUDIO
   File → Open → this folder → wait for sync → Build → Build APK(s).

C) ONE DOUBLE-CLICK (if Android Studio / the Android SDK + JDK 17+ are installed)
   Windows: build-apk.bat     Mac/Linux: ./build-apk.sh   (uses the bundled Gradle wrapper)

Install: copy the APK to your phone, tap it, allow "Install unknown apps".

GOOGLE PLAY: create a keystore once:
   keytool -genkey -v -keystore release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
Then add GitHub secrets KEYSTORE_BASE64 (base64 of release.jks), KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD.
Without them the APK is signed with a debug key (fine for installing & testing).

JavaScript bridge available in your page:
   Android.toast("Hello")  Android.vibrate(60)  Android.share("text")  Android.openExternal(url)
   Android.appVersion()    Android.packageName()  Android.exit()
`);
  add('forge-publish.json', JSON.stringify({ ...cfg, htmlFiles: undefined, html: undefined }, null, 2));
  return files;
}

// ============ WEBSITE (PWA) ============
export async function websiteFiles(project, cfg) {
  const name = cfg.appName || project.name;
  const files = {};
  const icon192 = await renderIcon(cfg, 192);
  const icon512 = await renderIcon(cfg, 512);
  const maskable = await renderIcon(cfg, 512, { full: true });
  files['icons/icon-192.png'] = icon192;
  files['icons/icon-512.png'] = icon512;
  files['icons/maskable-512.png'] = maskable;
  files['icons/apple-touch-icon.png'] = await renderIcon({ ...cfg, iconShape: 'square' }, 180);
  files['favicon.png'] = await renderIcon(cfg, 64);
  const title = cfg.seoTitle || name;
  const desc = cfg.seoDesc || cfg.description || '';
  const head = `<meta name="description" content="${desc.replace(/"/g, '&quot;')}">
<link rel="icon" type="image/png" href="favicon.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
${cfg.pwa ? '<link rel="manifest" href="manifest.webmanifest">\n<meta name="apple-mobile-web-app-capable" content="yes">' : ''}
<meta property="og:title" content="${title.replace(/"/g, '&quot;')}">
<meta property="og:description" content="${desc.replace(/"/g, '&quot;')}">
<meta property="og:type" content="website">${cfg.ogImage ? `\n<meta property="og:image" content="${cfg.ogImage}">` : ''}
<meta name="twitter:card" content="summary_large_image">
${cfg.robots ? '' : '<meta name="robots" content="noindex">'}
${cfg.analytics ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${cfg.analytics}"></script>\n<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${cfg.analytics}');</script>` : ''}`;
  if (cfg.source === 'html' && (cfg.htmlFiles || cfg.html)) {
    Object.assign(files, cfg.htmlFiles || { 'index.html': cfg.html });
    if (typeof files['index.html'] === 'string' && cfg.pwa) files['index.html'] = files['index.html'].replace(/<\/head>/i, `${head}\n<script>if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js')</script>\n</head>`);
  } else if (cfg.source === 'url') {
    files['index.html'] = `<!doctype html><meta charset="utf-8"><title>${title}</title>${head}<meta http-equiv="refresh" content="0;url=${cfg.url}"><a href="${cfg.url}">Open ${title}</a>`;
  } else {
    files['index.html'] = buildSite(project, { title, pwa: cfg.pwa, extraHead: head });
  }
  if (cfg.pwa) {
    files['manifest.webmanifest'] = JSON.stringify({
      name, short_name: cfg.shortName || name.slice(0, 12), description: desc, start_url: './', scope: './', display: cfg.fullscreen ? 'fullscreen' : 'standalone',
      orientation: cfg.orientation === 'unspecified' ? 'any' : cfg.orientation === 'sensor' ? 'any' : cfg.orientation,
      background_color: hexOnly(cfg.splashBg), theme_color: hexOnly(cfg.themeColor), lang: cfg.lang,
      icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }, { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }],
    }, null, 2);
    const list = Object.keys(files).filter((f) => !f.endsWith('.md')).map((f) => `'./${f}'`).join(',');
    files['sw.js'] = `// Offline cache — the site keeps working without internet after the first visit.\nconst C = 'forge-${Date.now().toString(36)}';\nconst ASSETS = ['./', ${list}];\nself.addEventListener('install', (e) => { e.waitUntil(caches.open(C).then((c) => c.addAll(ASSETS))); self.skipWaiting(); });\nself.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== C).map((x) => caches.delete(x)))).then(() => self.clients.claim())); });\nself.addEventListener('fetch', (e) => {\n  if (e.request.method !== 'GET') return;\n  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request).then((res) => { ${cfg.offline ? 'const copy = res.clone(); caches.open(C).then((c) => c.put(e.request, copy)).catch(() => {});' : ''} return res; }).catch(() => caches.match('./index.html'))));\n});\n`;
  }
  const site = cfg.website || 'https://example.com';
  if (cfg.robots) files['robots.txt'] = `User-agent: *\nAllow: /\n${cfg.sitemap ? `Sitemap: ${site.replace(/\/$/, '')}/sitemap.xml\n` : ''}`;
  if (cfg.sitemap) files['sitemap.xml'] = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${site.replace(/\/$/, '')}/</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>\n</urlset>\n`;
  if (cfg.netlify) files['netlify.toml'] = '[build]\n  publish = "."\n\n[[headers]]\n  for = "/sw.js"\n  [headers.values]\n    Cache-Control = "no-cache"\n';
  if (cfg.vercel) files['vercel.json'] = JSON.stringify({ cleanUrls: true, headers: [{ source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }] }] }, null, 2);
  files['.github/workflows/deploy-pages.yml'] = `# Push to GitHub → your site goes live on GitHub Pages automatically.\nname: Deploy to GitHub Pages\non:\n  push:\n    branches: [main]\n  workflow_dispatch:\npermissions:\n  contents: read\n  pages: write\n  id-token: write\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    environment:\n      name: github-pages\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/configure-pages@v5\n      - uses: actions/upload-pages-artifact@v3\n        with:\n          path: .\n      - uses: actions/deploy-pages@v4\n`;
  files['README.md'] = `# ${name}\n\nWebsite generated by **Forge Studio Pro**${cfg.pwa ? ' — installable PWA that works offline' : ''}.\n\n## Go live (pick one)\n- **Netlify Drop** — drag this folder onto https://app.netlify.com/drop (30 seconds)\n- **Vercel** — \`npx vercel\` in this folder\n- **GitHub Pages** — push to a repo; the included workflow deploys it\n- **Any host** — upload all files\n\n## Install as an app\nOpen the live site in Chrome/Edge → Install icon in the address bar. Works on desktop and Android; on iPhone use Share → Add to Home Screen.\n`;
  return files;
}

// ============ DESKTOP (Electron) ============
export async function desktopFiles(project, cfg) {
  const name = cfg.appName || project.name;
  const pkgName = slug(name);
  const files = {};
  const www = await wwwFiles(project, cfg);
  for (const [p, d] of Object.entries(www)) files[`app/${p}`] = d;
  files['build/icon.png'] = await renderIcon(cfg, 512);
  files['build/icon-256.png'] = await renderIcon(cfg, 256);
  const targets = cfg.targets || ['win', 'mac', 'linux'];
  files['package.json'] = JSON.stringify({
    name: pkgName, productName: name, version: cfg.version || '1.0.0', description: cfg.description, author: cfg.author || 'Forge Developer', main: 'main.js', license: 'UNLICENSED',
    scripts: { start: 'electron .', dist: 'electron-builder', 'dist:win': 'electron-builder --win', 'dist:mac': 'electron-builder --mac', 'dist:linux': 'electron-builder --linux' },
    devDependencies: { electron: '^33.2.0', 'electron-builder': '^25.1.8' },
    build: {
      appId: safePkg(cfg.packageId), productName: name, directories: { output: 'dist', buildResources: 'build' },
      files: ['main.js', 'preload.js', 'app/**/*', 'build/icon.png'],
      win: { target: ['nsis', 'portable'], icon: 'build/icon.png' },
      nsis: { oneClick: false, allowToChangeInstallationDirectory: true, createDesktopShortcut: true, createStartMenuShortcut: true, shortcutName: name },
      mac: { target: ['dmg', 'zip'], icon: 'build/icon.png', category: 'public.app-category.productivity' },
      linux: { target: ['AppImage', 'deb'], icon: 'build/icon.png', category: 'Utility', maintainer: cfg.author || 'Forge Developer' },
    },
  }, null, 2);
  const remote = cfg.source === 'url' && cfg.url;
  files['main.js'] = `// ${name} — desktop app generated by Forge Studio Pro (Electron)
const { app, BrowserWindow, Menu, shell, Tray, nativeImage } = require('electron');
const path = require('path');

${cfg.singleInstance ? `if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => { const w = BrowserWindow.getAllWindows()[0]; if (w) { if (w.isMinimized()) w.restore(); w.focus(); } });
` : ''}let tray = null;

function createWindow() {
  const win = new BrowserWindow({
    width: ${cfg.winWidth || 1280},
    height: ${cfg.winHeight || 820},
    minWidth: 360,
    minHeight: 480,
    resizable: ${cfg.resizable !== false},
    frame: ${cfg.frame !== false},
    alwaysOnTop: ${!!cfg.alwaysOnTop},
    kiosk: ${!!cfg.kiosk},
    fullscreen: ${!!cfg.fullscreen},
    backgroundColor: '${hexOnly(cfg.splashBg)}',
    title: ${JSON.stringify(name)},
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: ${!cfg.menuBar},
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: ${!!cfg.devTools},
      spellcheck: true,
    },
  });
  ${cfg.menuBar ? '' : 'Menu.setApplicationMenu(null);'}
  win.once('ready-to-show', () => win.show());
  // open external links in the default browser
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => {
    ${remote ? `const home = new URL(${JSON.stringify(cfg.url)}).host; if (new URL(url).host !== home) { e.preventDefault(); shell.openExternal(url); }` : "if (!url.startsWith('file:')) { e.preventDefault(); shell.openExternal(url); }"}
  });
  // camera / mic / notifications / geolocation for web APIs
  win.webContents.session.setPermissionRequestHandler((_wc, _permission, cb) => cb(true));
  ${remote ? `win.loadURL(${JSON.stringify(cfg.url)}).catch(() => win.loadFile(path.join(__dirname, 'app', 'index.html')));` : "win.loadFile(path.join(__dirname, 'app', 'index.html'));"}
${cfg.tray ? `
  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'build', 'icon.png')).resize({ width: 18, height: 18 }));
  tray.setToolTip(${JSON.stringify(name)});
  tray.setContextMenu(Menu.buildFromTemplate([{ label: 'Show', click: () => win.show() }, { type: 'separator' }, { label: 'Quit', click: () => app.quit() }]));
  tray.on('click', () => (win.isVisible() ? win.hide() : win.show()));` : ''}
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
`;
  files['preload.js'] = `// Safe bridge for your page: window.desktop.platform, window.desktop.version\nconst { contextBridge } = require('electron');\ncontextBridge.exposeInMainWorld('desktop', { platform: process.platform, version: ${JSON.stringify(cfg.version || '1.0.0')} });\n`;
  const os = { win: 'windows-latest', mac: 'macos-latest', linux: 'ubuntu-latest' };
  files['.github/workflows/build-desktop.yml'] = `# Free cloud build for ${targets.map((t) => ({ win: 'Windows', mac: 'macOS', linux: 'Linux' }[t])).join(', ')}.\n# Push to GitHub → Actions tab → download installers from Artifacts.\nname: Build desktop apps\non:\n  push:\n  workflow_dispatch:\njobs:\n  build:\n    strategy:\n      matrix:\n        os: [${targets.map((t) => os[t]).join(', ')}]\n    runs-on: \${{ matrix.os }}\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n      - run: npm install\n      - run: npx electron-builder --publish never\n        env:\n          CSC_IDENTITY_AUTO_DISCOVERY: false\n      - uses: actions/upload-artifact@v4\n        with:\n          name: ${pkgName}-\${{ matrix.os }}\n          path: |\n            dist/*.exe\n            dist/*.dmg\n            dist/*.zip\n            dist/*.AppImage\n            dist/*.deb\n`;
  files['build-windows.bat'] = `@echo off\r\ncd /d "%~dp0"\r\nwhere npm >nul 2>nul || (echo Install Node.js from https://nodejs.org first & pause & exit /b 1)\r\ncall npm install\r\ncall npx electron-builder --win\r\necho.\r\necho Done! Installer and portable .exe are in the dist folder.\r\npause\r\n`;
  files['build-mac-linux.sh'] = { data: '#!/usr/bin/env sh\ncd "$(dirname "$0")" || exit 1\nnpm install && npx electron-builder\necho "Done! See the dist folder."\n', exec: true };
  files['run-dev.bat'] = '@echo off\r\ncd /d "%~dp0"\r\ncall npm install\r\ncall npm start\r\n';
  files['.gitignore'] = 'node_modules/\ndist/\n';
  files['README.md'] = `# ${name} — desktop app\n\nGenerated by **Forge Studio Pro** (Electron).\n\n## Build installers\n- **No install:** push this folder to GitHub → Actions → download from Artifacts (Windows .exe, macOS .dmg, Linux AppImage/.deb).\n- **Windows:** double-click \`build-windows.bat\` (needs Node.js 18+).\n- **macOS / Linux:** \`./build-mac-linux.sh\`\n- **Try it now:** \`npm install && npm start\`\n\nWindow: ${cfg.winWidth}×${cfg.winHeight}, resizable: ${cfg.resizable}, frame: ${cfg.frame}, kiosk: ${cfg.kiosk}, tray: ${cfg.tray}.\n`;
  return files;
}

export async function buildZip(kind, project, cfg) {
  const name = slug(cfg.appName || project.name);
  if (kind === 'android') return { blob: await zipFiles(await androidProject(project, cfg), `${name}-android/`), file: `${name}-android-v${cfg.version}.zip` };
  if (kind === 'web') return { blob: await zipFiles(await websiteFiles(project, cfg), `${name}-website/`), file: `${name}-website.zip` };
  return { blob: await zipFiles(await desktopFiles(project, cfg), `${name}-desktop/`), file: `${name}-desktop-v${cfg.version}.zip` };
}
