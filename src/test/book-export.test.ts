import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { buildEpub, toBlocks, hasText } from "@/lib/book-export";

describe("book export", () => {
  it("keeps pages in order and marks chapter headings", () => {
    const blocks = toBlocks(["Chapter 1\nHello\nworld", "Second page"]);
    expect(blocks.map((b) => [b.kind, b.text])).toEqual([["page", "Page 1"], ["heading", "Chapter 1"], ["para", "Hello world"], ["page", "Page 2"], ["para", "Second page"]]);
  });
  it("needs recognised text to export", () => {
    expect(hasText(["", "  "])).toBe(false);
    expect(hasText(["", "अध्याय एक"])).toBe(true);
  });
  it("builds an EPUB with one file per page in reading order", async () => {
    const zip = await JSZip.loadAsync(await new Promise<ArrayBuffer>(async (res) => { const r = new FileReader(); r.onload = () => res(r.result as ArrayBuffer); r.readAsArrayBuffer(await buildEpub({ title: "T", pages: ["one", "two", "three"] })); }));
    const opf = await zip.file("OEBPS/content.opf")!.async("string");
    expect(opf.indexOf('idref="p0"')).toBeLessThan(opf.indexOf('idref="p2"'));
    expect(await zip.file("OEBPS/page-0002.xhtml")!.async("string")).toContain("two");
  });
});
