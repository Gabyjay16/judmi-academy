"use client";

import * as pdfjs from "pdfjs-dist";

if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

const MAX_PDF_PAGES = 5;

/**
 * Renders a PDF into PNG data-URL images (max 5 pages) so uploaded PDFs can be
 * treated like photos anywhere the app expects images.
 */
export async function pdfFileToImages(file: File, maxPages: number = MAX_PDF_PAGES): Promise<string[]> {
  const data = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data }).promise;
  try {
    const out: string[] = [];
    const pageCount = Math.min(doc.numPages, maxPages);
    for (let p = 1; p <= pageCount; p++) {
      const page = await doc.getPage(p);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(2, 1600 / baseViewport.width);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      out.push(canvas.toDataURL("image/png"));
      page.cleanup();
    }
    return out;
  } finally {
    try {
      await doc.destroy();
    } catch {}
  }
}

export function isPdfFile(file: File): boolean {
  return file.type.includes("pdf") || file.name.toLowerCase().endsWith(".pdf");
}