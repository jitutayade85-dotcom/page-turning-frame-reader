// In-browser video page extraction. Videos never leave the device.

export type ExtractedFrame = { time: number; blob: Blob; sharpness: number; width: number; height: number };
export type Progress = (fraction: number, label: string) => void;

const ANALYSIS_W = 96;
const SHARP_W = 320;

export const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB
export const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-matroska", "video/3gpp", "video/x-m4v"];

export function validateVideo(file: File): string | null {
  const okType = VIDEO_TYPES.includes(file.type) || /\.(mp4|mov|webm|mkv|3gp|m4v)$/i.test(file.name);
  if (!okType) return "Unsupported file. Please use MP4, MOV, WebM, MKV or 3GP.";
  if (file.size > MAX_VIDEO_BYTES) return "This video is larger than 2 GB. Please trim it and try again.";
  if (file.size === 0) return "This file is empty.";
  return null;
}

export function loadVideo(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.src = url;
    v.onloadedmetadata = () => resolve(v);
    v.onerror = () => reject(new Error("This video can't be read by your browser. Try MP4 (H.264)."));
  });
}

export function seek(v: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const done = () => { v.removeEventListener("seeked", done); resolve(); };
    v.addEventListener("seeked", done);
    v.onerror = () => reject(new Error("Video seek failed"));
    v.currentTime = Math.min(Math.max(0, t), Math.max(0, v.duration - 0.05));
  });
}

function grayAt(v: HTMLVideoElement, w: number, ctx: CanvasRenderingContext2D) {
  const h = Math.max(1, Math.round((v.videoHeight / v.videoWidth) * w));
  ctx.canvas.width = w;
  ctx.canvas.height = h;
  ctx.drawImage(v, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  const g = new Float32Array(w * h);
  for (let i = 0; i < g.length; i++) g[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
  return { g, w, h };
}

/** Variance of the Laplacian — higher = sharper. */
export function laplacianVariance(g: Float32Array, w: number, h: number) {
  let sum = 0, sum2 = 0, n = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const l = g[i - w] + g[i + w] + g[i - 1] + g[i + 1] - 4 * g[i];
    sum += l; sum2 += l * l; n++;
  }
  const m = sum / n;
  return sum2 / n - m * m;
}

function meanAbsDiff(a: Float32Array, b: Float32Array) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s / a.length;
}

export async function captureFrame(v: HTMLVideoElement, t: number, maxSide = 2400): Promise<ExtractedFrame> {
  await seek(v, t);
  const scale = Math.min(1, maxSide / Math.max(v.videoWidth, v.videoHeight));
  const c = document.createElement("canvas");
  c.width = Math.round(v.videoWidth * scale);
  c.height = Math.round(v.videoHeight * scale);
  const ctx = c.getContext("2d")!;
  ctx.drawImage(v, 0, 0, c.width, c.height);
  const sc = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
  const { g, w, h } = grayAt(v, SHARP_W, sc);
  const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), "image/jpeg", 0.92));
  return { time: t, blob, sharpness: laplacianVariance(g, w, h), width: c.width, height: c.height };
}

type Sample = { t: number; thumb: Float32Array; sharp: number; motion: number };

/**
 * Automatic page detection:
 * 1. Sample the video (~6 fps, capped) and measure motion (difference to previous sample) and sharpness.
 * 2. Stable stretches (low motion) are candidate page views; page turns show up as motion spikes.
 * 3. A stable stretch becomes a new page when it differs enough from the previous page.
 * 4. The sharpest sample of each page is captured at full resolution.
 * Repeated views of the same page are merged (keeping the sharper frame), so duplicates and blurry frames drop out.
 */
export async function autoExtract(url: string, onProgress: Progress, signal: AbortSignal): Promise<{ frames: ExtractedFrame[]; warnings: string[] }> {
  const v = await loadVideo(url);
  const duration = v.duration;
  if (!isFinite(duration) || duration <= 0) throw new Error("Couldn't read the video length.");
  const step = Math.max(1 / 6, duration / 1500);
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
  const sctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
  const samples: Sample[] = [];
  let prev: Float32Array | null = null;
  for (let t = 0; t < duration; t += step) {
    if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
    await seek(v, t);
    const { g } = grayAt(v, ANALYSIS_W, ctx);
    const s = grayAt(v, SHARP_W, sctx);
    const motion = prev ? meanAbsDiff(prev, g) : 0;
    samples.push({ t, thumb: g, sharp: laplacianVariance(s.g, s.w, s.h), motion });
    prev = g;
    onProgress((t / duration) * 0.8, `Analysing frames… ${Math.round(t)}s / ${Math.round(duration)}s`);
  }

  // Adaptive motion threshold based on the video's own motion distribution.
  const motions = samples.map((s) => s.motion).sort((a, b) => a - b);
  const median = motions[Math.floor(motions.length / 2)] ?? 0;
  const stableThr = Math.max(2.5, median * 1.5);
  const pageChangeThr = 9;

  type Seg = { best: Sample; ref: Float32Array; len: number };
  const pages: Seg[] = [];
  let cur: Seg | null = null;
  for (const s of samples) {
    if (s.motion > stableThr) { // moving: close current stable segment
      if (cur && cur.len >= 2) commit(cur);
      cur = null;
      continue;
    }
    if (!cur) cur = { best: s, ref: s.thumb, len: 1 };
    else { cur.len++; if (s.sharp > cur.best.sharp) cur.best = s; }
  }
  if (cur && cur.len >= 2) commit(cur);
  if (pages.length === 0 && samples.length) {
    const best = samples.reduce((a, b) => (b.sharp > a.sharp ? b : a));
    pages.push({ best, ref: best.thumb, len: 1 });
  }

  function commit(seg: Seg) {
    const last = pages[pages.length - 1];
    if (last && meanAbsDiff(last.ref, seg.best.thumb) < pageChangeThr) {
      if (seg.best.sharp > last.best.sharp) last.best = seg.best; // same page seen again: keep sharper
      return;
    }
    // Check older pages too — flag repeats (e.g. user flipped back)
    pages.push({ best: seg.best, ref: seg.best.thumb, len: seg.len });
  }

  const warnings: string[] = [];
  for (let i = 0; i < pages.length; i++) for (let j = 0; j < i - 1; j++) {
    if (meanAbsDiff(pages[i].ref, pages[j].ref) < pageChangeThr * 0.7) {
      warnings.push(`Page ${i + 1} looks like a repeat of page ${j + 1}.`);
      break;
    }
  }
  const sharpVals = pages.map((p) => p.best.sharp).sort((a, b) => a - b);
  const medSharp = sharpVals[Math.floor(sharpVals.length / 2)] ?? 0;
  pages.forEach((p, i) => { if (p.best.sharp < medSharp * 0.35) warnings.push(`Page ${i + 1} may be blurry — consider re-capturing it manually.`); });

  const frames: ExtractedFrame[] = [];
  for (let i = 0; i < pages.length; i++) {
    if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
    frames.push(await captureFrame(v, pages[i].best.t));
    onProgress(0.8 + (0.2 * (i + 1)) / pages.length, `Capturing page ${i + 1} of ${pages.length}`);
  }
  v.removeAttribute("src");
  v.load();
  return { frames, warnings };
}
