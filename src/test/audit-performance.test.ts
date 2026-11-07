import { describe, expect, it, vi } from "vitest";
import { contrastThresholds } from "../lib/contrast";
import { readPages } from "../lib/ocr-batch";
import { createPreviewCache } from "../lib/preview-cache";
import { defaultEdits } from "../lib/image";

describe("linear contrast thresholds", () => {
  it("uses the first and 98th percentile bins", () => {
    expect(contrastThresholds(Float32Array.from({ length: 100 }, (_, i) => i + 0.75))).toEqual({ lo: 1, hi: 98 });
  });
  it("handles flat and endpoint images", () => {
    expect(contrastThresholds(new Float32Array(1000).fill(240))).toEqual({ lo: 240, hi: 240 });
    expect(contrastThresholds(new Float32Array([0, 255]))).toEqual({ lo: 0, hi: 255 });
  });
});

describe("resilient OCR", () => {
  it("limits concurrent calls to three and preserves original page order", async () => {
    let active = 0, maximum = 0;
    const result = await readPages([0, 1, 2, 3, 4, 5], async (page) => {
      maximum = Math.max(maximum, ++active);
      await new Promise((resolve) => setTimeout(resolve, page === 0 ? 15 : 1));
      active--;
      return `page ${page}`;
    }, () => {});
    expect(maximum).toBe(3);
    expect(result.texts).toEqual(["page 0", "page 1", "page 2", "page 3", "page 4", "page 5"]);
  });
  it("keeps successful text and marks a failed page instead of aborting export", async () => {
    const progress = vi.fn();
    const result = await readPages([1, 2, 3, 4], async (page) => {
      if (page === 2) throw new Error("Rate limited");
      return `${page}`;
    }, progress);
    expect(result).toEqual({ texts: ["1", "", "3", "4"], failed: [2] });
    expect(progress).toHaveBeenLastCalledWith(4);
  });
  it("does not schedule remaining pages after cancellation", async () => {
    const controller = new AbortController();
    const read = vi.fn(async () => { controller.abort(); return "text"; });
    await expect(readPages([1, 2, 3, 4, 5], read, () => {}, controller.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(read.mock.calls.length).toBeLessThanOrEqual(3);
  });
});

describe("preview cache", () => {
  it("deduplicates identical edit values including pending renders", async () => {
    const render = vi.fn(async () => [new Blob(["preview"])]);
    const cache = createPreviewCache(render);
    const blob = new Blob(["source"]);
    const first = cache.get(blob, defaultEdits(), 400);
    const second = cache.get(blob, defaultEdits(), 400);
    expect(first).toBe(second);
    await first;
    expect(render).toHaveBeenCalledTimes(1);
    await cache.get(blob, { ...defaultEdits(), gutter: 0.43 }, 400);
    expect(render).toHaveBeenCalledTimes(2);
  });
  it("retries rejected renders without blocking other previews", async () => {
    const render = vi.fn().mockRejectedValueOnce(new Error("Bad frame")).mockResolvedValue([new Blob()]);
    const cache = createPreviewCache(render);
    const blob = new Blob();
    await expect(cache.get(blob, defaultEdits(), 400)).rejects.toThrow("Bad frame");
    await expect(cache.get(blob, defaultEdits(), 400)).resolves.toHaveLength(1);
  });
  it("bounds cached revisions to four per source", async () => {
    const render = vi.fn(async () => [new Blob()]);
    const cache = createPreviewCache(render);
    const blob = new Blob();
    for (let i = 0; i < 5; i++) await cache.get(blob, { ...defaultEdits(), gutter: 0.3 + i / 10 }, 400);
    await cache.get(blob, { ...defaultEdits(), gutter: 0.3 }, 400);
    expect(render).toHaveBeenCalledTimes(6);
  });
});