// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, Wand2, Layers, ScanText, FileDown, ShieldCheck, Smartphone, Upload, Sparkles, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { useAuthUser } from "@/hooks/use-auth";
import hero from "@/assets/hero-book.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BookScan AI — Your Books, Digitized in Seconds" },
      { name: "description", content: "Upload a video of your book and let AI turn every page into a clean, organized, searchable PDF." },
      { property: "og:title", content: "BookScan AI — Your Books, Digitized in Seconds" },
      { property: "og:description", content: "Upload a book video. Get a clean, ordered PDF with English & Hindi OCR." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Wand2, title: "Smart page detection", text: "Frame-by-frame analysis finds each new page and keeps only the sharpest shot." },
  { icon: Layers, title: "Duplicate & blur removal", text: "Repeated and blurry frames are dropped automatically, page order preserved." },
  { icon: Sparkles, title: "Clean Scan modes", text: "Shadow reduction, contrast, sharpening and crisp black & white output." },
  { icon: ScanText, title: "English + Hindi OCR", text: "Extract and copy text, including mixed Hindi and English pages." },
  { icon: FileDown, title: "Professional PDFs", text: "A4 or original size, margins, orientation, page numbers and searchable text." },
  { icon: ShieldCheck, title: "Private by design", text: "Videos are processed on your device. Your library is visible only to you." },
];

const steps = [
  { icon: Upload, title: "Upload or record", text: "Film yourself flipping through the book, or upload an MP4/MOV." },
  { icon: Wand2, title: "AI extracts pages", text: "Automatic mode picks the best frame per page — or select frames manually." },
  { icon: FileText, title: "Polish & export", text: "Crop, rotate, reorder, enhance, then download your PDF." },
];

function Landing() {
  const { user } = useAuthUser();
  const [open, setOpen] = useState(false);
  const nav = [
    { href: "#home", label: "Home" },
    { href: "#features", label: "Features" },
    { href: "#how", label: "How It Works" },
  ];
  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
            {nav.map((n) => (
              <a key={n.href} href={n.href} className="text-muted-foreground transition-colors hover:text-foreground">{n.label}</a>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <Button variant="gold" asChild><Link to="/dashboard">Open dashboard</Link></Button>
            ) : (
              <>
                <Button variant="ghost" asChild><Link to="/auth" search={{ mode: "login" }}>Login</Link></Button>
                <Button variant="gold" asChild><Link to="/auth" search={{ mode: "signup" }}>Sign Up</Link></Button>
              </>
            )}
          </div>
          <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X /> : <Menu />}</button>
        </div>
        {open && (
          <div className="border-t bg-card px-4 py-4 md:hidden animate-in slide-in-from-top-2">
            <div className="flex flex-col gap-3">
              {nav.map((n) => <a key={n.href} href={n.href} onClick={() => setOpen(false)} className="font-medium">{n.label}</a>)}
              {user ? (
                <Button variant="gold" asChild><Link to="/dashboard">Open dashboard</Link></Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" asChild><Link to="/auth" search={{ mode: "login" }}>Login</Link></Button>
                  <Button variant="gold" className="flex-1" asChild><Link to="/auth" search={{ mode: "signup" }}>Sign Up</Link></Button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <section id="home" className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-20 pt-14 md:grid-cols-2 md:pt-20">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-card/80 px-3 py-1 text-xs font-semibold text-primary shadow-soft">
            <Sparkles className="h-3.5 w-3.5" /> Scan Smart. Read Anywhere.
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">
            Your Books, <span className="bg-gradient-gold bg-clip-text text-transparent">Digitized</span> in Seconds.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted-foreground">
            Upload a video of your book and let AI turn every page into a clean, organized PDF.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="gold" size="lg" className="h-12 rounded-xl px-7 text-base" asChild>
              <Link to={user ? "/scan" : "/auth"} search={user ? undefined : { mode: "signup" }}>Start Scanning</Link>
            </Button>
            <Button variant="outline" size="lg" className="h-12 rounded-xl bg-card px-7 text-base" asChild>
              <a href="#features">Explore Features</a>
            </Button>
          </div>
          <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" /> Free account</span>
            <span className="flex items-center gap-1.5"><Smartphone className="h-4 w-4 text-primary" /> Works on mobile</span>
          </div>
        </div>
        <div className="relative">
          <div className="absolute inset-6 rounded-[2rem] bg-gradient-gold opacity-30 blur-3xl" />
          <img src={hero} alt="A book's pages transforming into digital PDF documents" width={1280} height={1024} className="relative animate-float rounded-[2rem] border border-border/60 shadow-gold" />
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Everything you need to digitize a book</h2>
          <p className="mt-3 text-muted-foreground">Built for students, researchers and readers who want their books everywhere.</p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="group rounded-2xl border bg-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-gold">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pale text-primary transition-colors group-hover:bg-gradient-gold group-hover:text-primary-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center text-3xl font-bold sm:text-4xl">How it works</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className="relative rounded-2xl border bg-card p-7 shadow-soft">
              <span className="absolute -top-4 left-6 rounded-full bg-gradient-gold px-3 py-1 text-xs font-bold text-primary-foreground shadow-gold">Step {i + 1}</span>
              <s.icon className="h-7 w-7 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-16 rounded-3xl bg-gradient-gold p-10 text-center shadow-gold">
          <h3 className="text-2xl font-bold text-primary-foreground sm:text-3xl">Turn Every Page Into a Digital Book.</h3>
          <Button size="lg" variant="secondary" className="mt-6 h-12 rounded-xl px-8" asChild>
            <Link to={user ? "/scan" : "/auth"} search={user ? undefined : { mode: "signup" }}>Start Scanning — it's free</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t bg-card/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} BookScan AI · Scan Smart. Read Anywhere.</span>
          <div className="flex gap-5">
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
          </div>
        </div>
        <p className="pb-6 text-center text-xs text-muted-foreground">Only scan books you own or have rights to. BookScan AI does not bypass DRM.</p>
      </footer>
    </div>
  );
}
