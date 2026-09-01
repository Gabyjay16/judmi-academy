import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { meetings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { transcribeMeetingAudio, buildSpeakers, summarizeMeeting, TranscriptSegment, MeetingSummary, MeetingSpeaker } from "@/lib/minutes";

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
    const { durationSeconds = 0 } = body;

    // Audio is uploaded straight to the browser from Vercel Blob (the 4.5MB
    // function body limit forbids base64-through-the-function). The client
    // saves the blob URL on the meeting row (PATCH) before calling this route.
    let audioUrl = meeting.audioUrl || null;
    if (typeof body.audioUrl === "string") audioUrl = body.audioUrl;

    if (!audioUrl) {
      return NextResponse.json(
        { error: "No audio recording was uploaded yet. Please try recording again." },
        { status: 400 }
      );
    }

    const audioRes = await fetch(audioUrl, { cache: "no-store" });
    if (!audioRes.ok) {
      throw new Error("Could not read the stored recording. Please try again.");
    }
    const audioBuffer = Buffer.from(await audioRes.arrayBuffer());

    await markStatus(meeting.id, "processing");

    // 1. Transcribe with timestamps + speaker clustering.
    const mimeType = mimeFromUrl(audioUrl) || "audio/webm";
    const { segments, durationSeconds: detectedDuration, fullText } = await transcribeMeetingAudio(
      audioBuffer,
      mimeType,
      meeting.title
    );

    const finalDuration = durationSeconds || detectedDuration;

    // 2. Build speaker list.
    const speakers: MeetingSpeaker[] = buildSpeakers(segments);

    // 3. Summarize.
    const summary: MeetingSummary = await summarizeMeeting(meeting.title, meeting.meetingDate, segments, finalDuration);

    // 4. Persist.
    await db
      .update(meetings)
      .set({
        audioUrl,
        audioName: meeting.audioName || null,
        audioDurationSeconds: Math.round(finalDuration),
        transcriptJson: JSON.stringify(segments),
        speakersJson: JSON.stringify(speakers),
        summaryJson: JSON.stringify(summary),
        status: "ready",
        error: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(meetings.id, meeting.id));

    return NextResponse.json({
      success: true,
      meeting: {
        id: meeting.id,
        status: "ready",
        audioUrl,
        audioName: meeting.audioName || null,
        audioDurationSeconds: Math.round(finalDuration),
        transcript: segments,
        speakers,
        summary,
        fullText,
      },
    });
  } catch (error: any) {
    try {
      const { id } = await params;
      await markStatus(id, "failed", error?.message || "Processing failed. Please try again.");
    } catch {}
    console.error("Process meeting error:", error);
    return NextResponse.json({ error: error?.message || "Failed to process meeting recording." }, { status: 500 });
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