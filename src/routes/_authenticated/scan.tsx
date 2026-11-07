// @ts-nocheck
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Video, Wand2, Hand, Camera, RotateCw, ArrowUp, ArrowDown, Trash2, Crop as CropIcon, ImagePlus, Loader2, X, Download, Save, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { autoExtract, captureFrame, loadVideo, validateVideo } from "@/lib/video";
import { defaultEdits, detectCrop, detectSpread, renderOutputPages, canvasToBlob, type PageEdits, type ImageMode } from "@/lib/image";
import { buildPdf, type PdfOptions } from "@/lib/pdf";
import { ocrPage } from "@/lib/account.functions";
import { usePagePreview } from "@/hooks/use-page-preview";
import { previewKey } from "@/lib/preview-cache";
import { readPages } from "@/lib/ocr-batch";

export const Route = createFileRoute("/_authenticated/scan")({
  validateSearch: (s: Record<string, unknown>): { start?: "upload" | "record" } => ({
    start: s.start === "upload" || s.start === "record" ? s.start : undefined,
  }),
  head: () => ({ meta: [{ title: "Scan a book — BookScan AI" }, { name: "description", content: "Split book spreads, clean page margins, and turn book videos into ordered PDFs." }, { property: "og:title", content: "Scan a book — BookScan AI" }, { property: "og:description", content: "Split book spreads, clean page margins, and export ordered PDFs." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: ScanPage,
});

type Page = { id: string; blob: Blob; edits: PageEdits; selected: boolean; text?: string };
const uid = () => Math.random().toString(36).slice(2);

function ScanPage() {
  const { start } = Route.useSearch();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [busy, setBusy] = useState<{ f: number; label: string } | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [editing, setEditing] = useState<Page | null>(null);
  const [autoSplit, setAutoSplit] = useState(true);
  const [removeFingers, setRemoveFingers] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const manualVid = useRef<HTMLVideoElement>(null);
  const selectedPages = useMemo(() => pages.filter((page) => page.selected), [pages]);
  useEffect(() => () => abort.current?.abort(), []);

  useEffect(() => {
    if (start === "upload") fileRef.current?.click();
    if (start === "record") camRef.current?.click();
  }, [start]);
  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  function onVideo(f?: File) {
    if (!f) return;
    const err = validateVideo(f);
    if (err) return toast.error(err);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(URL.createObjectURL(f));
    setWarnings([]);
  }
  const addBlob = async (blob: Blob) => {
    const spread = autoSplit ? await detectSpread(blob) : { enabled: false, gutter: 0.5 };
    return { id: uid(), blob, edits: { ...defaultEdits(), split: spread.enabled, gutter: spread.gutter, removeFingers }, selected: true };
  };

  async function runAuto() {
    if (!videoUrl) return;
    abort.current = new AbortController();
    setBusy({ f: 0, label: "Starting…" });
    try {
      const { frames, warnings } = await autoExtract(videoUrl, (f, label) => setBusy({ f, label }), abort.current.signal);
      const added = await Promise.all(frames.map((fr) => addBlob(fr.blob)));
      if (abort.current.signal.aborted) throw new DOMException("Cancelled", "AbortError");
      setPages((p) => [...p, ...added]);
      setWarnings(warnings);
      toast.success(`Found ${frames.length} page${frames.length === 1 ? "" : "s"}`);
    } catch (e) {
      if ((e as Error).name === "AbortError") toast.info("Extraction cancelled");
      else toast.error((e as Error).message);
    } finally { setBusy(null); }
  }
  async function captureManual() {
    const v = manualVid.current;
    if (!v || !videoUrl) return;
    try {
      const tmp = await loadVideo(videoUrl);
      const fr = await captureFrame(tmp, v.currentTime);
      const added = await addBlob(fr.blob);
      setPages((p) => [...p, added]);
      toast.success(`Captured frame at ${v.currentTime.toFixed(1)}s`);
    } catch (error) { toast.error((error as Error).message); }
  }
  async function addImages(files: FileList | null) {
    if (!files) return;
    const ok = [...files].filter((f) => f.type.startsWith("image/") && f.size < 30e6);
    setBusy({ f: 0, label: "Detecting book spreads…" });
    try {
      const added = await Promise.all(ok.map(addBlob));
      setPages((p) => [...p, ...added]);
    } catch (error) { toast.error((error as Error).message); }
    finally { setBusy(null); if (imgRef.current) imgRef.current.value = ""; }
  }
  const update = (id: string, fn: (p: Page) => Page) => setPages((ps) => ps.map((p) => (p.id === id ? fn(p) : p)));
  const move = (i: number, d: number) => setPages((ps) => { const a = [...ps]; const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; });

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Scan a book</h1><p className="text-muted-foreground">Your video is processed on this device and never uploaded.</p></div>
      <input ref={fileRef} type="file" accept="video/*,.mov,.mkv" hidden onChange={(e) => onVideo(e.target.files?.[0])} />
      <input ref={camRef} type="file" accept="video/*" capture="environment" hidden onChange={(e) => onVideo(e.target.files?.[0])} />
      <input ref={imgRef} type="file" accept="image/*" multiple hidden onChange={(e) => addImages(e.target.files)} />

      <section className="rounded-3xl border bg-card p-6 shadow-soft">
        <h2 className="mb-4 font-semibold">1. Video</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="gold" className="rounded-xl" onClick={() => fileRef.current?.click()}><Upload /> Upload video</Button>
          <Button variant="outline" className="rounded-xl" onClick={() => camRef.current?.click()}><Camera /> Record with camera</Button>
          <Button variant="outline" className="rounded-xl" disabled={!!busy} onClick={() => imgRef.current?.click()}><ImagePlus /> Add images</Button>
        </div>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
          <label className="flex items-center gap-3 text-sm"><Switch aria-label="Auto-split new spreads" checked={autoSplit} onCheckedChange={setAutoSplit} /> Auto-split new spreads</label>
          <label className="flex items-center gap-3 text-sm"><Switch aria-label="Remove fingers on all pages" checked={removeFingers} onCheckedChange={(value) => { setRemoveFingers(value); setPages((ps) => ps.map((p) => ({ ...p, edits: { ...p.edits, removeFingers: value } }))); }} /> Remove fingers on all pages</label>
        </div>
        {videoUrl && (
          <div className="mt-5 grid gap-5 @md:grid-cols-2">
            <video ref={manualVid} src={videoUrl} controls playsInline className="w-full rounded-2xl bg-foreground/90" />
            <div className="space-y-3">
              <div className="rounded-2xl bg-pale/60 p-4"><p className="flex items-center gap-2 font-semibold"><Wand2 className="h-4 w-4 text-primary" /> Automatic</p><p className="mb-3 text-sm text-muted-foreground">Detects each page, keeps the sharpest frame, removes duplicates.</p><Button variant="gold" disabled={!!busy} onClick={runAuto} className="rounded-xl">Extract pages</Button></div>
              <div className="rounded-2xl border p-4"><p className="flex items-center gap-2 font-semibold"><Hand className="h-4 w-4 text-primary" /> Manual</p><p className="mb-3 text-sm text-muted-foreground">Pause the video on a page and capture it.</p><Button variant="outline" disabled={!!busy} onClick={captureManual} className="rounded-xl"><Video /> Capture this frame</Button></div>
            </div>
          </div>
        )}
        {busy && (
          <div className="mt-5 space-y-2"><div className="flex justify-between text-sm"><span>{busy.label}</span><button onClick={() => abort.current?.abort()} className="flex items-center gap-1 text-destructive"><X className="h-4 w-4" /> Cancel</button></div><Progress value={busy.f * 100} /></div>
        )}
        {warnings.length > 0 && <ul className="mt-4 list-disc rounded-2xl bg-pale/60 p-4 pl-8 text-sm">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
      </section>

      {pages.length > 0 && (
        <section className="rounded-3xl border bg-card p-6 shadow-soft">
          <h2 className="mb-4 font-semibold">2. Pages ({pages.filter((p) => p.selected).reduce((n, p) => n + (p.edits.split ? 2 : 1), 0)} selected)</h2>
          <div className="grid grid-cols-2 gap-4 @sm:grid-cols-3 @lg:grid-cols-5">
            {pages.map((p, i) => (
              <div key={p.id} className={`rounded-2xl border p-2 transition ${p.selected ? "border-primary bg-pale/40" : "opacity-50"}`}>
                <Button variant="ghost" aria-label={`Edit capture ${i + 1}`} onClick={() => setEditing(p)} className="h-auto w-full overflow-hidden rounded-xl bg-muted p-0"><PagePreview page={p} /></Button>
                {p.edits.split && <p className="mt-1 text-center text-xs text-muted-foreground">Left page · Right page</p>}
                <div className="mt-2 flex items-center justify-between text-xs"><label className="flex items-center gap-1"><input type="checkbox" checked={p.selected} onChange={() => update(p.id, (x) => ({ ...x, selected: !x.selected }))} /> {i + 1}</label>
                  <div className="flex">
                    <button aria-label="Up" onClick={() => move(i, -1)} className="p-1"><ArrowUp className="h-3.5 w-3.5" /></button>
                    <button aria-label="Down" onClick={() => move(i, 1)} className="p-1"><ArrowDown className="h-3.5 w-3.5" /></button>
                    <button aria-label="Rotate" onClick={() => update(p.id, (x) => ({ ...x, edits: { ...x.edits, rotation: ((x.edits.rotation + 90) % 360) as PageEdits["rotation"] } }))} className="p-1"><RotateCw className="h-3.5 w-3.5" /></button>
                    <button aria-label="Delete" onClick={() => setPages((ps) => ps.filter((x) => x.id !== p.id))} className="p-1 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {editing && <Editor page={editing} onClose={() => setEditing(null)} onSave={(e) => { update(editing.id, (x) => ({ ...x, edits: e })); setEditing(null); }} />}
      {selectedPages.length > 0 && <Exporter pages={selectedPages} />}
    </div>
  );
}

const PagePreview = memo(function PagePreview({ page }: { page: Page }) {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!container.current) return;
    if (!("IntersectionObserver" in window)) { setVisible(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: "160px" });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const { urls, error } = usePagePreview(page.blob, page.edits, 400, visible);
  return <div ref={container} className="flex aspect-[3/4] w-full items-center justify-center gap-1 overflow-hidden">{error ? <span role="alert" className="p-2 text-xs text-destructive">{error}</span> : urls.length ? urls.map((url, i) => <img key={url} src={url} alt={page.edits.split ? (i === 0 ? "Left page" : "Right page") : "Processed page"} className={`${page.edits.split ? "w-[calc(50%-2px)]" : "w-full"} max-h-full object-contain`} />) : <Loader2 className="animate-spin" />}</div>;
}, (previous, next) => previous.page.blob === next.page.blob && previewKey(previous.page.edits, 400) === previewKey(next.page.edits, 400));

function Editor({ page, onClose, onSave }: { page: Page; onClose: () => void; onSave: (e: PageEdits) => void }) {
  const [e, setE] = useState<PageEdits>(page.edits);
  const { urls: previews, error: previewError } = usePagePreview(page.blob, e, 1000, true, 120);
  const imageArea = useRef<HTMLDivElement>(null);
  const setCrop = (k: keyof PageEdits["crop"], v: number) => setE({ ...e, crop: { ...e.crop, [k]: v } });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Edit page" className="grid max-h-[90vh] w-full max-w-4xl gap-5 overflow-auto rounded-3xl bg-card p-6 md:grid-cols-2" onClick={(ev) => ev.stopPropagation()}>
        <div className="flex items-center justify-center rounded-2xl bg-muted p-2">
          {previewError ? <p role="alert">{previewError}</p> : previews.length ? <div ref={imageArea} className="relative flex w-full items-center justify-center overflow-hidden">
            {previews.map((url, i) => <img key={url} src={url} alt={e.split ? (i === 0 ? "Left page preview" : "Right page preview") : "Page preview"} className="max-h-[65vh] min-w-0 object-contain" style={e.split ? { width: `${(i === 0 ? e.gutter : 1 - e.gutter) * 100}%` } : { width: "100%" }} />)}
            {e.split && <div role="slider" aria-label="Gutter adjustment" aria-valuemin={20} aria-valuemax={80} aria-valuenow={Math.round(e.gutter * 100)} tabIndex={0} className="absolute inset-y-0 w-6 -translate-x-1/2 touch-none cursor-col-resize border-x-2 border-primary bg-primary/20 focus-visible:outline-2 focus-visible:outline-ring" style={{ left: `${e.gutter * 100}%` }} onKeyDown={(event) => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); setE((current) => ({ ...current, gutter: Math.max(0.2, Math.min(0.8, current.gutter + (event.key === "ArrowLeft" ? -0.005 : 0.005))) })); } }} onPointerDown={(event) => event.currentTarget.setPointerCapture(event.pointerId)} onPointerMove={(event) => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) return; const rect = imageArea.current?.getBoundingClientRect(); if (rect) setE((current) => ({ ...current, gutter: Math.max(0.2, Math.min(0.8, (event.clientX - rect.left) / rect.width)) })); }} />}
          </div> : <Loader2 className="animate-spin" />}
        </div>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Edit page</h3>
          <div className="grid grid-cols-3 gap-2">{(["original", "clean", "bw"] as ImageMode[]).map((m) => <Button key={m} variant={e.mode === m ? "gold" : "outline"} size="sm" onClick={() => setE({ ...e, mode: m })}>{m === "original" ? "Original" : m === "clean" ? "Clean Scan" : "B&W"}</Button>)}</div>
          <label className="flex items-center justify-between gap-3 text-sm">Split two-page spread<Switch aria-label="Split two-page spread" checked={e.split} onCheckedChange={(split) => setE({ ...e, split })} /></label>
          {e.split && <div className="space-y-2"><Label>Gutter: {Math.round(e.gutter * 100)}%</Label><Slider aria-label="Gutter position" value={[e.gutter * 100]} min={20} max={80} step={0.5} onValueChange={([v]) => setE({ ...e, gutter: v / 100 })} /><div className="flex justify-between text-xs text-muted-foreground"><span>1 · Left page</span><span>2 · Right page</span></div></div>}
          <Button variant="outline" size="sm" onClick={async () => { try { const spread = await detectSpread(page.blob, e); setE({ ...e, split: spread.enabled, gutter: spread.gutter }); if (!spread.enabled) toast.info("No clear spread detected; manual splitting is available."); } catch (error) { toast.error((error as Error).message); } }}><Wand2 /> Detect spread</Button>
          <label className="flex items-center justify-between gap-3 text-sm">Remove margin fingers<Switch aria-label="Remove margin fingers" checked={e.removeFingers} onCheckedChange={(removeFingers) => setE({ ...e, removeFingers })} /></label>
          <Button variant="outline" size="sm" onClick={async () => setE({ ...e, crop: await detectCrop(page.blob) })}><CropIcon /> Auto-detect page edges</Button>
          {(["top", "bottom", "left", "right"] as const).map((k) => (
            <div key={k}><Label className="capitalize">Crop {k}</Label><Slider value={[e.crop[k] * 100]} max={45} step={0.5} onValueChange={([v]) => setCrop(k, v / 100)} /></div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setE({ ...e, rotation: ((e.rotation + 90) % 360) as PageEdits["rotation"] })}><RotateCw /> Rotate</Button>
          <div className="flex gap-2 pt-2"><Button variant="gold" onClick={() => onSave(e)}>Apply</Button><Button variant="ghost" onClick={onClose}>Cancel</Button></div>
        </div>
      </div>
    </div>
  );
}

function Exporter({ pages }: { pages: Page[] }) {
  const ocr = useServerFn(ocrPage);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [opts, setOpts] = useState<PdfOptions>({ title: "My Book", pageSize: "a4", orientation: "auto", marginMm: 8, pageNumbers: true });
  const [searchable, setSearchable] = useState(false);
  const [busy, setBusy] = useState<{ f: number; label: string } | null>(null);
  const [pdf, setPdf] = useState<{ bytes: Uint8Array; url: string; texts: string[]; failed: number[] } | null>(null);
  const abort = useRef<AbortController | null>(null);
  const inputKey = JSON.stringify([pages.map((page) => [page.id, previewKey(page.edits, 2400)]), opts, searchable]);

  useEffect(() => { abort.current?.abort(); setPdf(null); }, [inputKey]);
  useEffect(() => () => { if (pdf) URL.revokeObjectURL(pdf.url); }, [pdf]);
  useEffect(() => () => abort.current?.abort(), []);

  async function generate() {
    if (busy) return;
    abort.current = new AbortController();
    const sig = abort.current.signal;
    try {
      const rendered: { jpeg: Uint8Array; width: number; height: number; text?: string }[] = [];
      for (let i = 0; i < pages.length; i++) {
        if (sig.aborted) throw new DOMException("Cancelled", "AbortError");
        setBusy({ f: i / pages.length * (searchable ? 0.4 : 0.7), label: `Processing page ${i + 1}/${pages.length}` });
        const output = await renderOutputPages(pages[i].blob, pages[i].edits);
        for (const c of output) rendered.push({ jpeg: new Uint8Array(await (await canvasToBlob(c)).arrayBuffer()), width: c.width, height: c.height });
      }
      let failed: number[] = [];
      if (searchable) {
        setBusy({ f: 0.4, label: `Reading text: 0/${rendered.length} pages` });
        const result = await readPages(rendered, async (page) => {
          if (sig.aborted) throw new DOMException("Cancelled", "AbortError");
          const small = document.createElement("canvas");
          const bitmap = await createImageBitmap(new Blob([page.jpeg as BlobPart], { type: "image/jpeg" }));
          const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
          small.width = Math.round(bitmap.width * scale); small.height = Math.round(bitmap.height * scale);
          const ctx = small.getContext("2d");
          try {
            if (!ctx) throw new Error("Image processing is unavailable.");
            ctx.drawImage(bitmap, 0, 0, small.width, small.height);
          } finally { bitmap.close(); }
          const dataUrl = small.toDataURL("image/jpeg", 0.85);
          const { text } = await ocr({ data: { image: dataUrl }, signal: sig });
          return text;
        }, (completed) => setBusy({ f: 0.4 + (completed / rendered.length) * 0.4, label: `Reading text: ${completed}/${rendered.length} pages` }), sig);
        result.texts.forEach((text, i) => { rendered[i].text = text; });
        failed = result.failed;
      }
      const bytes = await buildPdf(rendered, opts, (f) => setBusy({ f: 0.8 + f * 0.2, label: "Building PDF…" }), sig);
      if (sig.aborted) throw new DOMException("Cancelled", "AbortError");
      setPdf({ bytes, url: URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" })), texts: rendered.map((r) => r.text ?? ""), failed });
      if (failed.length) toast.warning(`Text recognition failed on ${failed.length} page(s). All page images are included.`);
    } catch (e) {
      if ((e as Error).name === "AbortError") toast.info("Cancelled"); else toast.error((e as Error).message);
    } finally { setBusy(null); }
  }
  async function save() {
    if (!pdf) return;
    setBusy({ f: 0.3, label: "Saving to your library…" });
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setBusy(null); return toast.error("Please sign in to save your PDF."); }
    const path = `${u.user.id}/${crypto.randomUUID()}.pdf`;
    const up = await supabase.storage.from("pdfs").upload(path, new Blob([pdf.bytes as BlobPart], { type: "application/pdf" }), { contentType: "application/pdf" });
    if (up.error) { setBusy(null); return toast.error(up.error.message); }
    const { error } = await supabase.from("documents").insert({ title: opts.title, file_path: path, page_count: pdf.texts.length, file_size: pdf.bytes.byteLength, searchable, user_id: u.user.id });
    setBusy(null);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["documents"] });
    toast.success("Saved to My Library");
    navigate({ to: "/library" });
  }
  async function share() {
    if (!pdf) return;
    const file = new File([pdf.bytes as BlobPart], `${opts.title}.pdf`, { type: "application/pdf" });
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: opts.title }).catch(() => {});
    else toast.info("Sharing isn't supported in this browser — use Download.");
  }

  return (
    <section className="rounded-3xl border bg-card p-6 shadow-soft">
      <h2 className="mb-4 font-semibold">3. PDF</h2>
      <div className="grid gap-4 @sm:grid-cols-2 @lg:grid-cols-3">
        <div className="space-y-1.5"><Label>Title</Label><Input value={opts.title} onChange={(e) => setOpts({ ...opts, title: e.target.value })} className="rounded-xl" /></div>
        <div className="space-y-1.5"><Label>Page size</Label><select className="h-9 w-full rounded-xl border bg-card px-3 text-sm" value={opts.pageSize} onChange={(e) => setOpts({ ...opts, pageSize: e.target.value as PdfOptions["pageSize"] })}><option value="a4">A4</option><option value="original">Original</option></select></div>
        <div className="space-y-1.5"><Label>Orientation</Label><select className="h-9 w-full rounded-xl border bg-card px-3 text-sm" value={opts.orientation} onChange={(e) => setOpts({ ...opts, orientation: e.target.value as PdfOptions["orientation"] })}><option value="auto">Match page</option><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></div>
        <div className="space-y-1.5"><Label>Margins: {opts.marginMm} mm</Label><Slider value={[opts.marginMm]} max={30} step={1} onValueChange={([v]) => setOpts({ ...opts, marginMm: v })} /></div>
        <label className="flex items-center gap-3"><Switch checked={opts.pageNumbers} onCheckedChange={(v) => setOpts({ ...opts, pageNumbers: v })} /> Page numbers</label>
        <label className="flex items-center gap-3"><Switch checked={searchable} onCheckedChange={setSearchable} /> Searchable PDF (OCR English + Hindi)</label>
      </div>
      <div className="mt-5 flex flex-wrap gap-3"><Button variant="gold" className="rounded-xl" disabled={!!busy} onClick={generate}>Generate PDF</Button></div>
      {busy && <div className="mt-4 space-y-2"><div className="flex justify-between text-sm"><span>{busy.label}</span><button onClick={() => abort.current?.abort()} className="text-destructive">Cancel</button></div><Progress value={busy.f * 100} /></div>}
      {pdf && (
        <div className="mt-6 space-y-4">
          {pdf.failed.length > 0 && <p role="status" className="rounded-xl bg-pale p-3 text-sm">Text unavailable on pages {pdf.failed.join(", ")}. Their images are included. Generate again to retry text recognition.</p>}
          <iframe title="PDF preview" src={pdf.url} className="h-[60vh] w-full rounded-2xl border" />
          <div className="flex flex-wrap gap-3">
            <Button variant="gold" className="rounded-xl" onClick={save} disabled={!!busy}><Save /> Save to library</Button>
            <Button variant="outline" className="rounded-xl" asChild><a href={pdf.url} download={`${opts.title}.pdf`}><Download /> Download</a></Button>
            <Button variant="outline" className="rounded-xl" onClick={share}><Share2 /> Share</Button>
          </div>
          {pdf.texts.some(Boolean) && (
            <details className="rounded-2xl bg-pale/50 p-4"><summary className="cursor-pointer font-medium">Extracted text</summary>
              {pdf.texts.map((t, i) => <div key={i} className="mt-3"><div className="flex justify-between text-xs font-semibold">Page {i + 1}<button onClick={() => navigator.clipboard.writeText(t).then(() => toast.success("Copied"))} className="text-primary">Copy</button></div><pre className="whitespace-pre-wrap font-sans text-sm">{t}</pre></div>)}
            </details>
          )}
        </div>
      )}
    </section>
  );
}
