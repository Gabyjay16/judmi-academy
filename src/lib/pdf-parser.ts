/**
 * Helper to extract text from user uploaded files (text, markdown, pdf, docx, etc.)
 *
 * Plain-text files are read locally (cheap). PDFs and .docx files are sent to
 * /api/extract-text which parses them properly server-side and returns the real
 * text — no more binary "random numbers".
 */
const MAX_LOCAL_UPLOAD_BYTES = 4 * 1024 * 1024;

export interface ExtractResult {
  text: string;
  ok: boolean;
  message?: string;
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
    return await extractViaServer(file);
  }

  if (fileName.endsWith(".docx")) {
    return await extractViaServer(file);
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

async function extractViaServer(file: File): Promise<ExtractResult> {
  if (file.size > MAX_LOCAL_UPLOAD_BYTES) {
    return {
      text: "",
      ok: false,
      message: "This file is too large to extract text from (limit 4MB). Please paste the text directly.",
    };
  }

  try {
    const res = await fetch("/api/extract-text", {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "x-filename": file.name,
      },
      body: await file.arrayBuffer(),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && typeof data.text === "string" && data.text.trim()) {
      return { text: data.text, ok: true };
    }

    return {
      text: "",
      ok: false,
      message: data.error || "Could not extract text from this file. Please paste the text directly.",
    };
  } catch (e) {
    console.error("File text extraction failed:", e);
    return {
      text: "",
      ok: false,
      message: "Could not read that file right now. Please try again or paste the text directly.",
    };
  }
}