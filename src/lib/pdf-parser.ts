/**
 * Helper to extract text from user uploaded files (text, markdown, pdf, etc.)
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  if (fileType.includes("text") || fileName.endsWith(".txt") || fileName.endsWith(".md") || fileName.endsWith(".csv") || fileName.endsWith(".json")) {
    return await file.text();
  }

  if (fileName.endsWith(".pdf") || fileType.includes("pdf")) {
    try {
      // In modern browsers / serverless, we can read arrayBuffer and extract text chunks or clean string streams
      const buffer = await file.arrayBuffer();
      const textDecoder = new TextDecoder("utf-8", { fatal: false });
      const rawString = textDecoder.decode(buffer);

      // Extract readable text chunks from PDF stream
      const textMatches = rawString.match(/\(([^\(\)\\]*(?:\\.[^\(\)\\]*)*)\)\s*T[jJ]/g);
      if (textMatches && textMatches.length > 0) {
        const extracted = textMatches
          .map((m) => m.replace(/^[\(\s]+/, "").replace(/[\)\s*T[jJ]]+$/, "").replace(/\\/g, ""))
          .join(" ")
          .trim();
        if (extracted.length > 50) return extracted;
      }

      // Fallback text extraction from raw string
      const cleanText = rawString
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, " ")
        .replace(/obj[\s\S]*?endobj/g, " ")
        .replace(/stream[\s\S]*?endstream/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (cleanText.length > 100) {
        return cleanText.slice(0, 10000);
      }
      return "Could not automatically parse PDF text. Please copy and paste the text contents into the note box.";
    } catch (e) {
      console.error("PDF parse error:", e);
      return "Error reading PDF file. Please paste the notes text directly.";
    }
  }

  // Generic fallback
  return await file.text();
}
