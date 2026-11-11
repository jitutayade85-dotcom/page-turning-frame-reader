import { createFileRoute } from "@tanstack/react-router";
import { userClient, json } from "@/lib/ai/book-auth.server";

const MODEL = "google/gemini-3.1-flash-tts-preview";
const VOICES = ["Kore", "Puck", "Charon", "Aoede"];

export const Route = createFileRoute("/api/book-speech")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await userClient(request);
        if (!auth) return json(401, "Please sign in again.");
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return json(500, "Read-aloud is not configured.");
        const body = (await request.json().catch(() => null)) as { text?: string; voice?: string; language?: string } | null;
        const text = body?.text?.trim();
        if (!text) return json(400, "This page has no text to read.");
        if (text.length > 6000) return json(400, "This page is too long to read aloud.");
        const requestedVoice = body?.voice;
        const voice = requestedVoice && VOICES.includes(requestedVoice) ? requestedVoice : "Kore";
        const lang = body?.language === "hi" ? "Read the following aloud in clear, natural Hindi" : body?.language === "en" ? "Read the following aloud in clear, natural English" : "Read the following aloud naturally, in the language it is written in";
        const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
          method: "POST",
          signal: request.signal,
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
          body: JSON.stringify({
            model: MODEL,
            contents: [{ role: "user", parts: [{ text: `${lang}:\n\n${text}` }] }],
            generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
            stream_format: "sse",
          }),
        });
        if (!res.ok || !res.body) { const payload = await res.json().catch(() => ({})); return json(res.ok ? 502 : res.status, payload.message ?? payload.error?.message ?? `Read-aloud failed (${res.status}).`); }
        const headers = new Headers({ "content-type": res.headers.get("content-type") ?? "text/event-stream", "cache-control": "no-store" });
        res.headers.forEach((value, name) => { if (name.toLowerCase().startsWith("x-lovable-aig-")) headers.set(name, value); });
        return new Response(res.body, { headers });
      },
    },
  },
});
