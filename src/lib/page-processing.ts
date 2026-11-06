/** All coordinates refer to the cropped, rotated page. Splits preserve left-to-right order. */
export function splitBounds(width: number, enabled: boolean, gutter: number) {
  if (!enabled || width < 2) return [{ x: 0, width }];
  const cut = Math.max(1, Math.min(width - 1, Math.round(width * Math.max(0.2, Math.min(0.8, gutter)))));
  return [{ x: 0, width: cut }, { x: cut, width: width - cut }];
}

export function detectSpreadPixels(data: Uint8ClampedArray, width: number, height: number) {
  const scores: number[] = [];
  const from = Math.floor(width * 0.35), to = Math.ceil(width * 0.65);
  for (let x = from; x <= to; x++) {
    let sum = 0;
    for (let y = Math.floor(height * 0.1); y < height * 0.9; y++) {
      const i = (y * width + x) * 4;
      sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    scores.push(sum / Math.max(1, Math.ceil(height * 0.9) - Math.floor(height * 0.1)));
  }
  const minimum = Math.min(...scores);
  const candidates = scores.map((score, i) => ({ score, x: from + i }));
  const best = candidates.filter((c) => c.score <= minimum + 3).sort((a, b) => Math.abs(a.x - width / 2) - Math.abs(b.x - width / 2))[0];
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  return { enabled: width / height >= 1.15 && mean - minimum > 12, gutter: best ? best.x / width : 0.5 };
}

/** Conservative edge-connected skin mask. Never reconstructs covered text. */
export function cleanupMarginFingers(data: Uint8ClampedArray, width: number, height: number) {
  const count = width * height;
  const mask = new Uint8Array(count);
  const queue: number[] = [];
  const bandX = Math.max(1, Math.floor(width * 0.12));
  const bandY = Math.max(1, Math.floor(height * 0.12));
  const skin = (p: number) => {
    const i = p * 4, r = data[i], g = data[i + 1], b = data[i + 2];
    return r > 85 && g > 35 && b > 20 && r - g > 18 && r - b > 25 && g > b && r / Math.max(1, g) > 1.15;
  };
  const add = (p: number) => {
    if (mask[p]) return;
    const x = p % width, y = Math.floor(p / width);
    if (x >= bandX && x < width - bandX && y >= bandY && y < height - bandY) return;
    if (skin(p)) { mask[p] = 1; queue.push(p); }
  };
  for (let x = 0; x < width; x++) { add(x); add((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { add(y * width); add(y * width + width - 1); }
  for (let q = 0; q < queue.length; q++) {
    const p = queue[q], x = p % width, y = Math.floor(p / width);
    if (x > 0) add(p - 1); if (x < width - 1) add(p + 1);
    if (y > 0) add(p - width); if (y < height - 1) add(p + width);
  }
  // Sample actual nearby bright paper. Skip regions with no safe paper donor.
  const original = data.slice();
  let replaced = 0;
  for (const p of queue) {
    const x = p % width, y = Math.floor(p / width);
    let donor = -1;
    for (let r = 1; r <= Math.max(bandX, bandY) + 2 && donor < 0; r++) {
      for (const [dx, dy] of [[r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, -r], [r, -r], [-r, r]]) {
        const sx = x + dx, sy = y + dy;
        if (sx < 0 || sy < 0 || sx >= width || sy >= height) continue;
        const s = sy * width + sx, i = s * 4;
        if (!mask[s] && !skin(s) && Math.min(original[i], original[i + 1], original[i + 2]) > 170 && Math.max(original[i], original[i + 1], original[i + 2]) - Math.min(original[i], original[i + 1], original[i + 2]) < 45) { donor = s; break; }
      }
    }
    if (donor < 0) continue;
    for (let c = 0; c < 3; c++) data[p * 4 + c] = original[donor * 4 + c];
    replaced++;
  }
  return replaced;
}