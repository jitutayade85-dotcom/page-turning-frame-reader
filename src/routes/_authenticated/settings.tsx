// @ts-nocheck
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { LogOut, Trash2, ShieldCheck, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { profileQuery } from "@/lib/documents";
import { deleteMyAccount } from "@/lib/account.functions";
import { useSignOut } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — BookScan AI" }, { name: "description", content: "Profile and account settings." }, { property: "og:title", content: "Settings — BookScan AI" }, { property: "og:description", content: "Manage your BookScan AI profile and account preferences." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: SettingsPage,
});

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-3xl border bg-card p-6 shadow-soft"><h2 className="mb-4 text-lg font-semibold">{title}</h2>{children}</section>;
}

function SettingsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const signOut = useSignOut();
  const del = useServerFn(deleteMyAccount);
  const { data: me } = useQuery(profileQuery);
  const [name, setName] = useState("");
  const [lang, setLang] = useState("en");
  const [notify, setNotify] = useState(true);
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");

  useEffect(() => {
    if (me?.profile) { setName(me.profile.display_name ?? ""); setLang(me.profile.language); setNotify(me.profile.notify_email); }
  }, [me?.profile]);

  async function saveProfile(patch: { display_name?: string; language?: string; notify_email?: boolean }) {
    if (!me) return;
    const { error } = await supabase.from("profiles").upsert({ id: me.user.id, ...patch });
    if (error) return toast.error(error.message);
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["profile"] });
  }
  async function changePw(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: newPw, ...(curPw ? { current_password: curPw } : {}) } as { password: string });
    if (error) return toast.error(error.message);
    setCurPw(""); setNewPw("");
    toast.success("Password changed");
  }
  async function deleteAccount() {
    try {
      await del();
      await supabase.auth.signOut();
      qc.clear();
      toast.success("Your account and files were deleted.");
      navigate({ to: "/", replace: true });
    } catch (e) { toast.error((e as Error).message); }
  }
  const hasEmail = me?.user.app_metadata?.provider === "email";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>
      <Card title="Profile">
        <div className="mb-4 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-gold text-xl font-bold text-primary-foreground">{(name || "R")[0].toUpperCase()}</div>
          <div><p className="font-semibold">{name || "Reader"}</p><p className="text-sm text-muted-foreground">{me?.user.email ?? me?.user.phone}</p></div>
        </div>
        <div className="flex gap-2"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" className="h-11 rounded-xl" /><Button variant="gold" className="h-11 rounded-xl" onClick={() => saveProfile({ display_name: name })}>Save</Button></div>
      </Card>
      {hasEmail && (
        <Card title="Change password">
          <form onSubmit={changePw} className="grid gap-3 @sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Current password</Label><Input type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} className="h-11 rounded-xl" /></div>
            <div className="space-y-1.5"><Label>New password</Label><Input type="password" minLength={8} required value={newPw} onChange={(e) => setNewPw(e.target.value)} className="h-11 rounded-xl" /></div>
            <Button variant="outline" className="rounded-xl @sm:col-span-2">Update password</Button>
          </form>
        </Card>
      )}
      <Card title="Preferences">
        <div className="flex items-center justify-between py-2">
          <div><p className="font-medium">Language</p><p className="text-sm text-muted-foreground">Default OCR language hint</p></div>
          <select value={lang} onChange={(e) => { setLang(e.target.value); saveProfile({ language: e.target.value }); }} className="h-10 rounded-xl border bg-card px-3 text-sm">
            <option value="en">English</option><option value="hi">हिन्दी (Hindi)</option><option value="mixed">English + Hindi</option>
          </select>
        </div>
        <div className="flex items-center justify-between border-t py-3">
          <div><p className="font-medium">Email notifications</p><p className="text-sm text-muted-foreground">Product updates and tips</p></div>
          <Switch checked={notify} onCheckedChange={(v) => { setNotify(v); saveProfile({ notify_email: v }); }} />
        </div>
      </Card>
      <Card title="Legal">
        <div className="flex flex-col gap-2">
          <Link to="/privacy" className="flex items-center gap-2 rounded-xl p-2 hover:bg-accent"><ShieldCheck className="h-4 w-4 text-primary" /> Privacy policy</Link>
          <Link to="/terms" className="flex items-center gap-2 rounded-xl p-2 hover:bg-accent"><FileText className="h-4 w-4 text-primary" /> Terms and conditions</Link>
        </div>
      </Card>
      <Card title="Account">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="rounded-xl" onClick={signOut}><LogOut /> Log out</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="destructive" className="rounded-xl"><Trash2 /> Delete account</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Delete your account?</AlertDialogTitle><AlertDialogDescription>All your PDFs and account data will be permanently deleted. This can't be undone.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive" onClick={deleteAccount}>Delete forever</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Card>
    </div>
  );
}
