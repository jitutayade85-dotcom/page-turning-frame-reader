/** Preserve PDF text order and its line boundaries rather than merging whole pages. */
export function pdfPageText(items: unknown[]): string {
  let text = "";
  for (const item of items) {
    if (!item || typeof item !== "object" || !("str" in item) || typeof item.str !== "string") continue;
    text += item.str;
    text += "hasEOL" in item && item.hasEOL ? "\n" : " ";
  }
  return text.trim();
}

/** Sentence-aware, Unicode-safe chunks; joining them restores the entire page. */
export function chunkText(text: string, maxCodePoints = 1200): string[] {
  if (!Number.isInteger(maxCodePoints) || maxCodePoints < 1) throw new Error("Invalid chunk budget");
  const chunks: string[] = [];
  let current = "";
  for (const sentence of text.match(/[^.!?。！？।]+[.!?。！？।]*\s*|[.!?。！？।]+\s*/gu) ?? []) {
    const points = Array.from(sentence);
    if (Array.from(current).length + points.length <= maxCodePoints) { current += sentence; continue; }
    if (current) chunks.push(current);
    current = "";
    for (let offset = 0; offset < points.length; offset += maxCodePoints) {
      const part = points.slice(offset, offset + maxCodePoints).join("");
      if (offset + maxCodePoints < points.length) chunks.push(part);
      else current = part;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}