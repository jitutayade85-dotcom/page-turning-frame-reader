import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, type UIMessage } from "ai";
import { userClient, json } from "@/lib/ai/book-auth.server";
import { createResponsesCall } from "@/lib/ai/responses.server";

const MODEL = "openai/gpt-6-astra";
const MAX_BOOK_CHARS = 180_000;

export const Route = createFileRoute("/api/book-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await userClient(request);
        if (!auth) return json(401, "Please sign in again.");
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return json(500, "AI is not configured.");
        const body = (await request.json().catch(() => null)) as { chatId?: string; messages?: UIMessage[] } | null;
        if (!body?.chatId || !Array.isArray(body.messages) || !body.messages.length) return json(400, "Invalid request.");
        const { supabase, userId } = auth;
        const { data: chat } = await supabase.from("book_chats").select("id, title, document_id").eq("id", body.chatId).maybeSingle();
        if (!chat) return json(404, "Chat not found.");
        const { data: doc } = await supabase.from("documents").select("title, page_texts").eq("id", chat.document_id).maybeSingle();
        if (!doc) return json(404, "Book not found.");

        let book = "";
        (doc.page_texts ?? []).forEach((t, i) => { if (t?.trim()) book += `\n\n[Page ${i + 1}]\n${t.trim()}`; });
        const truncated = book.length > MAX_BOOK_CHARS;
        if (truncated) book = book.slice(0, MAX_BOOK_CHARS);
        const instructions = `You are BookScan AI's reading companion for the book "${doc.title}". Answer only from the book text below. Cite pages like (p. 3). If the answer isn't in the text, say so plainly; never invent content. Reply in the language the user writes in (English or Hindi). For summaries, key takeaways or study notes, use clear markdown headings and bullet points.${truncated ? " Note: only the first part of the book fits; say so if asked about later pages." : ""}\n\nBOOK TEXT:${book || "\n(No text was recognised in this book.)"}`;

        // Save the newest user message before streaming.
        const last = body.messages[body.messages.length - 1];
        if (last.role === "user") {
          const { error } = await supabase.from("book_chat_messages").upsert({ chat_id: chat.id, user_id: userId, message_id: last.id, role: "user", parts: last.parts as never }, { onConflict: "chat_id,message_id" });
          if (error) return json(500, "Couldn't save your message.");
          if (chat.title === "New chat") {
            const text = last.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ").trim();
            await supabase.from("book_chats").update({ title: text.slice(0, 60) || "New chat" }).eq("id", chat.id);
          }
        }

        const call = createResponsesCall(request, { baseURL: "https://ai.gateway.lovable.dev", apiKey, model: MODEL }, await convertToModelMessages(body.messages), instructions);
        return call.response({
          originalMessages: body.messages,
          onError: (e) => { console.error("book-chat", e); const s = (e as { statusCode?: number })?.statusCode; return s === 402 ? "AI credits are used up for this workspace." : s === 429 ? "The AI is busy. Please try again shortly." : "The AI couldn't answer. Please try again."; },
          onFinish: async ({ responseMessage }) => {
            const { error } = await supabase.from("book_chat_messages").upsert({ chat_id: chat.id, user_id: userId, message_id: responseMessage.id, role: "assistant", parts: responseMessage.parts as never }, { onConflict: "chat_id,message_id" });
            if (error) console.error("Failed to save assistant message", error);
            await supabase.from("book_chats").update({ updated_at: new Date().toISOString() }).eq("id", chat.id);
          },
        });
      },
    },
  },
});
