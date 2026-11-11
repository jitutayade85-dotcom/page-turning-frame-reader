import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Loader2, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authHeader } from "@/lib/book-chats";
import { cn } from "@/lib/utils";
import { chunkText } from "@/lib/book-text";
import { SpeechPlayer } from "@/lib/speech-player";

const SPEEDS = [1, 1.25, 1.5, 2];
const VOICES = [
  { id: "Kore", label: "Kore (female)" },
  { id: "Aoede", label: "Aoede (female)" },
  { id: "Puck", label: "Puck (male)" },
  { id: "Charon", label: "Charon (male)" },
];

export function AudioPlayer({ pages }: { pages: string[] }) {
  const [page, setPage] = useState(() =>
    Math.max(
      0,
      pages.findIndex((p) => p?.trim()),
    ),
  );
  const [speed, setSpeed] = useState(1);
  const [lang, setLang] = useState<"auto" | "en" | "hi">("auto");
  const [voice, setVoice] = useState("Kore");
  const [state, setState] = useState<"idle" | "loading" | "playing" | "paused">("idle");
  const audio = useRef<SpeechPlayer | null>(null);
  const abort = useRef<AbortController | null>(null);
  const paused = useRef(false);

  useEffect(
    () => () => {
      abort.current?.abort();
      void audio.current?.close();
    },
    [],
  );
  useEffect(() => {
    audio.current?.setSpeed(speed);
  }, [speed]);
  // Changing voice or language stops playback so the next play uses the new choice.
  useEffect(() => {
    stop();
  }, [voice, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  function stop() {
    abort.current?.abort();
    audio.current?.stop();
    paused.current = false;
    setState("idle");
  }

  async function play(index = page) {
    const text = pages[index]?.trim();
    if (!text) {
      toast.info(`Page ${index + 1} has no recognised text.`);
      return;
    }
    if (state === "paused" && index === page && audio.current) {
      paused.current = false;
      await audio.current.resume();
      setState("playing");
      return;
    }
    abort.current?.abort();
    const player = audio.current ?? (audio.current = new SpeechPlayer());
    player.stop();
    player.setSpeed(speed);
    const controller = new AbortController();
    abort.current = controller;
    paused.current = false;
    setState("loading");
    setPage(index);
    try {
      await player.resume();
      const headers = await authHeader();
      for (let i = index; i < pages.length; i++) {
        controller.signal.throwIfAborted();
        if (!pages[i]?.trim()) continue;
        setPage(i);
        for (const chunk of chunkText(pages[i] ?? "")) {
          await player.play(chunk, voice, lang, headers, controller.signal, () => {
            if (!paused.current) setState("playing");
          });
        }
      }
      if (abort.current === controller) setState("idle");
    } catch (error) {
      if (abort.current === controller) {
        setState("idle");
        if ((error as Error).name !== "AbortError") toast.error((error as Error).message);
      }
    }
  }

  function toggle() {
    if (state === "playing") {
      paused.current = true;
      void audio.current?.pause();
      setState("paused");
    } else if (state !== "loading") void play();
  }
  function go(delta: number) {
    const target = Math.min(pages.length - 1, Math.max(0, page + delta));
    const wasPlaying = state === "playing" || state === "loading";
    stop();
    setPage(target);
    if (wasPlaying) void play(target);
  }

  return (
    <div className="space-y-5 rounded-3xl border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Now reading</p>
          <p className="font-display text-lg font-bold">
            Page {page + 1} of {pages.length}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold",
            state === "playing" ? "bg-pale text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          {state === "loading"
            ? "Preparing audio…"
            : state === "playing"
              ? "Playing"
              : state === "paused"
                ? "Paused"
                : "Ready"}
        </span>
      </div>
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full"
          aria-label="Previous page"
          disabled={page === 0}
          onClick={() => go(-1)}
        >
          <ChevronLeft />
        </Button>
        <Button
          variant="gold"
          className="h-16 w-16 rounded-full"
          disabled={state === "loading"}
          aria-label={state === "playing" ? "Pause" : "Play"}
          onClick={toggle}
        >
          {state === "loading" ? (
            <Loader2 className="animate-spin" />
          ) : state === "playing" ? (
            <Pause className="h-7 w-7" />
          ) : (
            <Play className="h-7 w-7" />
          )}
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full"
          aria-label="Next page"
          disabled={page >= pages.length - 1}
          onClick={() => go(1)}
        >
          <ChevronRight />
        </Button>
      </div>
      {(state === "loading" || state === "playing" || state === "paused") && (
        <Button variant="outline" className="w-full rounded-xl" onClick={stop}>
          Stop
        </Button>
      )}
      <div>
        <p className="mb-2 text-xs font-semibold text-muted-foreground">Speed</p>
        <div className="grid grid-cols-4 gap-2" role="group" aria-label="Playback speed">
          {SPEEDS.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={speed === s ? "gold" : "outline"}
              className="rounded-xl"
              aria-pressed={speed === s}
              onClick={() => setSpeed(s)}
            >
              {s}x
            </Button>
          ))}
        </div>
      </div>
      <div className="grid gap-3 @sm:grid-cols-2">
        <label className="space-y-1.5 text-sm">
          <span className="text-xs font-semibold text-muted-foreground">Language</span>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as typeof lang)}
            className="h-10 w-full rounded-xl border bg-card px-3"
          >
            <option value="auto">Auto (as written)</option>
            <option value="en">English</option>
            <option value="hi">हिन्दी Hindi</option>
          </select>
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="text-xs font-semibold text-muted-foreground">Voice</span>
          <select
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            className="h-10 w-full rounded-xl border bg-card px-3"
          >
            {VOICES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="max-h-60 overflow-y-auto rounded-2xl bg-pale/50 p-4 text-sm leading-relaxed whitespace-pre-wrap">
        {pages[page]?.trim() || "No text on this page."}
      </div>
    </div>
  );
}
