import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuthUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    let sessionEventReceived = false;
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!active) return;
      sessionEventReceived = true;
      setUser(session?.user ?? null);
      setLoading(false);
    });
    // UI only: access checks remain in the route gate, server handlers and RLS.
    supabase.auth.getSession().then(({ data }) => {
      if (!active || sessionEventReceived) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      if (active && !sessionEventReceived) setLoading(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  return { user, loading };
}
