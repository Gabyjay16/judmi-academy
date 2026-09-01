declare module "mammoth" {
  export function extractRawText(
    input: { buffer: ArrayBuffer | Uint8Array } | { path: string }
  ): Promise<{ value: string; messages: unknown[] }>;
  export function extractRawText(
    input: { buffer: ArrayBuffer | Uint8Array } | { path: string },
    options?: Record<string, unknown>
  ): Promise<{ value: string; messages: unknown[] }>;
}

declare module "mammoth/mammoth.browser" {
  export function extractRawText(
    input: { arrayBuffer: Promise<ArrayBuffer> | ArrayBuffer }
  ): Promise<{ value: string; messages: unknown[] }>;
}