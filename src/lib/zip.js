import JSZip from 'jszip';

export function downloadBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 5000);
}

/** files: { 'path/name': string | Uint8Array | Blob | { data, exec: true } } */
export async function zipFiles(files, root = '') {
  const zip = new JSZip();
  for (const [path, v] of Object.entries(files)) {
    if (v === null || v === undefined) continue;
    const isObj = v && typeof v === 'object' && 'data' in v && !(v instanceof Uint8Array) && !(v instanceof Blob);
    const data = isObj ? v.data : v;
    zip.file(root + path, data, { unixPermissions: isObj && v.exec ? '755' : '644', binary: typeof data !== 'string' });
  }
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 }, platform: 'UNIX' });
}

export async function readZip(file) {
  const zip = await JSZip.loadAsync(file);
  const out = {};
  const entries = Object.values(zip.files).filter((f) => !f.dir);
  for (const f of entries) {
    const text = /\.(html?|css|js|mjs|json|svg|txt|xml|webmanifest|map)$/i.test(f.name);
    out[f.name] = text ? await f.async('string') : await f.async('uint8array');
  }
  // strip a common top folder
  const names = Object.keys(out);
  const first = names[0]?.split('/')[0];
  if (names.length && names.every((n) => n.startsWith(first + '/'))) {
    const stripped = {};
    for (const n of names) stripped[n.slice(first.length + 1)] = out[n];
    return stripped;
  }
  return out;
}
