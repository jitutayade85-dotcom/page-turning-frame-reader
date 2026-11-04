import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
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
import { defaultEdits, detectCrop, renderPage, canvasToBlob, type PageEdits, type ImageMode } from "@/lib/image";
import { buildPdf, type PdfOptions } from "@/lib/pdf";
import { ocrPage } from "@/lib/account.functions";

export const Route = createFileRoute("/_authenticated/scan")({
  validateSearch: (s: Record<string, unknown>): { start?: "upload" | "record" } => ({
    start: s.start === "upload" || s.start === "record" ? s.start : undefined,
  }),
  head: () => ({ meta: [{ title: "Scan a book — BookScan AI" }, { name: "description", content: "Turn a book video into a PDF." }] }),
  component: ScanPage,
});

type Page = { id: string; blob: Blob; url: string; edits: PageEdits; selected: boolean; text?: string };
const uid = () => Math.random().toString(36).slice(2);

function ScanPage() {
  const { start } = Route.useSearch();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [busy, setBusy] = useState<{ f: number; label: string } | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [editing, setEditing] = useState<Page | null>(null);
  const abort = useRef<AbortController | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const manualVid = useRef<HTMLVideoElement>(null);

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
  const addBlob = (blob: Blob) => ({ id: uid(), blob, url: URL.createObjectURL(blob), edits: defaultEdits(), selected: true });

  async function runAuto() {
    if (!videoUrl) return;
    abort.current = new AbortController();
    setBusy({ f: 0, label: "Starting…" });
    try {
      const { frames, warnings } = await autoExtract(videoUrl, (f, label) => setBusy({ f, label }), abort.current.signal);
      setPages((p) => [...p, ...frames.map((fr) => addBlob(fr.blob))]);
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
    const tmp = await loadVideo(videoUrl);
    const fr = await captureFrame(tmp, v.currentTime);
    setPages((p) => [...p, addBlob(fr.blob)]);
    toast.success(`Captured frame at ${v.currentTime.toFixed(1)}s`);
  }
  function addImages(files: FileList | null) {
    if (!files) return;
    const ok = [...files].filter((f) => f.type.startsWith("image/") && f.size < 30e6);
    setPages((p) => [...p, ...ok.map(addBlob)]);
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
          <Button variant="outline" className="rounded-xl" onClick={() => imgRef.current?.click()}><ImagePlus /> Add images</Button>
        </div>
        {videoUrl && (
          <div className="mt-5 grid gap-5 md:grid-cols-2">
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
          <h2 className="mb-4 font-semibold">2. Pages ({pages.filter((p) => p.selected).length} selected)</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {pages.map((p, i) => (
              <div key={p.id} className={`rounded-2xl border p-2 transition ${p.selected ? "border-primary bg-pale/40" : "opacity-50"}`}>
                <button onClick={() => setEditing(p)} className="block w-full overflow-hidden rounded-xl bg-muted"><img src={p.url} alt={`Page ${i + 1}`} className="aspect-[3/4] w-full object-cover" style={{ transform: `rotate(${p.edits.rotation}deg)` }} /></button>
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
      {pages.some((p) => p.selected) && <Exporter pages={pages.filter((p) => p.selected)} />}
    </div>
  );
}

function Editor({ page, onClose, onSave }: { page: Page; onClose: () => void; onSave: (e: PageEdits) => void }) {
  const [e, setE] = useState<PageEdits>(page.edits);
  const [prev, setPrev] = useState<string>("");
  useEffect(() => {
    let url = ""; let live = true;
    renderPage(page.blob, e, 1000).then((c) => canvasToBlob(c)).then((b) => { if (!live) return; url = URL.createObjectURL(b); setPrev(url); });
    return () => { live = false; if (url) URL.revokeObjectURL(url); };
  }, [page.blob, e]);
  const setCrop = (k: keyof PageEdits["crop"], v: number) => setE({ ...e, crop: { ...e.crop, [k]: v } });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4" onClick={onClose}>
      <div className="grid max-h-[90vh] w-full max-w-4xl gap-5 overflow-auto rounded-3xl bg-card p-6 md:grid-cols-2" onClick={(ev) => ev.stopPropagation()}>
        <div className="flex items-center justify-center rounded-2xl bg-muted p-2">{prev ? <img src={prev} alt="Preview" className="max-h-[65vh] object-contain" /> : <Loader2 className="animate-spin" />}</div>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Edit page</h3>
          <div className="grid grid-cols-3 gap-2">{(["original", "clean", "bw"] as ImageMode[]).map((m) => <Button key={m} variant={e.mode === m ? "gold" : "outline"} size="sm" onClick={() => setE({ ...e, mode: m })}>{m === "original" ? "Original" : m === "clean" ? "Clean Scan" : "B&W"}</Button>)}</div>
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
  const [pdf, setPdf] = useState<{ bytes: Uint8Array; url: string; texts: string[] } | null>(null);
  const abort = useRef<AbortController | null>(null);

  async function generate() {
    abort.current = new AbortController();
    const sig = abort.current.signal;
    try {
      const rendered: { jpeg: Uint8Array; width: number; height: number; text?: string }[] = [];
      for (let i = 0; i < pages.length; i++) {
        if (sig.aborted) throw new DOMException("Cancelled", "AbortError");
        setBusy({ f: i / pages.length * (searchable ? 0.4 : 0.7), label: `Processing page ${i + 1}/${pages.length}` });
        const c = await renderPage(pages[i].blob, pages[i].edits);
        rendered.push({ jpeg: new Uint8Array(await (await canvasToBlob(c)).arrayBuffer()), width: c.width, height: c.height });
      }
      if (searchable) {
        for (let i = 0; i < rendered.length; i++) {
          if (sig.aborted) throw new DOMException("Cancelled", "AbortError");
          setBusy({ f: 0.4 + (i / rendered.length) * 0.4, label: `Reading text on page ${i + 1}/${rendered.length}` });
          const small = await renderPage(pages[i].blob, pages[i].edits, 1600);
          const dataUrl = small.toDataURL("image/jpeg", 0.85);
          const { text } = await ocr({ data: { image: dataUrl } });
          rendered[i].text = text;
        }
      }
      const bytes = await buildPdf(rendered, opts, (f) => setBusy({ f: 0.8 + f * 0.2, label: "Building PDF…" }), sig);
      if (pdf) URL.revokeObjectURL(pdf.url);
      setPdf({ bytes, url: URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" })), texts: rendered.map((r) => r.text ?? "") });
    } catch (e) {
      if ((e as Error).name === "AbortError") toast.info("Cancelled"); else toast.error((e as Error).message);
    } finally { setBusy(null); }
  }
  async function save() {
    if (!pdf) return;
    setBusy({ f: 0.3, label: "Saving to your library…" });
    const { data: u } = await supabase.auth.getUser();
    const path = `${u.user!.id}/${crypto.randomUUID()}.pdf`;
    const up = await supabase.storage.from("pdfs").upload(path, new Blob([pdf.bytes as BlobPart], { type: "application/pdf" }), { contentType: "application/pdf" });
    if (up.error) { setBusy(null); return toast.error(up.error.message); }
    const { error } = await supabase.from("documents").insert({ title: opts.title, file_path: path, page_count: pages.length, file_size: pdf.bytes.byteLength, searchable, user_id: u.user!.id });
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
