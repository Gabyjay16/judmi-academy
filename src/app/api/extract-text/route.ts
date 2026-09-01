import { NextRequest, NextResponse } from "next/server";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import * as pdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs";
import mammoth from "mammoth";

// In serverless/bundled runtime pdf.js can't dynamically load its worker file,
// so we give it the worker module directly (documented fake-worker override).
(globalThis as any).pdfjsWorker = pdfjsWorker;

const MAX_FILE_BYTES = 4 * 1024 * 1024; // keep under the serverless body cap
const MAX_TEXT_CHARS = 200_000;

function detectKind(fileName: string): "pdf" | "docx" | "text" | "doc" | null {
  const name = fileName.toLowerCase();
  if (name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".docx")) return "docx";
  if (name.endsWith(".doc")) return "doc";
  if (
    name.endsWith(".txt") ||
    name.endsWith(".md") ||
    name.endsWith(".csv") ||
    name.endsWith(".json")
  ) {
    return "text";
  }
  return null;
}

async function extractPdfText(buffer: Uint8Array): Promise<string> {
  const doc = await getDocument({ data: buffer }).promise;
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
        if (lastY !== null && y !== undefined && Math.abs(y - lastY) > 1.5 && line) {
          lines.push(line);
          line = "";
        }
        if (y !== undefined) lastY = y;
        line += item.str;
      }
      if (line) lines.push(line);
      parts.push(lines.join("\n"));
    }
    return parts.join("\n\n").slice(0, MAX_TEXT_CHARS);
  } finally {
    try {
      await doc.destroy();
    } catch {}
  }
}

export async function POST(req: NextRequest) {
  try {
    const fileName = req.headers.get("x-filename") || "file";
    const contentLength = Number(req.headers.get("content-length") || 0);

    if (contentLength > MAX_FILE_BYTES) {
      return NextResponse.json(
        {
          error:
            "This file is too large to extract text from (limit 4MB). Please split it or paste the text directly.",
        },
        { status: 413 }
      );
    }

    const kind = detectKind(fileName);
    if (!kind) {
      return NextResponse.json(
        {
          error:
            "Unsupported file type. Please upload a .pdf, .docx, .txt or .md file, or paste the text directly.",
        },
        { status: 400 }
      );
    }

    if (kind === "doc") {
      return NextResponse.json(
        {
          error:
            "Old .doc files can't be read automatically. Please re-save the file as .docx or .pdf, or paste the text directly.",
        },
        { status: 400 }
      );
    }

    const buffer = new Uint8Array(await req.arrayBuffer());
    if (buffer.byteLength === 0) {
      return NextResponse.json({ error: "The uploaded file is empty." }, { status: 400 });
    }

    let text = "";
    if (kind === "pdf") {
      text = await extractPdfText(buffer);
    } else if (kind === "docx") {
      const result = await mammoth.extractRawText({ buffer });
      text = (result.value || "").slice(0, MAX_TEXT_CHARS);
    } else {
      text = new TextDecoder("utf-8", { fatal: false })
        .decode(buffer)
        .replace(/^\uFEFF/, "")
        .slice(0, MAX_TEXT_CHARS);
    }

    if (!text.trim()) {
      return NextResponse.json(
        {
          error:
            "Could not extract any readable text from this file (it may be a scanned/image-only PDF). Please paste the text directly.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("Extract text error:", error);
    return NextResponse.json(
      {
        error:
          "Sorry, we couldn't read that file. Please try a different format (.pdf, .docx, .txt) or paste the text directly.",
      },
      { status: 500 }
    );
  }
}

export const maxDuration = 60;