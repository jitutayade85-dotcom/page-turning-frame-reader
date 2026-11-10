/** Text exports (EPUB, Word) built from OCR page text, in page order. */
export type BookText = { title: string; pages: string[] };

const HEADING = /^(chapter|part|section|prologue|epilogue|introduction|contents|अध्याय|भाग|प्रस्तावना)\b/i;
export function isHeading(line: string) {
  const t = line.trim();
  if (!t || t.length > 70) return false;
  if (HEADING.test(t)) return true;
  return /[A-Z]/.test(t) && t === t.toUpperCase() && t.split(/\s+/).length <= 8 && !/[.,;]$/.test(t);
}

export type Block = { kind: "page" | "heading" | "para"; text: string };
export function toBlocks(pages: string[]): Block[] {
  const out: Block[] = [];
  pages.forEach((page, i) => {
    out.push({ kind: "page", text: `Page ${i + 1}` });
    let para: string[] = [];
    const flush = () => { if (para.length) out.push({ kind: "para", text: para.join(" ") }); para = []; };
    for (const raw of (page || "").split("\n")) {
      const line = raw.trim();
      if (!line) { flush(); continue; }
      if (isHeading(line)) { flush(); out.push({ kind: "heading", text: line }); continue; }
      para.push(line);
    }
    flush();
  });
  return out;
}

export const hasText = (pages: string[] | null | undefined) => !!pages?.some((p) => p?.trim());

export async function buildDocx({ title, pages }: BookText): Promise<Blob> {
  const { Document, Packer, Paragraph, HeadingLevel, PageBreak } = await import("docx");
  const children = [new Paragraph({ text: title, heading: HeadingLevel.TITLE })];
  toBlocks(pages).forEach((b, i) => {
    if (b.kind === "page") {
      if (i > 0) children.push(new Paragraph({ children: [new PageBreak()] }));
      children.push(new Paragraph({ text: b.text, heading: HeadingLevel.HEADING_2 }));
    } else if (b.kind === "heading") children.push(new Paragraph({ text: b.text, heading: HeadingLevel.HEADING_1 }));
    else children.push(new Paragraph({ text: b.text, spacing: { after: 160 } }));
  });
  const doc = new Document({ creator: "BookScan AI", title, sections: [{ children }] });
  return Packer.toBlob(doc);
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function buildEpub({ title, pages }: BookText): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const id = `urn:uuid:${crypto.randomUUID()}`;
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
  zip.file("META-INF/container.xml", `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`);
  const files: string[] = [];
  pages.forEach((page, i) => {
    const body = toBlocks([page]).slice(1).map((b) => (b.kind === "heading" ? `<h2>${esc(b.text)}</h2>` : `<p>${esc(b.text)}</p>`)).join("\n");
    const name = `page-${String(i + 1).padStart(4, "0")}.xhtml`;
    files.push(name);
    zip.file(`OEBPS/${name}`, `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><head><meta charset="utf-8"/><title>Page ${i + 1}</title></head><body><h3>Page ${i + 1}</h3>\n${body || "<p></p>"}</body></html>`);
  });
  const nav = files.map((f, i) => `<li><a href="${f}">Page ${i + 1}</a></li>`).join("");
  zip.file("OEBPS/nav.xhtml", `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>${esc(title)}</title></head><body><nav epub:type="toc"><h1>${esc(title)}</h1><ol>${nav}</ol></nav></body></html>`);
  const manifest = files.map((f, i) => `<item id="p${i}" href="${f}" media-type="application/xhtml+xml"/>`).join("");
  const spine = files.map((_, i) => `<itemref idref="p${i}"/>`).join("");
  zip.file("OEBPS/content.opf", `<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="bookid">${id}</dc:identifier><dc:title>${esc(title)}</dc:title><dc:language>en</dc:language><dc:creator>BookScan AI</dc:creator><meta property="dcterms:modified">${new Date().toISOString().slice(0, 19)}Z</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>${manifest}</manifest><spine>${spine}</spine></package>`);
  return zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function exportBook(format: "epub" | "docx", book: BookText) {
  const blob = format === "epub" ? await buildEpub(book) : await buildDocx(book);
  downloadBlob(blob, `${book.title || "Book"}.${format}`);
}
