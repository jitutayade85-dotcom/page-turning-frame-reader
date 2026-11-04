import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Upload, ScanLine, FileText, Layers, Clock, ChevronRight, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { documentsQuery, profileQuery, formatBytes } from "@/lib/documents";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — BookScan AI" }, { name: "description", content: "Your BookScan AI dashboard." }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: docs = [], isLoading } = useQuery(documentsQuery);
  const { data: me } = useQuery(profileQuery);
  const name = me?.profile?.display_name || me?.user.email?.split("@")[0] || "Reader";
  const totalPages = docs.reduce((s, d) => s + d.page_count, 0);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-gold p-7 shadow-gold sm:p-10">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-lemon/40 blur-2xl" />
        <p className="text-sm font-medium text-primary-foreground/80">Welcome back,</p>
        <h1 className="mt-1 text-3xl font-bold text-primary-foreground sm:text-4xl">{name} 👋</h1>
        <p className="mt-2 max-w-md text-primary-foreground/90">Ready to digitize another book?</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button size="lg" variant="secondary" className="h-11 rounded-xl" asChild><Link to="/scan" search={{ start: "upload" }}><Upload /> Upload Video</Link></Button>
          <Button size="lg" variant="outline" className="h-11 rounded-xl border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" asChild><Link to="/scan" search={{ start: "record" }}><ScanLine /> Scan Book</Link></Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat icon={FileText} label="PDFs created" value={docs.length} />
        <Stat icon={Layers} label="Pages scanned" value={totalPages} />
        <Stat icon={Clock} label="Last scan" value={docs[0] ? new Date(docs[0].created_at).toLocaleDateString() : "—"} />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-3xl border bg-card p-6 shadow-soft lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent PDFs & history</h2>
            <Link to="/library" className="flex items-center text-sm font-medium text-primary">View all <ChevronRight className="h-4 w-4" /></Link>
          </div>
          {isLoading ? (
            <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
          ) : docs.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed bg-pale/40 p-8 text-center">
              <FileText className="mx-auto h-8 w-8 text-primary" />
              <p className="mt-2 font-medium">No PDFs yet</p>
              <p className="text-sm text-muted-foreground">Your scanned books will appear here.</p>
            </div>
          ) : (
            <ul className="mt-4 divide-y">
              {docs.slice(0, 6).map((d) => (
                <li key={d.id} className="flex items-center gap-4 py-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pale text-primary"><FileText className="h-5 w-5" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{d.title}</p>
                    <p className="text-xs text-muted-foreground">{d.page_count} pages · {formatBytes(d.file_size)} · {new Date(d.created_at).toLocaleString()}</p>
                  </div>
                  <span className="hidden rounded-full bg-pale px-2.5 py-1 text-xs font-medium sm:inline">{d.searchable ? "Searchable" : "Image PDF"}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="space-y-4">
          <Link to="/settings" className="flex items-center gap-4 rounded-3xl border bg-card p-5 shadow-soft transition hover:-translate-y-0.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-gold text-lg font-bold text-primary-foreground">{name[0]?.toUpperCase()}</div>
            <div className="min-w-0 flex-1"><p className="truncate font-semibold">{name}</p><p className="truncate text-xs text-muted-foreground">{me?.user.email ?? me?.user.phone}</p></div>
            <User className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link to="/settings" className="flex items-center gap-3 rounded-3xl border bg-card p-5 shadow-soft transition hover:-translate-y-0.5">
            <Settings className="h-5 w-5 text-primary" /><span className="flex-1 font-medium">Settings</span><ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <div className="rounded-3xl border bg-pale/60 p-5 text-sm">
            <p className="font-semibold">Tip for best results</p>
            <p className="mt-1 text-muted-foreground">Film in good light, hold each page still for about 1 second, then turn it.</p>
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: string | number }) {
  return (
    <div className="rounded-3xl border bg-card p-5 shadow-soft">
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-3 font-display text-3xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
