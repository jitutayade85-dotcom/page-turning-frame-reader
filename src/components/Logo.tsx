import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-gold shadow-gold",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
        <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H12v16h5.5a2.5 2.5 0 0 1 2.5 2.5z" />
        <path d="M2 9V7M22 9V7M2 15v2M22 15v2" />
      </svg>
    </span>
  );
}

export function Logo({ to = "/" }: { to?: "/" | "/dashboard" }) {
  return (
    <Link to={to} className="flex items-center gap-2.5">
      <LogoMark />
      <span className="font-display text-lg font-bold tracking-tight">
        BookScan <span className="text-primary">AI</span>
      </span>
    </Link>
  );
}
