// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, ShieldCheck, Loader2, Mail, CalendarDays, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-admin";
import { useAuthUser } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({
    meta: [
      { title: "Users — BookScan AI" },
      { name: "description", content: "See who has signed up and logged in to BookScan AI." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UsersPage,
});

function fmt(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function UsersPage() {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { user } = useAuthUser();

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, email, created_at, last_sign_in_at")
        .order("last_sign_in_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (adminLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md pt-16 text-center">
        <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 font-display text-2xl font-bold">Admins only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This page is only visible to the app owner.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex rounded-xl bg-gradient-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-gold"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  const users = usersQuery.data ?? [];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-gold text-primary-foreground shadow-gold">
          <Users className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold">Users</h1>
          <p className="text-sm text-muted-foreground">
            {users.length} registered {users.length === 1 ? "user" : "users"} · only you can see this page
          </p>
        </div>
      </div>

      {usersQuery.isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : usersQuery.isError ? (
        <p className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">
          Could not load users. Please try again.
        </p>
      ) : (
        <ul className="space-y-3">
          {users.map((u) => {
            const isYou = u.id === user?.id;
            const name = u.display_name || u.email?.split("@")[0] || "Reader";
            return (
              <li
                key={u.id}
                className="flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-soft"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pale font-display text-lg font-bold text-primary">
                  {name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate font-semibold">
                    {name}
                    {isYou && (
                      <span className="rounded-full bg-gradient-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                        You
                      </span>
                    )}
                  </p>
                  <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                    <Mail className="h-3 w-3 shrink-0" /> {u.email || "No email"}
                  </p>
                </div>
                <div className="shrink-0 text-right text-xs text-muted-foreground">
                  <p className="flex items-center justify-end gap-1.5">
                    <Clock className="h-3 w-3" /> Last login: {fmt(u.last_sign_in_at)}
                  </p>
                  <p className="mt-1 flex items-center justify-end gap-1.5">
                    <CalendarDays className="h-3 w-3" /> Joined: {fmt(u.created_at)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
