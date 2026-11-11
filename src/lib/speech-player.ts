import { createParser } from "eventsource-parser";

export function decodePCM(pending: Uint8Array, incoming: Uint8Array) {
  const bytes = new Uint8Array(pending.length + incoming.length);
  bytes.set(pending);
  bytes.set(incoming, pending.length);
  const usable = bytes.length - (bytes.length % 2);
  const view = new DataView(bytes.buffer);
  const samples = new Float32Array(usable / 2);
  for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(i * 2, true) / 32768;
  return { samples, pending: bytes.slice(usable) };
}

/** One player owns the audio clock across pages, pause/resume and voice changes. */
export class SpeechPlayer {
  private context = new AudioContext({ sampleRate: 24000 });
  private sources = new Set<AudioBufferSourceNode>();
  private rate = 1;
  private playhead = 0;
  private cache = new Map<string, Float32Array[]>();
  async resume() {
    await this.context.resume();
  }
  async pause() {
    await this.context.suspend();
  }
  setSpeed(speed: number) {
    const now = this.context.currentTime;
    for (const source of this.sources) {
      source.playbackRate.setValueAtTime(speed, now);
    }
    this.playhead = now + (Math.max(0, this.playhead - now) * this.rate) / speed;
    this.rate = speed;
  }
  stop() {
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {
        /* already ended */
      }
    }
    this.sources.clear();
    this.playhead = this.context.currentTime;
  }
  async close() {
    this.stop();
    await this.context.close();
  }
  async play(
    text: string,
    voice: string,
    language: string,
    headers: Record<string, string>,
    signal: AbortSignal,
    onAudio: () => void,
  ) {
    signal.throwIfAborted();
    let playback = Promise.resolve();
    const schedule = (samples: Float32Array) => {
      if (!samples.length) return;
      const buffer = this.context.createBuffer(1, samples.length, 24000);
      buffer.copyToChannel(new Float32Array(samples), 0);
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = this.rate;
      source.connect(this.context.destination);
      this.sources.add(source);
      playback = new Promise<void>((resolve) => {
        source.onended = () => {
          this.sources.delete(source);
          resolve();
        };
      });
      this.playhead = Math.max(this.playhead, this.context.currentTime + 0.05);
      source.start(this.playhead);
      this.playhead += buffer.duration / this.rate;
      onAudio();
    };
    const abort = () => this.stop();
    signal.addEventListener("abort", abort, { once: true });
    try {
      const key = JSON.stringify([text, voice, language]);
      const cached = this.cache.get(key);
      if (cached) for (const samples of cached) schedule(samples);
      else {
        const response = await fetch("/api/book-speech", {
          method: "POST",
          signal,
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify({ text, voice, language }),
        });
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.error ?? `Read-aloud failed (${response.status}).`);
        }
        if (!response.body) throw new Error("No audio was received.");
        let pending: Uint8Array = new Uint8Array(0);
        let done = false;
        const chunks: Float32Array[] = [];
        const parser = createParser({
          onEvent: (event) => {
            if (event.data === "[DONE]") return;
            const payload = JSON.parse(event.data);
            if (payload.error || payload.type === "error")
              throw new Error(payload.error?.message ?? payload.message ?? "Read-aloud stopped.");
            if (payload.type === "speech.audio.done") {
              done = true;
              return;
            }
            if (payload.type !== "speech.audio.delta") return;
            if (done || !payload.audio) throw new Error("Invalid audio stream.");
            const decoded = decodePCM(
              pending,
              Uint8Array.from(atob(payload.audio), (c) => c.charCodeAt(0)),
            );
            pending = decoded.pending;
            chunks.push(decoded.samples);
            schedule(decoded.samples);
          },
        });
        const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
        try {
          while (true) {
            const next = await reader.read();
            if (next.done) break;
            parser.feed(next.value);
          }
          parser.reset({ consume: true });
        } finally {
          reader.releaseLock();
        }
        if (!done || !chunks.some((c) => c.length) || pending.length)
          throw new Error("Incomplete audio. Tap Play to start a new request.");
        // Bound decoded audio memory; only cache complete generations.
        this.cache.set(key, chunks);
        if (this.cache.size > 8) {
          const oldest = this.cache.keys().next().value;
          if (oldest) this.cache.delete(oldest);
        }
      }
      await playback;
      signal.throwIfAborted();
    } catch (error) {
      this.stop();
      throw error;
    } finally {
      signal.removeEventListener("abort", abort);
    }
  }
}
