import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { initDatabase } from "@/db";
import { getCurrentUser } from "@/lib/auth";

const ALLOWED_AUDIO_TYPES = [
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/x-m4a",
  "audio/*",
];

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    await initDatabase();

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const user = await getCurrentUser();
        if (!user) {
          throw new Error("You must be logged in to upload a voice note.");
        }
        return {
          allowedContentTypes: ALLOWED_AUDIO_TYPES,
          maximumSizeInBytes: 15 * 1024 * 1024, // 15MB voice note cap
          addRandomSuffix: true,
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error: any) {
    const raw = String(error?.message || error || "");
    if (/token|BLOB_READ_WRITE_TOKEN/i.test(raw)) {
      return NextResponse.json(
        { error: "Storage is not configured yet. Add a Vercel Blob store token as BLOB_READ_WRITE_TOKEN." },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: raw }, { status: 400 });
  }
}

export const maxDuration = 60;
