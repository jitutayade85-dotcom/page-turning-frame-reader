// @ts-nocheck
// Page image processing on canvas. Only enhances what's in the photo — never invents content.

export type ImageMode = "original" | "clean" | "bw";
export type Crop = { top: number; right: number; bottom: number; left: number }; // fractions 0..0.45
export type PageEdits = { rotation: 0 | 90 | 180 | 270; crop: Crop; mode: ImageMode };

export const defaultEdits = (): PageEdits => ({ rotation: 0, crop: { top: 0, right: 0, bottom: 0, left: 0 }, mode: "clean" });

export async function blobToBitmap(blob: Blob) {
  return await createImageBitmap(blob);
}

function boxBlurGray(src: Float32Array, w: number, h: number, r: number) {
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    let acc = 0;
    for (let x = -r; x <= r; x++) acc += src[y * w + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = acc / (2 * r + 1);
      acc += src[y * w + Math.min(w - 1, x + r + 1)] - src[y * w + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc / (2 * r + 1);
      acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

function otsu(g: Float32Array) {
  const hist = new Array(256).fill(0);
  for (const v of g) hist[Math.max(0, Math.min(255, v | 0))]++;
  const total = g.length;
  let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, max = 0, thr = 128;
  for (let i = 0; i < 256; i++) {
    wB += hist[i]; if (!wB) continue;
    const wF = total - wB; if (!wF) break;
    sumB += i * hist[i];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > max) { max = between; thr = i; }
  }
  return thr;
}

/** Detect page edges: bounding box of the bright (paper) region. */
export async function detectCrop(blob: Blob): Promise<Crop> {
  const bmp = await blobToBitmap(blob);
  const w = 200, h = Math.round((bmp.height / bmp.width) * 200);
  const c = new OffscreenCanvas(w, h);
  const ctx = c.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  const g = new Float32Array(w * h);
  for (let i = 0; i < g.length; i++) g[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
  const bg = boxBlurGray(g, w, h, 3);
  const thr = otsu(bg);
  const rowFrac = (y: number) => { let n = 0; for (let x = 0; x < w; x++) if (bg[y * w + x] > thr) n++; return n / w; };
  const colFrac = (x: number) => { let n = 0; for (let y = 0; y < h; y++) if (bg[y * w + x] > thr) n++; return n / h; };
  let top = 0; while (top < h * 0.45 && rowFrac(top) < 0.5) top++;
  let bottom = h - 1; while (bottom > h * 0.55 && rowFrac(bottom) < 0.5) bottom--;
  let left = 0; while (left < w * 0.45 && colFrac(left) < 0.5) left++;
  let right = w - 1; while (right > w * 0.55 && colFrac(right) < 0.5) right--;
  return { top: top / h, bottom: (h - 1 - bottom) / h, left: left / w, right: (w - 1 - right) / w };
}

export async function renderPage(blob: Blob, edits: PageEdits, maxSide = 2400): Promise<HTMLCanvasElement> {
  const bmp = await blobToBitmap(blob);
  const { crop } = edits;
  const sx = bmp.width * crop.left, sy = bmp.height * crop.top;
  const sw = bmp.width * (1 - crop.left - crop.right), sh = bmp.height * (1 - crop.top - crop.bottom);
  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  const cw = Math.max(1, Math.round(sw * scale)), ch = Math.max(1, Math.round(sh * scale));
  const rot = edits.rotation;
  const c = document.createElement("canvas");
  c.width = rot % 180 === 0 ? cw : ch;
  c.height = rot % 180 === 0 ? ch : cw;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.drawImage(bmp, sx, sy, sw, sh, -cw / 2, -ch / 2, cw, ch);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (edits.mode !== "original") enhance(ctx, c.width, c.height, edits.mode);
  return c;
}

/** Shadow reduction (illumination normalisation), contrast stretch, denoise + sharpen, optional B&W. */
function enhance(ctx: CanvasRenderingContext2D, w: number, h: number, mode: ImageMode) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const n = w * h;
  const lum = new Float32Array(n);
  for (let i = 0; i < n; i++) lum[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
  // Background (paper + shadows) estimate at low resolution
  const sw = Math.max(16, Math.round(w / 8)), sh = Math.max(16, Math.round(h / 8));
  const small = new Float32Array(sw * sh);
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    // max-ish filter: use brightest of a few samples to ignore text
    let m = 0;
    for (let dy = 0; dy < 8; dy += 2) for (let dx = 0; dx < 8; dx += 2) {
      const px = Math.min(w - 1, x * 8 + dx), py = Math.min(h - 1, y * 8 + dy);
      m = Math.max(m, lum[py * w + px]);
    }
    small[y * sw + x] = m;
  }
  const bgSmall = boxBlurGray(small, sw, sh, 4);
  const bgAt = (x: number, y: number) => bgSmall[Math.min(sh - 1, (y / 8) | 0) * sw + Math.min(sw - 1, (x / 8) | 0)] || 1;

  // Normalise
  const norm = new Float32Array(n);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    norm[i] = Math.min(255, (lum[i] / Math.max(30, bgAt(x, y))) * 240);
  }
  // Light denoise + unsharp mask
  const blur = boxBlurGray(norm, w, h, 1);
  const sharp = new Float32Array(n);
  for (let i = 0; i < n; i++) sharp[i] = Math.max(0, Math.min(255, norm[i] + 0.8 * (norm[i] - blur[i])));

  if (mode === "bw") {
    const local = boxBlurGray(sharp, w, h, Math.max(8, Math.round(Math.min(w, h) / 40)));
    for (let i = 0; i < n; i++) {
      const v = sharp[i] < local[i] - 12 ? 0 : 255;
      d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v;
    }
  } else {
    // Clean scan: apply luminance gain to colour channels, then contrast stretch
    const sorted = Float32Array.from(sharp).sort();
    const lo = sorted[Math.floor(n * 0.01)], hi = sorted[Math.floor(n * 0.98)];
    const range = Math.max(1, hi - lo);
    for (let i = 0; i < n; i++) {
      const target = Math.max(0, Math.min(255, ((sharp[i] - lo) / range) * 255));
      const gain = target / Math.max(1, lum[i]);
      for (let k = 0; k < 3; k++) d[i * 4 + k] = Math.max(0, Math.min(255, d[i * 4 + k] * gain * 0.35 + target * 0.65));
    }
  }
  ctx.putImageData(img, 0, 0);
}

export function canvasToBlob(c: HTMLCanvasElement, type = "image/jpeg", q = 0.9) {
  return new Promise<Blob>((r) => c.toBlob((b) => r(b!), type, q));
}
