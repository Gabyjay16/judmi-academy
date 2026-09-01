declare module "pdfjs-dist/build/pdf.worker.mjs" {
  export const WorkerMessageHandler: unknown;
}

declare module "pdfjs-dist/legacy/build/pdf.mjs" {
  export function getDocument(params: { data: Uint8Array }): {
    promise: Promise<{
      numPages: number;
      getPage(pageNumber: number): Promise<{
        getTextContent(): Promise<{ items: Array<{ str?: string; transform?: number[] }> }>;
      }>;
      destroy(): Promise<void>;
    }>;
  };
}

declare module "mammoth" {
  export function extractRawText(
    input: { buffer: ArrayBuffer | Uint8Array } | { path: string }
  ): Promise<{ value: string; messages: unknown[] }>;
  export function extractRawText(
    input: { buffer: ArrayBuffer | Uint8Array } | { path: string },
    options?: Record<string, unknown>
  ): Promise<{ value: string; messages: unknown[] }>;
}