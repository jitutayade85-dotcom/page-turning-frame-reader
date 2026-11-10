ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS page_texts text[] NOT NULL DEFAULT '{}';

CREATE TABLE public.book_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New chat',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_chats TO authenticated;
GRANT ALL ON public.book_chats TO service_role;
ALTER TABLE public.book_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own chats select" ON public.book_chats FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own chats insert" ON public.book_chats FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND d.user_id = auth.uid()));
CREATE POLICY "own chats update" ON public.book_chats FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own chats delete" ON public.book_chats FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX book_chats_doc_idx ON public.book_chats(document_id, updated_at DESC);

CREATE TABLE public.book_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.book_chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  message_id text NOT NULL,
  role text NOT NULL,
  parts jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chat_id, message_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_chat_messages TO authenticated;
GRANT ALL ON public.book_chat_messages TO service_role;
ALTER TABLE public.book_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own msgs select" ON public.book_chat_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own msgs insert" ON public.book_chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.book_chats c WHERE c.id = chat_id AND c.user_id = auth.uid()));
CREATE POLICY "own msgs update" ON public.book_chat_messages FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own msgs delete" ON public.book_chat_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX book_chat_messages_chat_idx ON public.book_chat_messages(chat_id, created_at);