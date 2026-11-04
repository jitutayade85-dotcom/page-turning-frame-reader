// @ts-nocheck
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, Phone, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";

type Mode = "login" | "signup";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { mode?: Mode } => ({
    mode: s.mode === "signup" ? "signup" : s.mode === "login" ? "login" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — BookScan AI" },
      { name: "description", content: "Log in or create your free BookScan AI account." },
      { property: "og:title", content: "Sign in — BookScan AI" },
      { property: "og:description", content: "Log in or create your free BookScan AI account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6z"/></svg>
  );
}

function AuthPage() {
  const { mode: initialMode } = Route.useSearch();
  const [mode, setMode] = useState<Mode>(initialMode ?? "login");
  const [method, setMethod] = useState<"email" | "phone">("email");
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === "SIGNED_IN" && s) navigate({ to: "/dashboard", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/dashboard", data: { display_name: name } },
        });
        if (error) throw error;
        if (!data.session) setCheckEmail(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (res.error) toast.error(res.error.message ?? "Google sign-in failed");
  }

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\+\d{8,15}$/.test(phone.replace(/\s/g, ""))) {
      toast.error("Enter your number with country code, e.g. +919876543210");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: phone.replace(/\s/g, "") });
    setBusy(false);
    if (error) {
      toast.error(error.message.includes("provider") || error.message.includes("Unsupported")
        ? "Phone sign-in isn't switched on yet. The app owner needs to connect an SMS provider."
        : error.message);
      return;
    }
    setOtpSent(true);
    toast.success("Code sent by SMS");
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ phone: phone.replace(/\s/g, ""), token: otp, type: "sms" });
    setBusy(false);
    if (error) toast.error(error.message);
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-hero">
      <div className="mx-auto w-full max-w-6xl px-4 py-5"><Logo /></div>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md rounded-3xl border bg-card p-7 shadow-soft animate-in fade-in zoom-in-95 duration-500 sm:p-9">
          {checkEmail ? (
            <div className="text-center">
              <Mail className="mx-auto h-10 w-10 text-primary" />
              <h1 className="mt-4 text-2xl font-bold">Check your email</h1>
              <p className="mt-2 text-sm text-muted-foreground">We sent a confirmation link to <b>{email}</b>. Click it to verify your account and sign in.</p>
              <Button variant="outline" className="mt-6" onClick={() => { setCheckEmail(false); setMode("login"); }}>Back to login</Button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold">{mode === "login" ? "Welcome back" : "Create your free account"}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{mode === "login" ? "Log in to continue scanning." : "Start digitizing your books in minutes."}</p>

              <Button variant="outline" className="mt-6 h-11 w-full rounded-xl bg-card" onClick={onGoogle}>
                <GoogleIcon /> Continue with Google
              </Button>

              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" />or<div className="h-px flex-1 bg-border" /></div>

              <div className="mb-5 grid grid-cols-2 rounded-xl bg-muted p-1 text-sm font-medium">
                {(["email", "phone"] as const).map((m) => (
                  <button key={m} onClick={() => setMethod(m)} className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all ${method === m ? "bg-card shadow-soft" : "text-muted-foreground"}`}>
                    {m === "email" ? <Mail className="h-4 w-4" /> : <Phone className="h-4 w-4" />} {m === "email" ? "Email" : "Mobile OTP"}
                  </button>
                ))}
              </div>

              {method === "email" ? (
                <form onSubmit={onEmail} className="space-y-4">
                  {mode === "signup" && (
                    <div className="space-y-1.5"><Label htmlFor="name">Full name</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="h-11 rounded-xl" /></div>
                  )}
                  <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11 rounded-xl" /></div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between"><Label htmlFor="pw">Password</Label>{mode === "login" && <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">Forgot password?</Link>}</div>
                    <Input id="pw" type="password" minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} required className="h-11 rounded-xl" />
                  </div>
                  <Button variant="gold" type="submit" disabled={busy} className="h-11 w-full rounded-xl">
                    {busy && <Loader2 className="animate-spin" />} {mode === "login" ? "Log in" : "Create account"}
                  </Button>
                </form>
              ) : !otpSent ? (
                <form onSubmit={sendOtp} className="space-y-4">
                  <div className="space-y-1.5"><Label htmlFor="phone">Mobile number</Label><Input id="phone" type="tel" placeholder="+91 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} required className="h-11 rounded-xl" /></div>
                  <Button variant="gold" type="submit" disabled={busy} className="h-11 w-full rounded-xl">{busy && <Loader2 className="animate-spin" />} Send code</Button>
                </form>
              ) : (
                <form onSubmit={verifyOtp} className="space-y-4">
                  <div className="space-y-1.5"><Label htmlFor="otp">6-digit code sent to {phone}</Label><Input id="otp" inputMode="numeric" maxLength={8} value={otp} onChange={(e) => setOtp(e.target.value)} required className="h-11 rounded-xl tracking-[0.4em]" /></div>
                  <Button variant="gold" type="submit" disabled={busy} className="h-11 w-full rounded-xl">{busy && <Loader2 className="animate-spin" />} Verify & continue</Button>
                  <button type="button" onClick={() => setOtpSent(false)} className="w-full text-xs text-muted-foreground hover:underline">Change number</button>
                </form>
              )}

              <p className="mt-6 text-center text-sm text-muted-foreground">
                {mode === "login" ? "New to BookScan AI? " : "Already have an account? "}
                <button className="font-semibold text-primary hover:underline" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
                  {mode === "login" ? "Sign up free" : "Log in"}
                </button>
              </p>
              <p className="mt-4 text-center text-xs text-muted-foreground">By continuing you agree to our <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
