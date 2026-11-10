import { queryOptions } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import { supabase } from "@/integrations/supabase/client";

export async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const bookQuery = (docId: string) => queryOptions({
  queryKey: ["document", docId],
  staleTime: 30_000,
  queryFn: async () => {
    const { data, error } = await supabase.from("documents").select("*").eq("id", docId).maybeSingle();
    if (error) throw error;
    return data;
  },
});

export const bookChatsQuery = (docId: string) => queryOptions({
  queryKey: ["book-chats", docId],
  queryFn: async () => {
    const { data, error } = await supabase.from("book_chats").select("id, title, updated_at").eq("document_id", docId).order("updated_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const chatQuery = (chatId: string) => queryOptions({
  queryKey: ["book-chat", chatId],
  staleTime: 0,
  queryFn: async () => {
    const { data: chat, error } = await supabase.from("book_chats").select("id, title, document_id").eq("id", chatId).maybeSingle();
    if (error) throw error;
    if (!chat) return null;
    const { data: rows, error: e2 } = await supabase.from("book_chat_messages").select("message_id, role, parts").eq("chat_id", chatId).order("created_at");
    if (e2) throw e2;
    const messages = (rows ?? []).map((r) => ({ id: r.message_id, role: r.role as UIMessage["role"], parts: r.parts as UIMessage["parts"] })) as UIMessage[];
    return { chat, messages };
  },
});

export async function createChat(documentId: string, title = "New chat") {
  const { data, error } = await supabase.from("book_chats").insert({ document_id: documentId, title }).select("id").single();
  if (error) throw error;
  return data.id;
}

export const QUICK_PROMPTS = [
  { label: "Summary", title: "Summary", prompt: "Write a clear chapter-by-chapter summary of this book. If there are no chapters, summarise it section by section." },
  { label: "Key takeaways", title: "Key takeaways", prompt: "List the key takeaways from this book as concise bullet points, with page references." },
  { label: "Study notes", title: "Study notes", prompt: "Create study notes for this book: main ideas, important terms with definitions, and 5 self-test questions with answers." },
];
