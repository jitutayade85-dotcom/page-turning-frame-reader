import { useState } from "react";
import { toast } from "sonner";
import { BookOpen, FileType } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportBook, hasText } from "@/lib/book-export";

export function ExportButtons({ title, pages, size = "default", onPrepare }: { title: string; pages: string[] | null | undefined; size?: "default" | "sm"; onPrepare?: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  async function run(format: "epub" | "docx") {
    if (!hasText(pages)) { if (onPrepare) onPrepare(); else toast.info("This book has no recognised text. Turn on Searchable PDF and generate it again to export EPUB or Word."); return; }
    setBusy(format);
    try { await exportBook(format, { title, pages: pages ?? [] }); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  }
  return (
    <>
      <Button variant="outline" size={size} className="rounded-xl" disabled={!!busy} onClick={() => run("epub")}><BookOpen /> {busy === "epub" ? "Preparing…" : "EPUB"}</Button>
      <Button variant="outline" size={size} className="rounded-xl" disabled={!!busy} onClick={() => run("docx")}><FileType /> {busy === "docx" ? "Preparing…" : "Word"}</Button>
    </>
  );
}
