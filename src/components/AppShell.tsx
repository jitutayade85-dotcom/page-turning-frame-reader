// @ts-nocheck
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Home, ScanLine, Library, Settings, LogOut, Wifi } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LogoMark } from "@/components/Logo";
import { useAuthUser } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const tabs = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/library", label: "Library", icon: Library },
  null,
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

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function AppShell({ children }: { children: ReactNode }) {
  const signOut = useSignOut();
  const { user } = useAuthUser();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const name = (user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Reader") as string;
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="relative mx-auto flex h-[100dvh] w-full max-w-[1600px] flex-col overflow-hidden bg-background md:grid md:grid-cols-[180px_minmax(0,1fr)] md:grid-rows-[auto_minmax(0,1fr)] lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* Top bar */}
        <header className="z-20 shrink-0 bg-background/90 px-5 pb-3 pt-[max(env(safe-area-inset-top),0.75rem)] backdrop-blur-xl md:col-span-2 md:border-b md:px-8 md:py-4">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <LogoMark className="h-10 w-10 shrink-0" />
              <span className="hidden shrink-0 font-display text-lg font-bold md:block">BookScan AI</span>
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">{greeting()} 👋</p>
                <p className="truncate font-display text-base font-bold">{name}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="flex items-center gap-1 rounded-full bg-pale px-2.5 py-1 text-[11px] font-semibold text-primary">
                <Wifi className="h-3 w-3" /> Online
              </span>
              <Button variant="gold" onClick={signOut} aria-label="Log out" className="relative h-10 w-10 rounded-full p-0 font-bold transition-transform active:scale-90">
                {initial}
                <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-background bg-card text-foreground">
                  <LogOut className="h-2.5 w-2.5" />
                </span>
              </Button>
            </div>
          </div>
        </header>

        <main key={path} className="@container min-h-0 min-w-0 flex-1 overflow-y-auto px-4 pb-28 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none md:col-start-2 md:row-start-2 md:px-8 md:py-8 lg:px-10 [&_.rounded-xl]:rounded-2xl">
          {children}
        </main>

        {/* Bottom tab bar */}
        <nav aria-label="Main navigation" className="absolute inset-x-3 bottom-[max(env(safe-area-inset-bottom),0.75rem)] z-30 md:static md:col-start-1 md:row-start-2 md:border-r md:bg-card/60 md:p-4">
          <div className="relative grid h-16 grid-cols-5 items-center rounded-3xl border bg-card/95 shadow-soft backdrop-blur-xl md:flex md:h-auto md:flex-col md:items-stretch md:gap-2 md:rounded-none md:border-0 md:bg-transparent md:shadow-none md:backdrop-blur-none">
            {tabs.slice(0, 2).map((t) => <Tab key={t.to} t={t} active={path.startsWith(t.to)} />)}
            <div className="flex justify-center md:my-2">
              <Link to="/scan" preload="intent" aria-label="Scan" className={cn("-mt-9 flex h-16 w-16 items-center justify-center rounded-full border-4 border-background bg-gradient-gold text-primary-foreground shadow-gold transition-transform hover:scale-105 active:scale-90 md:mt-0 md:h-12 md:w-full md:gap-3 md:rounded-xl md:border-0 md:hover:scale-100", path.startsWith("/scan") && "ring-4 ring-gold-bright/40")}>
                <ScanLine className="h-7 w-7" />
                <span className="hidden text-sm font-semibold md:inline">Scan a book</span>
              </Link>
            </div>
            {tabs.slice(3).map((t) => <Tab key={t.to} t={t} active={path.startsWith(t.to)} />)}
            <div className="flex justify-center md:mt-6">
              <Button variant="ghost" onClick={signOut} className="h-auto flex-col gap-0.5 p-0 text-muted-foreground transition-transform active:scale-90 md:w-full md:flex-row md:justify-start md:gap-3 md:p-2">
                <span className="flex h-8 w-12 items-center justify-center rounded-full"><LogOut className="h-5 w-5" /></span>
                <span className="text-[11px] font-medium md:text-sm">Log out</span>
              </Button>
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}

function Tab({ t, active }: { t: { to: string; label: string; icon: any }; active: boolean }) {
  return (
    <Link to={t.to} preload="intent" aria-current={active ? "page" : undefined} className={cn("flex flex-col items-center gap-0.5 transition-transform active:scale-90 md:flex-row md:gap-3 md:rounded-xl md:p-2", active && "md:bg-pale")}>
      <span className={cn("flex h-8 w-12 items-center justify-center rounded-full transition-all duration-300", active ? "bg-pale text-primary" : "text-muted-foreground")}>
        <t.icon className={cn("h-5 w-5 transition-transform", active && "scale-110")} />
      </span>
      <span className={cn("text-[11px] font-medium md:text-sm", active ? "text-primary" : "text-muted-foreground")}>{t.label}</span>
    </Link>
  );
}
