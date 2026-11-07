import { useEffect, useState } from "react";

const DURATION = 600;

export function SplashScreen() {
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem("bookscan-splash") || sessionStorage.getItem("bookscan-splash")) return;
      localStorage.setItem("bookscan-splash", "1");
      sessionStorage.setItem("bookscan-splash", "1");
    } catch { /* Storage may be disabled; startup must still finish. */ }
    setShow(true);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setLeaving(true), reduced ? 0 : DURATION);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => setShow(false), 200);
    return () => clearTimeout(t);
  }, [leaving]);

  if (!show) return null;

  const particles = Array.from({ length: 6 }, (_, i) => i);

  return (
    <div
      role="button"
      aria-label="Skip intro"
      tabIndex={0}
      onClick={() => setLeaving(true)}
      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setLeaving(true); }}
      className={`fixed inset-0 z-[100] flex cursor-pointer flex-col items-center justify-center bg-background transition-opacity duration-200 ${leaving ? "pointer-events-none opacity-0" : "opacity-100"}`}
    >
      <div className="splash-enter relative w-[78vw] max-w-[360px]">
        <svg viewBox="0 0 320 200" className="w-full drop-shadow-[0_20px_30px_color-mix(in_oklab,var(--gold-deep)_35%,transparent)]">
          <defs>
            <linearGradient id="cover" x1="0" x2="1">
              <stop offset="0" stopColor="var(--gold-deep)" />
              <stop offset="0.5" stopColor="var(--gold)" />
              <stop offset="1" stopColor="var(--gold-deep)" />
            </linearGradient>
            <linearGradient id="pageL" x1="0" x2="1">
              <stop offset="0" stopColor="var(--cream)" />
              <stop offset="1" stopColor="var(--pale)" />
            </linearGradient>
            <linearGradient id="pageR" x1="1" x2="0">
              <stop offset="0" stopColor="var(--cream)" />
              <stop offset="1" stopColor="var(--pale)" />
            </linearGradient>
            <linearGradient id="beam" x1="0" x2="1">
              <stop offset="0" stopColor="var(--lemon)" stopOpacity="0" />
              <stop offset="0.5" stopColor="var(--gold-bright)" />
              <stop offset="1" stopColor="var(--lemon)" stopOpacity="0" />
            </linearGradient>
            <clipPath id="pages">
              <path d="M160 40 C120 22 60 24 24 34 L24 168 C60 158 120 158 160 176 C200 158 260 158 296 168 L296 34 C260 24 200 22 160 40Z" />
            </clipPath>
          </defs>
          <path d="M160 52 C115 34 50 38 10 48 L10 184 C55 174 120 174 160 192 C200 174 265 174 310 184 L310 48 C270 38 205 34 160 52Z" fill="url(#cover)" />
          <path d="M160 40 C120 22 60 24 24 34 L24 168 C60 158 120 158 160 176Z" fill="url(#pageL)" />
          <path d="M160 40 C200 22 260 24 296 34 L296 168 C260 158 200 158 160 176Z" fill="url(#pageR)" />
          <g stroke="var(--gold)" strokeOpacity="0.35" strokeWidth="2.5" strokeLinecap="round">
            {[60, 76, 92, 108, 124, 140].map((y) => (
              <g key={y}>
                <path d={`M44 ${y} Q100 ${y - 8} 144 ${y + 4}`} fill="none" />
                <path d={`M176 ${y + 4} Q220 ${y - 8} 276 ${y}`} fill="none" />
              </g>
            ))}
          </g>
          <path d="M160 40 L160 176" stroke="var(--gold-deep)" strokeOpacity="0.4" strokeWidth="1.5" />
          <g clipPath="url(#pages)">
            <g className="splash-beam">
              <rect x="0" y="-6" width="320" height="12" fill="url(#beam)" opacity="0.35" />
              <rect x="0" y="-1" width="320" height="2" fill="url(#beam)" />
            </g>
          </g>
        </svg>
        {particles.map((i) => (
          <span
            key={i}
            className="splash-particle absolute h-1.5 w-1.5 rounded-sm bg-gold-bright"
            style={{ left: `${10 + ((i * 37) % 80)}%`, top: `${15 + ((i * 23) % 50)}%`, animationDelay: `${(i % 7) * 0.25}s` }}
          />
        ))}
      </div>
      <h1 className="splash-enter mt-10 text-3xl font-bold text-foreground">
        BookScan <span className="text-primary">AI</span>
      </h1>
      <div className="splash-enter mt-6 h-1.5 w-48 overflow-hidden rounded-full bg-muted">
        <div className="splash-progress h-full rounded-full bg-gradient-gold" style={{ animationDuration: `${DURATION}ms` }} />
      </div>
      <p className="mt-6 text-xs text-muted-foreground">Tap to skip</p>
    </div>
  );
}
