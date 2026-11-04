import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — BookScan AI" },
      { name: "description", content: "Choose a new password for your BookScan AI account." },
      { property: "og:title", content: "Set a new password — BookScan AI" },
      { property: "og:description", content: "Choose a new password for your BookScan AI account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reset,
});

function Reset() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) setReady(true);
    const { data } = supabase.auth.onAuthStateChange((e) => { if (e === "PASSWORD_RECOVERY") setReady(true); });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    navigate({ to: "/dashboard" });
  }
  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="mx-auto max-w-6xl px-4 py-5"><Logo /></div>
      <form onSubmit={submit} className="mx-auto mt-10 max-w-md space-y-4 rounded-3xl border bg-card p-8 shadow-soft">
        <h1 className="text-2xl font-bold">Set a new password</h1>
        {!ready && <p className="text-sm text-muted-foreground">Open this page from the reset link in your email.</p>}
        <div className="space-y-1.5"><Label htmlFor="pw">New password</Label><Input id="pw" type="password" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} className="h-11 rounded-xl" /></div>
        <Button variant="gold" disabled={!ready} className="h-11 w-full rounded-xl">Update password</Button>
      </form>
    </div>
  );
}
