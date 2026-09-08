/**
 * Helper to extract text from user uploaded files (text, markdown, pdf, docx, etc.)
 *
 * Extraction runs entirely in the browser so it is NOT limited by the
 * serverless 4.5MB request-body cap — lecture-note PDFs up to 30MB work.
 */
import * as pdfjs from "pdfjs-dist";
import mammoth from "mammoth/mammoth.browser";

if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

const MAX_UPLOAD_BYTES = 30 * 1024 * 1024; // 30MB

export interface ExtractResult {
  text: string;
  ok: boolean;
  message?: string;
}

async function extractPdfTextClient(file: File): Promise<string> {
  const data = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data }).promise;
  try {
    const parts: string[] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const lines: string[] = [];
      let lastY: number | null = null;
      let line = "";
      for (const item of content.items as any[]) {
        if (typeof item.str !== "string") continue;
        const y = item.transform?.[5] as number | undefined;
        if (lastY !== null && typeof y === "number" && Math.abs(y - lastY) > 1.5 && line) {
          lines.push(line);
          line = "";
        }
        if (typeof y === "number") lastY = y;
        line += item.str;
      }
      if (line) lines.push(line);
      parts.push(lines.join("\n"));
    }
    return parts.join("\n\n");
  } finally {
    try {
      await doc.destroy();
    } catch {}
  }
}

async function extractDocxTextClient(file: File): Promise<string> {
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return result.value || "";
}

export async function extractTextFromFile(file: File): Promise<ExtractResult> {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  if (
    fileType.includes("text") ||
    fileType.startsWith("application/json") ||
    fileName.endsWith(".txt") ||
    fileName.endsWith(".md") ||
    fileName.endsWith(".csv") ||
    fileName.endsWith(".json")
  ) {
    return { text: await file.text(), ok: true };
  }

  if (fileName.endsWith(".pdf") || fileType.includes("pdf")) {
    if (file.size > MAX_UPLOAD_BYTES) {
      return {
        text: "",
        ok: false,
        message: "This PDF is larger than 30MB. Please use a smaller file or paste the text directly.",
      };
    }
    try {
      const text = await extractPdfTextClient(file);
      if (!text.trim()) {
        return {
          text: "",
          ok: false,
          message:
            "No readable text was found in this PDF (it may be a scanned or image-only file). Please paste the text directly.",
        };
      }
      return { text, ok: true };
    } catch (e) {
      console.error("PDF text extraction failed:", e);
      return {
        text: "",
        ok: false,
        message: "Could not read that PDF. Please try again or paste the text directly.",
      };
    }
  }

  if (fileName.endsWith(".docx")) {
    if (file.size > MAX_UPLOAD_BYTES) {
      return {
        text: "",
        ok: false,
        message: "This Word document is larger than 30MB. Please use a smaller file or paste the text directly.",
      };
    }
    try {
      const text = await extractDocxTextClient(file);
      if (!text.trim()) {
        return {
          text: "",
          ok: false,
          message: "No readable text was found in this document. Please paste the text directly.",
        };
      }
      return { text, ok: true };
    } catch (e) {
      console.error("DOCX text extraction failed:", e);
      return {
        text: "",
        ok: false,
        message: "Could not read that Word document. Please try again or paste the text directly.",
      };
    }
  }

  if (fileName.endsWith(".doc")) {
    return {
      text: "",
      ok: false,
      message:
        "Old .doc files can't be read automatically. Please re-save the file as .docx or .pdf, or paste the text directly.",
    };
  }

  return { text: await file.text(), ok: true };
}