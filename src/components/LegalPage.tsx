import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="mx-auto max-w-6xl px-4 py-5"><Logo /></div>
      <article className="mx-auto mb-16 max-w-3xl space-y-4 rounded-3xl border bg-card p-8 leading-relaxed shadow-soft [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_p]:text-muted-foreground">
        <h1 className="text-3xl font-bold">{title}</h1>
        {children}
      </article>
    </div>
  );
}
