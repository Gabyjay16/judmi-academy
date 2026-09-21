type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

interface OpenRouterOptions {
  model?: string;
  temperature?: number;
  topP?: number;
  responseFormat?: "text" | "json";
}

const REQUIRED_ROLE_KEY = "sk-or-v1-";

const META_AI_URL = "https://api.meta.ai/v1/chat/completions";
const META_AI_MODEL = process.env.META_AI_MODEL || "muse-spark-1.1";

/**
 * Resolve the Meta AI Model API key from the environment.
 * This is the primary key — used first for every chat-completions call.
 */
export function getMetaAIKey(): string {
  const key =
    process.env.META_AI_API_KEY ||
    process.env.MODEL_API_KEY ||
    process.env.NEXT_PUBLIC_META_AI_API_KEY ||
    "";
  return key.trim();
}

/**
 * Resolve the OpenRouter API key from the environment.
 * Supports either OPENROUTER_API_KEY or GEMINI_API_KEY for backward compatibility.
 */
export function getOpenRouterKey(): string {
  const key =
    process.env.OPENROUTER_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_OPENROUTER_API_KEY ||
    "";
  return key.trim();
}

/**
 * The primary AI key — Meta Model API first, OpenRouter as fallback.
 */
export function getPrimaryAIKey(): string {
  return getMetaAIKey() || getOpenRouterKey();
}

function buildImageUrlFromBase64(base64: string): string {
  const clean = base64.replace(/^data:image\/[a-z]+;base64,/, "");
  return `data:image/jpeg;base64,${clean}`;
}

/**
 * Call a chat-completions endpoint (OpenAI-compatible). Returns the assistant text content.
 */
async function chatComplete(
  url: string,
  apiKey: string,
  model: string,
  parts: ContentPart[],
  options: OpenRouterOptions
): Promise<string> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: parts }],
      temperature: options.temperature ?? 0.4,
      top_p: options.topP ?? 0.95,
      ...(url === META_AI_URL ? { reasoning_effort: "minimal" } : {}),
      response_format:
        options.responseFormat === "json" ? { type: "json_object" } : undefined,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text().catch(() => "");
    let message = `AI API returned status ${response.status}`;
    try {
      const parsed = JSON.parse(errorData);
      message = parsed?.error?.message || message;
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "";
}

/**
 * Call Meta AI Model API first (primary provider); if it is not configured
 * or the call fails, fall back to OpenRouter. Returns the assistant text.
 */
export async function callOpenRouter(
  prompt: string,
  options: OpenRouterOptions = {},
  images?: string[]
): Promise<string> {
  const parts: ContentPart[] = [];
  for (const image of images || []) {
    parts.push({
      type: "image_url",
      image_url: { url: buildImageUrlFromBase64(image) },
    });
  }
  parts.push({ type: "text", text: prompt });

  const metaKey = getMetaAIKey();
  if (metaKey) {
    try {
      const metaModel = options.model?.startsWith("meta/")
        ? options.model.slice("meta/".length)
        : META_AI_MODEL;
      return await chatComplete(META_AI_URL, metaKey, metaModel, parts, options);
    } catch (error) {
      const openRouterKey = getOpenRouterKey();
      if (openRouterKey) {
        console.warn("Meta AI call failed, falling back to OpenRouter:", error);
      } else {
        throw error;
      }
    }
  }

  const apiKey = getOpenRouterKey();
  if (!apiKey) {
    throw new Error("AI API key is not configured. Set META_AI_API_KEY or OPENROUTER_API_KEY.");
  }

  const model = options.model || "google/gemini-2.5-flash";
  return chatComplete("https://openrouter.ai/api/v1/chat/completions", apiKey, model, parts, options);
}

/**
 * Returns true when a usable AI key is configured (Meta AI primary, or OpenRouter).
 */
export function isOpenRouterKeyConfigured(): boolean {
  const key = getPrimaryAIKey();
  return Boolean(key && key !== "your_api_key_here" && key !== "your_gemini_api_key_here");
}

/**
 * Field definitions provided by the user for AI data extraction.
 */
export interface ExtractField {
  name: string;
  type: string; // e.g. "text", "number", "email", "matricule", "date"
  instruction?: string; // optional guidance to the AI, e.g. from "(...)" after the field name
}

/**
 * Use a vision-capable model to read snapped document page(s) and extract the
 * requested fields for each record (row) found in the document. Returns an
 * array of objects keyed by field name.
 */
export async function extractFieldsFromImages(
  images: string[],
  fields: ExtractField[],
  title: string,
  singleRecord = false
): Promise<Record<string, string>[]> {
  if (!isOpenRouterKeyConfigured()) {
    throw new Error("AI API key is not configured. Set META_AI_API_KEY or OPENROUTER_API_KEY.");
  }
  if (fields.length === 0) {
    throw new Error("You must define at least one data field to extract.");
  }

  const fieldLines = fields
    .map((f, i) => {
      const instruction = f.instruction?.trim() ? ` — ${f.instruction.trim()}` : "";
      return `${i + 1}. "${f.name}" (${f.type || "text"})${instruction}`;
    })
    .join("\n");

  const overview = singleRecord
    ? `These ${images.length} photographed page(s) of a document (${title || "the document"}) together represent EXACTLY ONE record (ONE row).`
    : `I am providing ${images.length} photographed page(s) of a document (${title || "the document"}). These pages collectively form ONE document that may contain MULTIPLE records (e.g. multiple students, multiple people, multiple entries).`;

  const extractInstruction = singleRecord
    ? `Extract the requested fields for this single record and return an array containing EXACTLY ONE object. Do not invent extra records.`
    : `Extract the requested fields for EVERY record found in the document pages.`;

  const prompt = `You are a precise data extraction engine for academic documents.

${overview}

${extractInstruction}

Requested fields (extract exactly these):
${fieldLines}

Rules:
- Read all text carefully, including handwritten and printed content.
${singleRecord
  ? "- Combine the information across all the pages you are given into ONE record."
  : "- Each distinct record should become one object with keys matching the EXACT field names listed above."}
- If a field is not present/readable, set it to an empty string "".
- Detect and preserve the natural grouping (e.g. a matricule belongs to the same row as its name).
- Normalize number fields to their numeric string form.
- Do NOT invent or guess data that is not in the document.

Respond with ONLY a valid JSON array, no markdown code fences, no extra text:
[
  { "${fields[0]?.name || "field"}": "value", ... }
]`;

  const raw = await callOpenRouter(prompt, {
    model: "google/gemini-2.5-flash",
    temperature: 0.1,
    responseFormat: "json",
  }, images);

  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const parsed = JSON.parse(cleaned) as Array<Record<string, string>>;
  if (!Array.isArray(parsed)) {
    throw new Error("AI did not return a valid list of extracted records.");
  }

  const slice = singleRecord ? parsed.slice(0, 1) : parsed;
  const normalized = slice.map((row) => {
    const out: Record<string, string> = {};
    for (const f of fields) {
      const val = row ? row[f.name] : undefined;
      out[f.name] = (val === undefined || val === null) ? "" : String(val).trim();
    }
    return out;
  });

  return normalized;
}

export interface PlagiarismAnalysis {
  similarityPercent: number;
  aiPercent: number;
  summary: string;
  flags: { sample: string; reason: string }[];
}

/**
 * Screen a student's text for plagiarism/likely-copying heuristics and likely
 * AI-generated writing. This is a heuristic authenticity estimate (no web
 * corpus lookup) — cheap/fast on a Flash model, conservative by default.
 */
export async function analyzePlagiarism(text: string): Promise<PlagiarismAnalysis> {
  const raw = await callOpenRouter(
    `You are an academic integrity screening engine. Analyze the student's text below and return ONLY valid JSON.

Return this exact shape:
{
  "similarityPercent": 0-100,
  "aiPercent": 0-100,
  "summary": "one or two plain-language sentences explaining the verdict",
  "flags": [
    { "sample": "short verbatim excerpt from the text", "reason": "why it looks copied or AI-written" }
  ]
}

Scoring guidance:
- similarityPercent: how much of the text looks unoriginal/recycled for a student submission. Look for externally quoted or templated blocks, distinctive phrase-for-phrase duplication, overused boilerplate/filler, or abrupt style shifts suggesting pasted content. This is a heuristic estimate, NOT a web-search match. 0 = reads like a student's own writing; 100 = reads like pasted/template text.
- aiPercent: how strongly the writing shows typical AI-generation markers (uniform polished sentence rhythm, repeated transitions like "Moreover/Furthermore/In conclusion", generic balanced structure, little personal voice or concrete specifics). Only raise this high when evidence is clear; formal academic writing is NOT automatically AI.
- Be conservative: prefer lower scores when unsure.
- flags: up to 6 specific examples (short verbatim sample + concise reason). Use an empty array if nothing stands out.

Rules: integers 0-100 only, no markdown, no code fences.

STUDENT TEXT:
"""${text.slice(0, 60000)}"""`,
    { model: "google/gemini-3.7-flash", temperature: 0.2, responseFormat: "json" }
  );

  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const clamp = (n: unknown) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
  try {
    const parsed = JSON.parse(cleaned);
    const flags = Array.isArray(parsed?.flags)
      ? parsed.flags
          .map((f: any) => ({
            sample: String(f?.sample || "").slice(0, 400),
            reason: String(f?.reason || ""),
          }))
          .filter((f: { sample: string; reason: string }) => f.sample || f.reason)
          .slice(0, 8)
      : [];
    return {
      similarityPercent: clamp(parsed?.similarityPercent),
      aiPercent: clamp(parsed?.aiPercent),
      summary: String(parsed?.summary || "").trim() || "Analysis complete.",
      flags,
    };
  } catch {
    return { similarityPercent: 0, aiPercent: 0, summary: "Analysis complete.", flags: [] };
  }
}
