// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FileText, Search, Download, Trash2, Pencil, Eye, Share2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { documentsQuery, formatBytes, signedUrl } from "@/lib/documents";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({ meta: [{ title: "My Library — BookScan AI" }, { name: "description", content: "All your scanned PDFs." }, { property: "og:title", content: "My Library — BookScan AI" }, { property: "og:description", content: "Manage your private library of scanned book PDFs." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: LibraryPage,
});

type Doc = NonNullable<Awaited<ReturnType<typeof documentsQuery.queryFn>>>[number];

function LibraryPage() {
  const qc = useQueryClient();
  const { data: docs = [], isLoading } = useQuery(documentsQuery);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"new" | "old">("new");
  const [preview, setPreview] = useState<{ doc: Doc; url: string } | null>(null);
  const [rename, setRename] = useState<{ doc: Doc; title: string } | null>(null);
  const [del, setDel] = useState<Doc | null>(null);

  const list = useMemo(() => {
    const f = docs.filter((d) => d.title.toLowerCase().includes(q.toLowerCase()));
    return sort === "new" ? f : [...f].reverse();
  }, [docs, q, sort]);

  async function open(doc: Doc) {
    try { setPreview({ doc, url: await signedUrl(doc.file_path) }); } catch (e) { toast.error((e as Error).message); }
  }
  async function download(doc: Doc) {
    try { window.location.href = await signedUrl(doc.file_path, `${doc.title}.pdf`); } catch (e) { toast.error((e as Error).message); }
  }
  async function share(doc: Doc) {
    try {
      const res = await fetch(await signedUrl(doc.file_path));
      const file = new File([await res.blob()], `${doc.title}.pdf`, { type: "application/pdf" });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: doc.title });
      else toast.info("Sharing isn't supported in this browser — use Download instead.");
    } catch (e) { if ((e as Error).name !== "AbortError") toast.error((e as Error).message); }
  }
  async function doRename() {
    if (!rename) return;
    const { error } = await supabase.from("documents").update({ title: rename.title.trim() || "Untitled" }).eq("id", rename.doc.id);
    if (error) return toast.error(error.message);
    setRename(null);
    qc.invalidateQueries({ queryKey: ["documents"] });
  }
  async function doDelete() {
    if (!del) return;
    await supabase.storage.from("pdfs").remove([del.file_path]);
    const { error } = await supabase.from("documents").delete().eq("id", del.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    setDel(null);
    qc.invalidateQueries({ queryKey: ["documents"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-3xl font-bold">My Library</h1><p className="text-muted-foreground">{docs.length} private documents</p></div>
        <Button variant="gold" className="rounded-xl" asChild><Link to="/scan"><Plus /> New scan</Link></Button>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search PDFs…" value={q} onChange={(e) => setQ(e.target.value)} className="h-11 rounded-xl bg-card pl-9" /></div>
        <select value={sort} onChange={(e) => setSort(e.target.value as "new" | "old")} className="h-11 rounded-xl border bg-card px-3 text-sm">
          <option value="new">Newest first</option><option value="old">Oldest first</option>
        </select>
      </div>
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : list.length === 0 ? (
        <div className="rounded-3xl border border-dashed bg-card p-12 text-center"><FileText className="mx-auto h-10 w-10 text-primary" /><p className="mt-3 font-medium">{q ? "No matches" : "Your library is empty"}</p></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((d) => (
            <div key={d.id} className="group rounded-3xl border bg-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-gold">
              <button onClick={() => open(d)} className="flex h-32 w-full items-center justify-center rounded-2xl bg-gradient-to-br from-pale to-cream"><FileText className="h-12 w-12 text-primary transition group-hover:scale-110" /></button>
              <p className="mt-4 truncate font-semibold">{d.title}</p>
              <p className="text-xs text-muted-foreground">{d.page_count} pages · {formatBytes(d.file_size)} · {new Date(d.created_at).toLocaleDateString()}</p>
              <div className="mt-4 flex gap-1">
                <IconBtn label="Preview" onClick={() => open(d)}><Eye /></IconBtn>
                <IconBtn label="Download" onClick={() => download(d)}><Download /></IconBtn>
                <IconBtn label="Share" onClick={() => share(d)}><Share2 /></IconBtn>
                <IconBtn label="Rename" onClick={() => setRename({ doc: d, title: d.title })}><Pencil /></IconBtn>
                <IconBtn label="Delete" onClick={() => setDel(d)}><Trash2 className="text-destructive" /></IconBtn>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-4xl"><DialogHeader><DialogTitle>{preview?.doc.title}</DialogTitle></DialogHeader>
          {preview && <iframe title="PDF preview" src={preview.url} className="h-[70vh] w-full rounded-xl border" />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!rename} onOpenChange={(o) => !o && setRename(null)}>
        <DialogContent><DialogHeader><DialogTitle>Rename PDF</DialogTitle></DialogHeader>
          <Input value={rename?.title ?? ""} onChange={(e) => rename && setRename({ ...rename, title: e.target.value })} className="h-11 rounded-xl" />
          <Button variant="gold" onClick={doRename}>Save</Button>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete "{del?.title}"?</AlertDialogTitle><AlertDialogDescription>This permanently removes the PDF from your library.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={doDelete} className="bg-destructive">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return <Button variant="ghost" size="icon" title={label} aria-label={label} onClick={onClick} className="rounded-xl">{children}</Button>;
}
