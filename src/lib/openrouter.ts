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

function buildImageUrlFromBase64(base64: string): string {
  const clean = base64.replace(/^data:image\/[a-z]+;base64,/, "");
  return `data:image/jpeg;base64,${clean}`;
}

/**
 * Call OpenRouter's chat completions API with optional multi-modal (image) content.
 * Returns the assistant text content.
 */
export async function callOpenRouter(
  prompt: string,
  options: OpenRouterOptions = {},
  images?: string[]
): Promise<string> {
  const apiKey = getOpenRouterKey();
  if (!apiKey) {
    throw new Error("OpenRouter API key is not configured. Set OPENROUTER_API_KEY.");
  }

  const model = options.model || "google/gemini-2.5-flash";

  const parts: ContentPart[] = [];
  for (const image of images || []) {
    parts.push({
      type: "image_url",
      image_url: { url: buildImageUrlFromBase64(image) },
    });
  }
  parts.push({ type: "text", text: prompt });

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
      response_format:
        options.responseFormat === "json" ? { type: "json_object" } : undefined,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text().catch(() => "");
    let message = `OpenRouter API returned status ${response.status}`;
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
 * Returns true when the configured key looks like an OpenRouter key.
 */
export function isOpenRouterKeyConfigured(): boolean {
  const key = getOpenRouterKey();
  return Boolean(key && key !== "your_api_key_here" && key !== "your_gemini_api_key_here");
}
