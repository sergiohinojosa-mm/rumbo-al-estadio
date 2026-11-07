// Turning game things into files the family can keep: an SVG drawing → PNG, an AudioBuffer → WAV,
// and one way to hand files over (the share sheet on iPhone, a download on the Mac).
// Nothing is uploaded: the files go straight from the device to wherever the grown-up chooses.

// SVG markup → PNG Blob at width×height (the SVG is scaled to fit). Resolves null if the browser can't.
export function svgToPng(svg, width, height, { background = null } = {}) {
  return new Promise((resolve) => {
    // Safari draws an <img> SVG without width/height at 0×0 or 150×150: give the root one if it has none.
    const sized = String(svg).replace(/<svg\b[^>]*>/, (tag) => (/\swidth=/.test(tag) ? tag
      : tag.replace(/\sstyle="[^"]*"/, '').replace('<svg', `<svg width="${width}" height="${height}"`)));
    const src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sized);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const g = canvas.getContext('2d');
        if (background) { g.fillStyle = background; g.fillRect(0, 0, width, height); }
        g.drawImage(img, 0, 0, width, height);
        canvas.toBlob((b) => resolve(b || null), 'image/png');
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// AudioBuffer → 16-bit PCM WAV Blob (stereo if the buffer is).
export function wavBlob(buffer) {
  const ch = Math.min(2, buffer.numberOfChannels);
  const len = buffer.length;
  const data = new DataView(new ArrayBuffer(44 + len * ch * 2));
  const str = (o, s) => { for (let i = 0; i < s.length; i++) data.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); data.setUint32(4, 36 + len * ch * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, ch, true);
  data.setUint32(24, buffer.sampleRate, true); data.setUint32(28, buffer.sampleRate * ch * 2, true);
  data.setUint16(32, ch * 2, true); data.setUint16(34, 16, true);
  str(36, 'data'); data.setUint32(40, len * ch * 2, true);
  const chans = Array.from({ length: ch }, (_, i) => buffer.getChannelData(i));
  let o = 44;
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < ch; c++) {
      const v = Math.max(-1, Math.min(1, chans[c][i]));
      data.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true);
      o += 2;
    }
  }
  return new Blob([data], { type: 'audio/wav' });
}

// A file name without accents or odd characters: "Sol y bailar" → "sol-y-bailar".
// Long names are cut at a whole word ("...titulo-larguisimo", not "...larguisimo-par").
export const safeName = (t, fallback = 'archivo') => {
  const n = String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || fallback;
  if (n.length <= 40) return n;
  const cut = n.slice(0, 41);
  const at = cut.lastIndexOf('-');
  return at >= 12 ? cut.slice(0, at) : n.slice(0, 40).replace(/-$/, '');
};

// files: [{ blob, name }]. On iPhone opens the share sheet (Guardar en Fotos / Archivos / mandar a la familia);
// where that isn't possible, downloads each file. Resolves 'shared' | 'downloaded' | 'cancelled' | 'failed'.
export async function shareFiles(files, { title = '', text = '' } = {}) {
  const list = files.filter((f) => f && f.blob);
  if (!list.length) return 'failed';
  const asFiles = typeof File === 'function'
    ? list.map((f) => new File([f.blob], f.name, { type: f.blob.type })) : null;
  if (asFiles && navigator.canShare && navigator.share) {
    let can = false;
    try { can = navigator.canShare({ files: asFiles }); } catch { can = false; }
    if (can) {
      // Empty title/text are left out: on iOS an extra text item hides "Guardar imagen" and some apps get only the text.
      const data = { files: asFiles };
      if (title) data.title = title;
      if (text) data.text = text;
      try { await navigator.share(data); return 'shared'; } catch (e) {
        if (e && e.name === 'AbortError') return 'cancelled';
      }
    }
  }
  try {
    for (const f of list) {
      const url = URL.createObjectURL(f.blob);
      const a = document.createElement('a');
      a.href = url; a.download = f.name; a.rel = 'noopener';
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    }
    return 'downloaded';
  } catch { return 'failed'; }
}
