import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { LayoutDashboard, ScanLine, Library, Settings, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/scan", label: "Scan", icon: ScanLine },
  { to: "/library", label: "Library", icon: Library },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function useSignOut() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
}

export function AppShell({ children }: { children: ReactNode }) {
  const signOut = useSignOut();
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo to="/dashboard" />
          <nav className="hidden items-center gap-1 md:flex">
            {items.map((i) => (
              <Link key={i.to} to={i.to} className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" activeProps={{ className: "bg-pale text-foreground" }}>
                <i.icon className="h-4 w-4" /> {i.label}
              </Link>
            ))}
            <button onClick={signOut} className="ml-2 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"><LogOut className="h-4 w-4" /> Log out</button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 md:py-10 animate-in fade-in duration-300">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {items.map((i) => (
          <Link key={i.to} to={i.to} className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground" activeProps={{ className: "text-primary" }}>
            <i.icon className="h-5 w-5" /> {i.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
