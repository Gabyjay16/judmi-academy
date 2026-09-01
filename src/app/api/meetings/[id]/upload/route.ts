import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { meetings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

function canAccess(currentUser: any, m: any): boolean {
  if (!currentUser) return false;
  if (currentUser.role === "admin") return true;
  if (currentUser.role === "org_admin" && m.orgId) {
    return m.orgId === (currentUser.orgId || null);
  }
  return m.ownerUserId === currentUser.id;
}

const ALLOWED_AUDIO_TYPES = [
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/x-m4a",
];

// Browser uploads go straight to Vercel Blob (bypassing the 4.5MB function
// body limit). Auth is enforced in onBeforeGenerateToken — NOT at the top of
// the handler — because the store also calls this route with a
// `blob.upload-completed` webhook (no user session) which we must not block.
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    await initDatabase();

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const meetingId =
          typeof clientPayload === "string"
            ? clientPayload
            : String(pathname.split("/")[2] || "");

        const rows = meetingId
          ? await db.select().from(meetings).where(eq(meetings.id, meetingId)).limit(1)
          : [];
        const meeting = rows[0];

        if (!meeting || !canAccess(await getCurrentUser(), meeting)) {
          throw new Error("Not authorized to upload to this meeting.");
        }

        return {
          allowedContentTypes: ALLOWED_AUDIO_TYPES,
          maximumSizeInBytes: 20 * 1024 * 1024, // 20MB — just above the 15MB processing cap
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ meetingId: meeting.id }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Redundant with the explicit PATCH the client sends, but keeps the
        // DB row accurate even if the client disconnects right after upload.
        try {
          const payload = tokenPayload ? JSON.parse(tokenPayload) : null;
          if (payload?.meetingId) {
            await initDatabase();
            await db
              .update(meetings)
              .set({
                audioUrl: blob.url,
                audioName: blob.pathname.split("/").pop() || null,
                updatedAt: new Date().toISOString(),
              })
              .where(eq(meetings.id, payload.meetingId));
          }
        } catch {}
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error: any) {
    console.error("Meeting upload token error:", error);
    const raw = String(error?.message || error || "");
    if (/token|BLOB_READ_WRITE_TOKEN/i.test(raw)) {
      return NextResponse.json(
        {
          error:
            "Storage is not configured yet. Add a Vercel Blob store token as BLOB_READ_WRITE_TOKEN in the project environment variables, then try again.",
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: raw }, { status: 400 });
  }
}

export const maxDuration = 60;