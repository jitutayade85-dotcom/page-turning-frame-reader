import { canvasToBlob, renderOutputPages, type PageEdits } from "./image";

export const previewKey = (edits: PageEdits, size: number) => JSON.stringify([
  size, edits.rotation, edits.mode, edits.split, edits.gutter, edits.removeFingers,
  edits.crop.top, edits.crop.right, edits.crop.bottom, edits.crop.left,
]);

/** Weak source ownership, four recent edits per source, and one canvas job at a time. */
export function createPreviewCache(render: (blob: Blob, edits: PageEdits, size: number) => Promise<Blob[]>) {
  const sources = new WeakMap<Blob, Map<string, Promise<Blob[]>>>();
  let queue: Promise<unknown> = Promise.resolve();
  return {
    get(blob: Blob, edits: PageEdits, size: number) {
      let entries = sources.get(blob);
      if (!entries) { entries = new Map(); sources.set(blob, entries); }
      const key = previewKey(edits, size);
      const existing = entries.get(key);
      if (existing) { entries.delete(key); entries.set(key, existing); return existing; }
      const job = queue.then(async () => {
        // Yield before CPU work so input and loading indicators can paint.
        await new Promise((resolve) => setTimeout(resolve, 0));
        return render(blob, edits, size);
      });
      queue = job.catch(() => {});
      entries.set(key, job);
      while (entries.size > 4) {
        const oldest = entries.keys().next().value;
        if (oldest === undefined) break;
        entries.delete(oldest);
      }
      job.catch(() => { if (entries?.get(key) === job) entries.delete(key); });
      return job;
    },
  };
}

export const previewCache = createPreviewCache(async (blob, edits, size) => {
  const canvases = await renderOutputPages(blob, edits, size);
  return Promise.all(canvases.map((canvas) => canvasToBlob(canvas)));
});