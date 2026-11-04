import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot password — BookScan AI" },
      { name: "description", content: "Reset your BookScan AI password." },
      { property: "og:title", content: "Forgot password — BookScan AI" },
      { property: "og:description", content: "Reset your BookScan AI password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Forgot,
});

function Forgot() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    if (error) return toast.error(error.message);
    setSent(true);
  }
  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="mx-auto max-w-6xl px-4 py-5"><Logo /></div>
      <div className="mx-auto mt-10 max-w-md rounded-3xl border bg-card p-8 shadow-soft">
        {sent ? (
          <div className="text-center">
            <MailCheck className="mx-auto h-10 w-10 text-primary" />
            <h1 className="mt-3 text-2xl font-bold">Check your inbox</h1>
            <p className="mt-2 text-sm text-muted-foreground">If an account exists for {email}, a reset link is on its way.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <h1 className="text-2xl font-bold">Forgot your password?</h1>
            <p className="text-sm text-muted-foreground">Enter your email and we'll send you a reset link.</p>
            <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-xl" /></div>
            <Button variant="gold" disabled={busy} className="h-11 w-full rounded-xl">Send reset link</Button>
          </form>
        )}
        <Link to="/auth" className="mt-6 block text-center text-sm font-medium text-primary hover:underline">Back to login</Link>
      </div>
    </div>
  );
}
