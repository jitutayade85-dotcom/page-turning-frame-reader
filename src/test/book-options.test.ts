import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { buildDocx, isHeading } from "@/lib/book-export";
import { chunkText, pdfPageText } from "@/lib/book-text";
import { decodePCM } from "@/lib/speech-player";

describe("book options", () => {
  it("keeps Hindi headings as editable headings", () => {
    expect(isHeading("अध्याय एक")).toBe(true);
    expect(isHeading("यह एक सामान्य वाक्य है।")).toBe(false);
  });
  it("reads PDF lines without losing chapter boundaries", () => {
    expect(pdfPageText([{ str: "Chapter 1", hasEOL: true }, { str: "Hello", hasEOL: false }, { str: "world", hasEOL: true }, { type: "other" }])).toBe("Chapter 1\nHello world");
  });
  it("reads the entire long English and Hindi page in bounded chunks", () => {
    const text = "Mira reads a book. हिन्दी में किताब पढ़ें। ".repeat(300);
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(6);
    expect(chunks.join("")).toBe(text);
    expect(chunks.every(chunk => Array.from(chunk).length <= 1200)).toBe(true);
  });
  it("does not drop unbroken Unicode input", () => {
    const text = "📖".repeat(2501);
    expect(chunkText(text).map(chunk => Array.from(chunk).length)).toEqual([1200, 1200, 101]);
    expect(chunkText(text).join("")).toBe(text);
  });
  it("preserves PCM samples split across network events", () => {
    const first = decodePCM(new Uint8Array(), new Uint8Array([0, 128, 255]));
    expect(Array.from(first.samples)).toEqual([-1]);
    const second = decodePCM(first.pending, new Uint8Array([127]));
    expect(second.samples[0]).toBe(32767 / 32768);
    expect(second.pending.length).toBe(0);
  });
  it("exports editable Hindi and English in original page order", async () => {
    const blob = await buildDocx({ title: "Test book", pages: ["Chapter 1\nEnglish first", "अध्याय दो\nहिन्दी दूसरा"] });
    const buffer = await new Promise<ArrayBuffer>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as ArrayBuffer); reader.onerror = reject; reader.readAsArrayBuffer(blob); });
    const zip = await JSZip.loadAsync(buffer);
    const file = zip.file("word/document.xml");
    if (!file) throw new Error("Word document is missing");
    const xml = await file.async("string");
    expect(xml).toContain("English first"); expect(xml).toContain("हिन्दी दूसरा");
    expect(xml.indexOf("English first")).toBeLessThan(xml.indexOf("हिन्दी दूसरा"));
    expect(xml).toContain('w:val="Heading1"');
  });
});