# Forge Studio Pro

Forge Studio Pro is a visual app builder made with React, Three.js and Vite. You design visually, edit anything, get clean code, and publish to **Android (APK/AAB)**, **desktop (Windows/macOS/Linux)** and the **web (PWA)**.

## Start

Double-click **`Start Forge Pro.bat`**. Or run:

```bash
npm install
npm run dev        # http://localhost:5199
npm run build      # static build in dist/
```

Requires Node.js 18+. Your work auto-saves in the browser. Use **Forge menu → Save project** for a file copy.

## Put it online (GitHub Pages)

```bash
gh repo create forge-studio-pro --public --source . --push
```

Then on GitHub, open **Settings → Pages → Source: GitHub Actions**. Every push to `main` rebuilds and publishes the site to `https://<you>.github.io/forge-studio-pro/`. The included workflow is `.github/workflows/deploy.yml`.

## Runs on the user's device

GitHub only hosts the files. All editing, 3D rendering, code generation and app packaging run on the visitor's own CPU and GPU.

* **Storage:** projects and component libraries are saved to **IndexedDB** on the device. That can use gigabytes, versus about 5 MB for localStorage. The app asks the browser to make the storage **persistent**, so it won't be evicted when space runs low. Usage is shown under *Project → Device storage*.
* **Offline and installable:** a service worker caches the app after the first visit. It then loads instantly and works without internet, and can be installed from the address bar like a desktop or mobile app.
* **Smooth 3D:** scenes request the high-performance GPU, stop rendering when off screen or when the tab is hidden, and automatically lower resolution on slower devices and raise it again when frames are smooth. Exported apps use the same off-screen pause.
* **No jank:** autosave waits until the browser is idle, and the 3D engine loads as a separate chunk only when it's needed.

## What's inside

| Area | What you get |
|---|---|
| **Library** | 170+ ready components in 12 categories (Basics, Typography, Buttons, Forms, Cards, Navigation, Data & Charts, Feedback, Sections, Mobile, 3D, Backgrounds), plus 5 full page templates. Live thumbnails, search, and drag-and-drop or click to insert. |
| **My components** | Save any selection as your own component (Ctrl+Alt+K). Create, rename and delete categories, add favourites, move components between categories, update a component from the selection, and export/import the library as a file. |
| **Icons** | Every Lucide icon (1,500+), searchable, with adjustable stroke. Click to insert or to swap the selected icon. |
| **Canvas** | Infinite zoom and pan, smart snapping guides, resize/rotate handles, marquee select, deep select (Ctrl-click), double-click to drill in or edit text, auto-layout reordering by drag, a drawing tools bar, and drag-in images and videos. |
| **3D layer view** | Press **3** to explode the page into 3D layers and orbit it. |
| **Inspector** | Position/size with hug/fill/fixed sizing, auto layout (flexbox), fills (solid, linear, radial, conic, mesh, image) with 36 gradient presets, strokes, per-corner radius, multiple shadows with presets, blur and backdrop blur, blend modes, filters, 50 Google fonts (or any font by name), gradient text, text shadows. |
| **Motion** | 16 entrance animations, 12 hover effects, 12 loops, easing/duration/delay, and stagger for children. |
| **3D objects** | Three.js / React Three Fiber scenes: 19 shapes, 10 materials (glass, chrome, liquid distort, wobble, neon, holo…), lighting, float, auto-rotate. |
| **Interactions** | Go to page, back, open link, scroll, message. Live **Preview** (P) with a phone frame. |
| **Code** | React, React + Tailwind, HTML, CSS, Vue, React Native, Three.js (R3F) and JSON, for the selection or the whole page. Copy, download, or get a **full Vite React project** as a zip. |
| **Themes** | 10 one-click themes that recolour every layer. |
| **Command palette** | Ctrl+K: every action, component and page. Press **?** for all shortcuts. |

## Publish Center (one click)

Open **Publish** in the top bar. The source can be **this design**, **your own HTML** (a single file, a zipped site, or pasted code), or **any live URL**.

* **App identity:** name, short name, package ID (validated), version and version code, description, author, language.
* **Icon & splash:** upload a logo or design one (1,500+ glyphs, gradients, shape, padding). Every size is exported: Android densities, adaptive and round icons, Play Store 512, PWA, favicon and desktop. Splash colour, status bar colour and style.
* **Permissions:** 40+ Android permissions in groups, with presets (Camera/QR, Video call, Maps…) and custom permissions. Sensitive ones get real runtime prompts, and camera/mic/location also work from web code.
* **Android:** orientation, fullscreen/immersive, keep awake, pull to refresh, zoom, file upload, downloads, cache, link behaviour, back button, min/target SDK, user-agent, debugging, and a JS bridge (`Android.toast / vibrate / share / exit`).
* **Desktop (Electron):** window size, resizable, frame, menu bar, always on top, kiosk, tray, single instance, DevTools, and choice of platforms.
* **Website:** PWA, offline cache, SEO title and description, og:image, Google Analytics, robots.txt, sitemap, and Netlify/Vercel/GitHub Pages configs.

Each **Build** button downloads a complete project:

* **Android:** builds with the bundled Gradle wrapper (`build-apk.bat`), in Android Studio, or for free on GitHub Actions. The GitHub workflow outputs both an `.apk` and an `.aab` for Google Play, and supports optional release signing via secrets.
* **Desktop:** `build-windows.bat` produces an installer and a portable `.exe`. The GitHub workflow builds Windows, macOS and Linux.
* **Website:** drag the folder onto Netlify Drop, or push it to GitHub Pages.

> Browsers can't run the Android SDK or Electron compilers, so the final `.apk` / `.exe` is compiled by those tools. Everything they need is already in the zip.
