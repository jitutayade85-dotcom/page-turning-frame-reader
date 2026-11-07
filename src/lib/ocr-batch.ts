/** Keep page order, isolate failures, and never start more than three OCR jobs. */
export async function readPages<T>(
  pages: T[],
  read: (page: T, index: number) => Promise<string>,
  onProgress: (completed: number) => void,
  signal?: AbortSignal,
) {
  const texts = Array<string>(pages.length).fill("");
  const failed: number[] = [];
  let next = 0, completed = 0;
  const check = () => { if (signal?.aborted) throw new DOMException("Cancelled", "AbortError"); };
  await Promise.all(Array.from({ length: Math.min(3, pages.length) }, async () => {
    while (next < pages.length) {
      check();
      const index = next++;
      try { texts[index] = await read(pages[index], index); }
      catch (error) {
        if (signal?.aborted || (error instanceof Error && error.name === "AbortError")) throw error;
        failed.push(index + 1);
      }
      check();
      onProgress(++completed);
    }
  }));
  return { texts, failed: failed.sort((a, b) => a - b) };
}