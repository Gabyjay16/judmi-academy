import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { meetings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { transcribeMeetingAudio } from "@/lib/minutes";

function canAccess(currentUser: any, m: any): boolean {
  if (!currentUser) return false;
  if (currentUser.role === "admin") return true;
  if (currentUser.role === "org_admin" && m.orgId) {
    return m.orgId === (currentUser.orgId || null);
  }
  return m.ownerUserId === currentUser.id;
}

async function markStatus(meetingId: string, status: string, error?: string | null) {
  await db
    .update(meetings)
    .set({ status, error: error ?? null, updatedAt: new Date().toISOString() })
    .where(eq(meetings.id, meetingId));
}

/**
 * Transcribe ONE chunk of a meeting recording. Long meetings are recorded in
 * ~5-minute chunks (each kept well under the 15MB/20MB AI limits), so a single
 * serverless invocation stays under the 60s (Hobby) function ceiling. The
 * client calls this once per chunk, then POSTs the finished /finalize route to
 * merge, summarize and persist the minutes.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.orgId) {
      return NextResponse.json(
        { error: "This feature is only available to teachers registered under a school." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const rows = await db.select().from(meetings).where(eq(meetings.id, id)).limit(1);
    if (rows.length === 0) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }
    const meeting = rows[0];
    if (!canAccess(currentUser, meeting)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    let chunkUrl: string | null = typeof body.chunkUrl === "string" ? body.chunkUrl : null;
    let chunkName: string | null = typeof body.chunkName === "string" ? body.chunkName : null;

    // Legacy single-file recordings: process the meeting's stored audio as one chunk.
    if (!chunkUrl && meeting.audioUrl) {
      chunkUrl = meeting.audioUrl;
      chunkName = meeting.audioName || null;
    }

    if (!chunkUrl) {
      return NextResponse.json(
        { error: "No audio recording was uploaded yet. Please try recording again." },
        { status: 400 }
      );
    }

    const audioRes = await fetch(chunkUrl, { cache: "no-store" });
    if (!audioRes.ok) {
      throw new Error("Could not read the stored recording segment. Please try again.");
    }
    const audioBuffer = Buffer.from(await audioRes.arrayBuffer());

    await markStatus(meeting.id, "processing");

    const mimeType = mimeFromUrl(chunkUrl) || "audio/webm";
    const { segments } = await transcribeMeetingAudio(audioBuffer, mimeType, meeting.title);

    return NextResponse.json({
      success: true,
      chunk: {
        url: chunkUrl,
        name: chunkName || "audio",
        segments,
      },
    });
  } catch (error: any) {
    try {
      const { id } = await params;
      await markStatus(id, "failed", error?.message || "Processing failed. Please try again.");
    } catch {}
    console.error("Process meeting chunk error:", error);
    return NextResponse.json({ error: error?.message || "Failed to process the meeting recording." }, { status: 500 });
  }
}

function mimeFromUrl(url: string): string | null {
  const m = String(url).toLowerCase();
  if (m.includes(".mp3")) return "audio/mpeg";
  if (m.includes(".m4a") || m.includes(".mp4")) return "audio/mp4";
  if (m.includes(".wav")) return "audio/wav";
  if (m.includes(".ogg") || m.includes(".opus")) return "audio/ogg";
  if (m.includes(".flac")) return "audio/flac";
  if (m.includes(".aac")) return "audio/aac";
  if (m.includes(".webm")) return "audio/webm";
  return null;
}

export const maxDuration = 60;