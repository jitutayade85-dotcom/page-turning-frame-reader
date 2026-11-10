import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Copy, Plus } from "lucide-react";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse, MessageActions, MessageAction } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/Logo";
import { authHeader, chatQuery, createChat, QUICK_PROMPTS } from "@/lib/book-chats";

export const Route = createFileRoute("/_authenticated/chat/$chatId")({
  validateSearch: (s: Record<string, unknown>): { prompt?: string } => (typeof s["prompt"] === "string" ? { prompt: s["prompt"] } : {}),
  head: () => ({ meta: [{ title: "Book chat — BookScan AI" }, { name: "description", content: "Ask questions about your scanned book." }, { property: "og:title", content: "Book chat — BookScan AI" }, { property: "og:description", content: "Chat with your scanned book, get summaries and study notes." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ChatPage,
});

function ChatPage() {
  const { chatId } = Route.useParams();
  const { data, isLoading } = useQuery(chatQuery(chatId));
  if (isLoading) return <p className="text-muted-foreground">Loading chat…</p>;
  if (!data) return <div className="rounded-3xl border bg-card p-8 text-center"><p className="font-medium">Chat not found</p><Button asChild variant="gold" className="mt-4 rounded-xl"><Link to="/library">Back to library</Link></Button></div>;
  return <ChatWindow key={chatId} chatId={chatId} docId={data.chat.document_id} title={data.chat.title} initial={data.messages} />;
}

function ChatWindow({ chatId, docId, title, initial }: { chatId: string; docId: string; title: string; initial: UIMessage[] }) {
  const { prompt } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const sentPrompt = useRef(false);
  const { messages, sendMessage, status, stop } = useChat({
    id: chatId,
    messages: initial,
    transport: new DefaultChatTransport({ api: "/api/book-chat", body: { chatId }, headers: authHeader }),
    onError: (e) => { let msg = e.message; try { msg = JSON.parse(e.message).error ?? msg; } catch { /* plain text */ } toast.error(msg || "The AI couldn't answer."); },
    onFinish: () => { qc.invalidateQueries({ queryKey: ["book-chats", docId] }); qc.invalidateQueries({ queryKey: ["book-chat", chatId] }); },
  });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (prompt && !sentPrompt.current && initial.length === 0) {
      sentPrompt.current = true;
      void sendMessage({ text: prompt });
      navigate({ to: "/chat/$chatId", params: { chatId }, search: {}, replace: true });
    }
  }, [prompt, initial.length, sendMessage, navigate, chatId]);

  async function newChat() {
    try { const id = await createChat(docId); qc.invalidateQueries({ queryKey: ["book-chats", docId] }); navigate({ to: "/chat/$chatId", params: { chatId: id } }); }
    catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="flex h-[calc(100dvh-13rem)] min-h-[420px] flex-col md:h-[calc(100dvh-9rem)]">
      <div className="flex items-center justify-between gap-3 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/book/$docId" params={{ docId }} aria-label="Back to book" className="rounded-full p-2 hover:bg-pale"><ArrowLeft className="h-5 w-5" /></Link>
          <LogoMark className="h-9 w-9 shrink-0" />
          <div className="min-w-0"><p className="truncate font-display font-bold">{messages.length ? title : "New chat"}</p><p className="text-xs text-muted-foreground">Answers come only from your book</p></div>
        </div>
        <Button variant="outline" size="sm" className="shrink-0 rounded-xl" onClick={newChat}><Plus /> New</Button>
      </div>
      <Conversation className="min-h-0 flex-1 rounded-3xl border bg-card">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState icon={<LogoMark className="h-14 w-14" />} title="Ask about your book" description="Questions, summaries, key takeaways or study notes — in English or Hindi.">
            </ConversationEmptyState>
          ) : messages.map((m) => (
            <Message key={m.id} from={m.role}>
              <MessageContent className={m.role === "user" ? "group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground" : ""}>
                {m.parts.map((p, i) => p.type === "text" ? (m.role === "assistant" ? <MessageResponse key={i}>{p.text}</MessageResponse> : <p key={i} className="whitespace-pre-wrap">{p.text}</p>) : null)}
              </MessageContent>
              {m.role === "assistant" && status !== "streaming" && (
                <MessageActions><MessageAction tooltip="Copy" label="Copy" onClick={() => navigator.clipboard.writeText(m.parts.map((p) => (p.type === "text" ? p.text : "")).join("")).then(() => toast.success("Copied"))}><Copy className="size-3.5" /></MessageAction></MessageActions>
              )}
            </Message>
          ))}
          {status === "submitted" && <Message from="assistant"><MessageContent><Shimmer>Reading your book…</Shimmer></MessageContent></Message>}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 pt-3">{QUICK_PROMPTS.map((q) => <Button key={q.label} size="sm" variant="outline" className="rounded-xl" disabled={busy} onClick={() => sendMessage({ text: q.prompt })}>{q.label}</Button>)}</div>
      )}
      <div className="pt-3">
        <PromptInput onSubmit={({ text }) => { if (!text.trim() || busy) return; void sendMessage({ text }); setInput(""); }}>
          <PromptInputTextarea autoFocus value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question about this book…" />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} onStop={stop} disabled={!busy && !input.trim()} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
