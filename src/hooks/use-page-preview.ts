import { useEffect, useState } from "react";
import type { PageEdits } from "@/lib/image";
import { previewCache, previewKey } from "@/lib/preview-cache";

export function usePagePreview(blob: Blob, edits: PageEdits, size: number, enabled = true, delay = 0) {
  const key = previewKey(edits, size);
  const [result, setResult] = useState<{ key: string; blob: Blob; urls: string[]; error: string } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    let urls: string[] = [];
    const timer = setTimeout(() => {
      previewCache.get(blob, edits, size).then((blobs) => {
        if (!live) return;
        urls = blobs.map((b) => URL.createObjectURL(b));
        setResult({ key, blob, urls, error: "" });
      }).catch((error) => {
        if (live) setResult({ key, blob, urls: [], error: error instanceof Error ? error.message : "Preview unavailable" });
      });
    }, delay);
    return () => { live = false; clearTimeout(timer); urls.forEach((url) => URL.revokeObjectURL(url)); };
    // The value key intentionally ignores object identity and selection/reordering.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blob, key, enabled, delay]);
  return result?.key === key && result.blob === blob ? result : { urls: [], error: "" };
}