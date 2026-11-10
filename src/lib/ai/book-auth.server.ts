import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Verify the caller's bearer token and return a client that acts as that user (RLS applies). */
export async function userClient(request: Request) {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!url || !key || !token) return null;
  const supabase = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return { supabase, userId: data.user.id };
}

export const json = (status: number, message: string) =>
  new Response(JSON.stringify({ error: message }), { status, headers: { "content-type": "application/json" } });

export function gatewayMessage(status: number) {
  if (status === 429) return "The AI is busy right now. Please wait a moment and try again.";
  if (status === 402) return "AI credits are used up for this workspace. Add credits to continue.";
  if (status === 403) return "AI features aren't available for this workspace.";
  return `The AI request failed (${status}).`;
}
