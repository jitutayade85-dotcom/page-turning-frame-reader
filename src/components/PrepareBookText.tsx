import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, ScanText, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ocrPage } from "@/lib/account.functions";
import { signedUrl } from "@/lib/documents";
import { pdfPageText } from "@/lib/book-text";

export function PrepareBookText({ docId, filePath, existing }: { docId: string; filePath: string; existing: string[] }) {
  const ocr = useServerFn(ocrPage);
  const qc = useQueryClient();
  const [progress, setProgress] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  async function prepare() {
    if (controller.current) return;
    const abort = new AbortController();
    controller.current = abort;
    setProgress("Opening PDF…");
    let cleanup: (() => Promise<void>) | undefined;
    try {
      const pdfjs = await import("pdfjs-dist");
      const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      const response = await fetch(await signedUrl(filePath), { signal: abort.signal });
      if (!response.ok) throw new Error("Couldn't open this PDF.");
      const task = pdfjs.getDocument({ data: new Uint8Array(await response.arrayBuffer()) });
      cleanup = () => task.destroy();
      const pdf = await task.promise;
      const texts = Array.from({ length: pdf.numPages }, (_, i) => existing[i] ?? "");
      let updated = 0;
      for (let i = 0; i < pdf.numPages; i++) {
        abort.signal.throwIfAborted();
        if (texts[i]?.trim()) continue;
        setProgress(`Reading page ${i + 1} of ${pdf.numPages}…`);
        const page = await pdf.getPage(i + 1);
        try {
          const content = await page.getTextContent();
          let text = pdfPageText(content.items);
          if (!text) {
            const base = page.getViewport({ scale: 1 });
            const viewport = page.getViewport({ scale: Math.min(2, 1600 / Math.max(base.width, base.height)) });
            const canvas = document.createElement("canvas");
            canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
            const context = canvas.getContext("2d");
            if (!context) throw new Error("Page images could not be opened.");
            await page.render({ canvas, canvasContext: context, viewport }).promise;
            abort.signal.throwIfAborted();
            const result = await ocr({ data: { image: canvas.toDataURL("image/jpeg", 0.85) }, signal: abort.signal });
            text = result.text;
            canvas.width = 0; canvas.height = 0;
          }
          texts[i] = text;
          // Save each finished page so cancellation or a later failure does not lose work.
          const { error } = await supabase.from("documents").update({ page_texts: [...texts] }).eq("id", docId);
          if (error) throw error;
          updated++;
        } finally { page.cleanup(); }
      }
      if (!texts.some((text) => text.trim())) toast.info("No readable text was found in this PDF.");
      else toast.success(`Book text ready${updated ? ` · ${updated} pages read` : ""}`);
    } catch (error) {
      if ((error as Error).name === "AbortError") toast.info("Stopped. Completed pages are saved.");
      else toast.error((error as Error).message);
    } finally {
      await cleanup?.();
      controller.current = null;
      setProgress(null);
      await Promise.all([qc.invalidateQueries({ queryKey: ["document", docId] }), qc.invalidateQueries({ queryKey: ["documents"] })]);
    }
  }

  return <div className="flex flex-wrap items-center justify-center gap-3">
    <Button variant="gold" className="rounded-xl" disabled={!!progress} onClick={prepare}>{progress ? <Loader2 className="animate-spin" /> : <ScanText />}{progress ?? "Prepare book text"}</Button>
    {progress && <Button variant="outline" size="icon" aria-label="Stop text recognition" onClick={() => controller.current?.abort()}><Square /></Button>}
  </div>;
}