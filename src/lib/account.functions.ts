import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const OCR_MODEL = "google/gemini-3-flash-preview";

export const ocrPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { image: string }) => {
    if (typeof input?.image !== "string" || !input.image.startsWith("data:image/jpeg;base64,")) throw new Error("Invalid image");
    if (input.image.length > 8_000_000) throw new Error("Page image is too large for text recognition");
    return input;
  })
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Text recognition is not configured.");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: OCR_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are an OCR engine. Transcribe ALL visible text on this book page exactly as printed, in reading order, preserving line breaks. Supports English and Hindi (Devanagari), including mixed text. Do not translate, summarise, correct or add anything. If a word is illegible write [illegible]. If there is no text, return an empty response. Output only the transcription.",
          },
          { role: "user", content: [{ type: "image_url", image_url: { url: data.image } }] },
        ],
      }),
    });
    if (!res.ok) {
      if (res.status === 429) throw new Error("Text recognition is busy. Please wait a moment and try again.");
      if (res.status === 402) throw new Error("AI credits are used up for this workspace. Text recognition is paused.");
      if (res.status === 403) throw new Error("Text recognition isn't available for this workspace.");
      throw new Error(`Text recognition failed (${res.status}).`);
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return { text: (json.choices?.[0]?.message?.content ?? "").trim() };
  });

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: files } = await supabase.storage.from("pdfs").list(userId, { limit: 1000 });
    if (files?.length) await supabase.storage.from("pdfs").remove(files.map((f) => `${userId}/${f.name}`));
    await supabase.from("documents").delete().eq("user_id", userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
