import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Loader2, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authHeader } from "@/lib/book-chats";
import { cn } from "@/lib/utils";

const SPEEDS = [1, 1.25, 1.5, 2];
const VOICES = [{ id: "Kore", label: "Kore (female)" }, { id: "Aoede", label: "Aoede (female)" }, { id: "Puck", label: "Puck (male)" }, { id: "Charon", label: "Charon (male)" }];

export function AudioPlayer({ pages }: { pages: string[] }) {
  const [page, setPage] = useState(() => Math.max(0, pages.findIndex((p) => p?.trim())));
  const [speed, setSpeed] = useState(1);
  const [lang, setLang] = useState<"auto" | "en" | "hi">("auto");
  const [voice, setVoice] = useState("Kore");
  const [state, setState] = useState<"idle" | "loading" | "playing" | "paused">("idle");
  const audio = useRef<HTMLAudioElement | null>(null);
  const cache = useRef(new Map<string, string>());
  const abort = useRef<AbortController | null>(null);
  const autoNext = useRef(false);

  useEffect(() => () => { abort.current?.abort(); audio.current?.pause(); cache.current.forEach((u) => URL.revokeObjectURL(u)); }, []);
  useEffect(() => { if (audio.current) audio.current.playbackRate = speed; }, [speed]);
  // Changing voice or language stops playback so the next play uses the new choice.
  useEffect(() => { stop(); }, [voice, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  function stop() { abort.current?.abort(); audio.current?.pause(); autoNext.current = false; setState("idle"); }

  async function play(index = page) {
    const text = pages[index]?.trim();
    if (!text) { toast.info(`Page ${index + 1} has no recognised text.`); return; }
    if (state === "paused" && index === page && audio.current) { await audio.current.play(); setState("playing"); return; }
    abort.current?.abort();
    audio.current?.pause();
    const key = `${index}|${voice}|${lang}`;
    let url = cache.current.get(key);
    if (!url) {
      setState("loading");
      abort.current = new AbortController();
      try {
        const res = await fetch("/api/book-speech", { method: "POST", signal: abort.current.signal, headers: { "Content-Type": "application/json", ...(await authHeader()) }, body: JSON.stringify({ text, voice, language: lang === "auto" ? undefined : lang }) });
        if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || `Read-aloud failed (${res.status}).`); }
        url = URL.createObjectURL(await res.blob());
        cache.current.set(key, url);
      } catch (e) {
        if ((e as Error).name !== "AbortError") toast.error((e as Error).message);
        setState("idle"); return;
      }
    }
    const el = audio.current ?? (audio.current = new Audio());
    el.src = url;
    el.playbackRate = speed;
    el.onended = () => {
      const next = pages.findIndex((p, i) => i > index && p?.trim());
      if (autoNext.current && next >= 0) { setPage(next); void play(next); } else setState("idle");
    };
    autoNext.current = true;
    setPage(index);
    try { await el.play(); setState("playing"); } catch { setState("idle"); toast.error("Playback was blocked by the browser. Tap play again."); }
  }

  function toggle() {
    if (state === "playing") { audio.current?.pause(); setState("paused"); }
    else if (state !== "loading") void play();
  }
  function go(delta: number) {
    const target = Math.min(pages.length - 1, Math.max(0, page + delta));
    const wasPlaying = state === "playing" || state === "loading";
    stop(); setPage(target);
    if (wasPlaying) void play(target);
  }

  return (
    <div className="space-y-5 rounded-3xl border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-xs text-muted-foreground">Now reading</p><p className="font-display text-lg font-bold">Page {page + 1} of {pages.length}</p></div>
        <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", state === "playing" ? "bg-pale text-primary" : "bg-muted text-muted-foreground")}>{state === "loading" ? "Preparing audio…" : state === "playing" ? "Playing" : state === "paused" ? "Paused" : "Ready"}</span>
      </div>
      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" size="icon" className="h-12 w-12 rounded-full" aria-label="Previous page" disabled={page === 0} onClick={() => go(-1)}><ChevronLeft /></Button>
        <Button variant="gold" className="h-16 w-16 rounded-full" aria-label={state === "playing" ? "Pause" : "Play"} onClick={toggle}>{state === "loading" ? <Loader2 className="animate-spin" /> : state === "playing" ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7" />}</Button>
        <Button variant="outline" size="icon" className="h-12 w-12 rounded-full" aria-label="Next page" disabled={page >= pages.length - 1} onClick={() => go(1)}><ChevronRight /></Button>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold text-muted-foreground">Speed</p>
        <div className="grid grid-cols-4 gap-2" role="group" aria-label="Playback speed">
          {SPEEDS.map((s) => <Button key={s} size="sm" variant={speed === s ? "gold" : "outline"} className="rounded-xl" aria-pressed={speed === s} onClick={() => setSpeed(s)}>{s}x</Button>)}
        </div>
      </div>
      <div className="grid gap-3 @sm:grid-cols-2">
        <label className="space-y-1.5 text-sm"><span className="text-xs font-semibold text-muted-foreground">Language</span>
          <select value={lang} onChange={(e) => setLang(e.target.value as typeof lang)} className="h-10 w-full rounded-xl border bg-card px-3"><option value="auto">Auto (as written)</option><option value="en">English</option><option value="hi">हिन्दी Hindi</option></select></label>
        <label className="space-y-1.5 text-sm"><span className="text-xs font-semibold text-muted-foreground">Voice</span>
          <select value={voice} onChange={(e) => setVoice(e.target.value)} className="h-10 w-full rounded-xl border bg-card px-3">{VOICES.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}</select></label>
      </div>
      <div className="max-h-60 overflow-y-auto rounded-2xl bg-pale/50 p-4 text-sm leading-relaxed whitespace-pre-wrap">{pages[page]?.trim() || "No text on this page."}</div>
    </div>
  );
}
