// @ts-nocheck
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import logoAsset from "@/assets/bookscan-logo.png.asset.json";

export function LogoMark({ className }: { className?: string }) {
  return (
    <img src={logoAsset.url} alt="BookScan AI logo" className={cn("h-10 w-10 object-contain", className)} />
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
