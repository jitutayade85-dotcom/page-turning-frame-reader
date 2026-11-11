import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Download, Headphones, MessageCircle, Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AudioPlayer } from "@/components/AudioPlayer";
import { ExportButtons } from "@/components/ExportButtons";
import { PrepareBookText } from "@/components/PrepareBookText";
import { bookChatsQuery, bookQuery, createChat, QUICK_PROMPTS } from "@/lib/book-chats";
import { hasText } from "@/lib/book-export";
import { signedUrl } from "@/lib/documents";
import { cn } from "@/lib/utils";

type Tab = "chat" | "listen" | "text";

export const Route = createFileRoute("/_authenticated/book/$docId")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } => (s["tab"] === "listen" || s["tab"] === "text" ? { tab: s["tab"] } : {}),
  head: () => ({ meta: [{ title: "Book — BookScan AI" }, { name: "description", content: "Chat with, summarise, listen to and export your scanned book." }, { property: "og:title", content: "Book — BookScan AI" }, { property: "og:description", content: "Chat, summaries, audiobook mode and EPUB/Word export for your scanned book." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: BookPage,
});

function BookPage() {
  const { docId } = Route.useParams();
  const { tab = "chat" } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: doc, isLoading } = useQuery(bookQuery(docId));
  const { data: chats = [] } = useQuery(bookChatsQuery(docId));
  const [creating, setCreating] = useState(false);

  async function startChat(title?: string, prompt?: string) {
    setCreating(true);
    try {
      const id = await createChat(docId, title);
      qc.invalidateQueries({ queryKey: ["book-chats", docId] });
      navigate({ to: "/chat/$chatId", params: { chatId: id }, search: prompt ? { prompt } : {} });
    } catch (e) { toast.error((e as Error).message); setCreating(false); }
  }
  async function downloadPdf() {
    if (!doc) return;
    try { window.location.href = await signedUrl(doc.file_path, `${doc.title}.pdf`); } catch (e) { toast.error((e as Error).message); }
  }

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!doc) return <div className="rounded-3xl border bg-card p-8 text-center"><p className="font-medium">Book not found</p><Button asChild variant="gold" className="mt-4 rounded-xl"><Link to="/library">Back to library</Link></Button></div>;
  const pages = doc.page_texts ?? [];
  const textReady = hasText(pages);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link to="/library" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Library</Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0"><h1 className="truncate text-3xl font-bold">{doc.title}</h1><p className="text-sm text-muted-foreground">{doc.page_count} pages · {textReady ? "Text recognised" : "No text recognised"}</p></div>
           <div className="flex flex-wrap gap-2"><Button variant="outline" className="rounded-xl" onClick={downloadPdf}><Download /> PDF</Button><ExportButtons title={doc.title} pages={pages} onPrepare={() => document.getElementById("book-text-preparation")?.scrollIntoView({ behavior: "smooth" })} /></div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-pale/60 p-1" role="tablist">
        {([["chat", "Chat & summary", MessageCircle], ["listen", "Listen", Headphones], ["text", "Text", FileText]] as const).map(([id, label, Icon]) => (
          <Link key={id} to="/book/$docId" params={{ docId }} search={id === "chat" ? {} : { tab: id }} role="tab" aria-selected={tab === id} className={cn("flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition", tab === id ? "bg-card text-primary shadow-soft" : "text-muted-foreground")}><Icon className="h-4 w-4" /><span className="hidden @sm:inline">{label}</span><span className="@sm:hidden">{label.split(" ")[0]}</span></Link>
        ))}
      </div>

      {!textReady ? (
        <div id="book-text-preparation" className="space-y-4 rounded-3xl border border-dashed bg-card p-8 text-center"><FileText className="mx-auto h-10 w-10 text-primary" /><p className="font-medium">This book has no recognised text yet</p><p className="mx-auto max-w-md text-sm text-muted-foreground">Read text from your saved PDF without scanning again. Image-only pages use AI credits.</p><PrepareBookText docId={docId} filePath={doc.file_path} existing={pages} /></div>
      ) : tab === "listen" ? <AudioPlayer key={docId} pages={pages} /> : tab === "text" ? (
        <div className="space-y-4"><PrepareBookText docId={docId} filePath={doc.file_path} existing={pages} />{pages.map((t, i) => <div key={i} className="rounded-2xl border bg-card p-4"><p className="mb-2 text-xs font-semibold text-primary">Page {i + 1}</p><p className="whitespace-pre-wrap text-sm leading-relaxed">{t?.trim() || "No text on this page."}</p></div>)}</div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-3xl border bg-card p-5 shadow-soft">
            <p className="font-semibold">Quick insights</p>
            <p className="mb-3 text-sm text-muted-foreground">Each one opens as a new chat you can continue.</p>
            <div className="flex flex-wrap gap-2">{QUICK_PROMPTS.map((q) => <Button key={q.label} variant="outline" className="rounded-xl" disabled={creating} onClick={() => startChat(q.title, q.prompt)}>{q.label}</Button>)}</div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between"><p className="font-semibold">Your chats</p><Button variant="gold" className="rounded-xl" disabled={creating} onClick={() => startChat()}><Plus /> New chat</Button></div>
            {chats.length === 0 ? <p className="rounded-2xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">No chats yet. Ask anything about this book.</p> : (
              <ul className="space-y-2">{chats.map((c) => <li key={c.id}><Link to="/chat/$chatId" params={{ chatId: c.id }} className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-4 transition hover:shadow-soft"><span className="flex min-w-0 items-center gap-3"><MessageCircle className="h-4 w-4 shrink-0 text-primary" /><span className="truncate font-medium">{c.title}</span></span><span className="shrink-0 text-xs text-muted-foreground">{new Date(c.updated_at).toLocaleDateString()}</span></Link></li>)}</ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
