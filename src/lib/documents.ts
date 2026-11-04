import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const documentsQuery = queryOptions({
  queryKey: ["documents"],
  queryFn: async () => {
    const { data, error } = await supabase.from("documents").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const profileQuery = queryOptions({
  queryKey: ["profile"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
    return { user: u.user, profile: data };
  },
});

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 ** 2).toFixed(1)} MB`;
}

export async function signedUrl(path: string, download?: string) {
  const { data, error } = await supabase.storage.from("pdfs").createSignedUrl(path, 600, download ? { download } : undefined);
  if (error) throw error;
  return data.signedUrl;
}
