import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";

export type PdfOptions = {
  title: string;
  pageSize: "a4" | "original";
  orientation: "portrait" | "landscape" | "auto";
  marginMm: number;
  pageNumbers: boolean;
};

export type PdfPage = { jpeg: Uint8Array; width: number; height: number; text?: string };

const MM = 72 / 25.4;
const A4 = [595.28, 841.89];

// Standard PDF fonts only cover Latin; non-Latin characters (e.g. Hindi) are kept
// out of the invisible text layer so the PDF stays valid. OCR text is still shown in-app.
function latinOnly(s: string) {
  return s.replace(/[^\x20-\x7E\u00A0-\u00FF\n]/g, " ");
}

export async function buildPdf(pages: PdfPage[], opts: PdfOptions, onProgress: (f: number) => void, signal?: AbortSignal) {
  const doc = await PDFDocument.create();
  doc.setTitle(opts.title);
  doc.setCreator("BookScan AI");
  doc.setProducer("BookScan AI");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const margin = opts.marginMm * MM;

  for (let i = 0; i < pages.length; i++) {
    if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
    const p = pages[i];
    const img = await doc.embedJpg(p.jpeg);
    const imgLandscape = p.width > p.height;
    let pw: number, ph: number;
    if (opts.pageSize === "a4") {
      const land = opts.orientation === "landscape" || (opts.orientation === "auto" && imgLandscape);
      [pw, ph] = land ? [A4[1], A4[0]] : A4;
    } else {
      // Original size at 200 dpi equivalent
      const s = 72 / 200;
      pw = p.width * s + margin * 2;
      ph = p.height * s + margin * 2;
      if (opts.orientation === "landscape" && pw < ph) [pw, ph] = [ph, pw];
      if (opts.orientation === "portrait" && pw > ph) [pw, ph] = [ph, pw];
    }
    const page = doc.addPage([pw, ph]);
    const footer = opts.pageNumbers ? 18 : 0;
    const aw = pw - margin * 2, ah = ph - margin * 2 - footer;
    const scale = Math.min(aw / p.width, ah / p.height);
    const dw = p.width * scale, dh = p.height * scale;
    const x = (pw - dw) / 2, y = footer + margin + (ah - dh) / 2;

    if (p.text) {
      // Invisible, searchable text layer behind the image
      const lines = latinOnly(p.text).split("\n").filter((l) => l.trim());
      const lh = Math.max(4, Math.min(14, dh / Math.max(1, lines.length)));
      lines.forEach((line, li) => {
        const size = lh * 0.85;
        const width = font.widthOfTextAtSize(line, size) || 1;
        page.drawText(line, {
          x, y: y + dh - (li + 1) * lh, size, font, opacity: 0,
          // stretch to page width so selection roughly matches the line
          ...(width > dw ? { size: size * (dw / width) } : {}),
        });
      });
    }
    page.drawImage(img, { x, y, width: dw, height: dh, rotate: degrees(0) });
    if (opts.pageNumbers) {
      const label = `${i + 1}`;
      page.drawText(label, { x: pw / 2 - font.widthOfTextAtSize(label, 9) / 2, y: margin / 2 + 4, size: 9, font, color: rgb(0.35, 0.28, 0.18) });
    }
    onProgress((i + 1) / pages.length);
    await new Promise((r) => setTimeout(r, 0));
  }
  return await doc.save();
}
