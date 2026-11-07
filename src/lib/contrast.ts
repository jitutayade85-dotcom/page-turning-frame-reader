/** Quantized order statistics, without copying or sorting image-sized arrays. */
export function contrastThresholds(values: Float32Array) {
  const histogram = new Uint32Array(256);
  for (let i = 0; i < values.length; i++) {
    histogram[Math.max(0, Math.min(255, Math.floor(values[i])))]++;
  }
  const lowRank = Math.floor(values.length * 0.01);
  const highRank = Math.floor(values.length * 0.98);
  let count = 0, lo = 0, hi = 255, foundLow = false;
  for (let bin = 0; bin < 256; bin++) {
    count += histogram[bin];
    if (!foundLow && count > lowRank) { lo = bin; foundLow = true; }
    if (count > highRank) { hi = bin; break; }
  }
  return { lo, hi };
}