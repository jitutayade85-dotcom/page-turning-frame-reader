CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  language text NOT NULL DEFAULT 'en',
  notify_email boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, NEW.phone, 'Reader'), '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  file_path text NOT NULL,
  page_count integer NOT NULL DEFAULT 0,
  file_size bigint NOT NULL DEFAULT 0,
  searchable boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'video',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own docs select" ON public.documents FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own docs insert" ON public.documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own docs update" ON public.documents FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own docs delete" ON public.documents FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX documents_user_created ON public.documents(user_id, created_at DESC);

CREATE POLICY "own pdf read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own pdf insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own pdf update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own pdf delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);