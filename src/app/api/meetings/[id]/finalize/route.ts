import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { meetings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import {
  buildSpeakers,
  mergeChunkedTranscripts,
  summarizeMeeting,
  MeetingSpeaker,
  MeetingSummary,
  ChunkTranscript,
} from "@/lib/minutes";

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
 * Merge the per-chunk transcripts (posted by the client after each chunk has
 * been transcribed by /process), re-normalize speakers, build the speaker list
 * with clip pointers, write the AI summary and persist the finished minutes.
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
    const chunks: ChunkTranscript[] = Array.isArray(body.chunks) ? body.chunks : [];
    if (chunks.length === 0) {
      return NextResponse.json(
        { error: "No transcribed recording segments were provided. Please try again." },
        { status: 400 }
      );
    }

    await markStatus(meeting.id, "processing");

    // 1. Merge all chunks into one meeting timeline.
    const merged = mergeChunkedTranscripts(chunks);
    const finalDuration = Math.round(merged.durationSeconds);

    // 2. Build the speaker list, pointing clips at the chunk containing each
    //    speaker's first utterance (clips are per-chunk audio files).
    const speakers: MeetingSpeaker[] = buildSpeakers(merged.segments).map((sp) => {
      const clip = merged.clipMap.find((c) => c.label === sp.label);
      return {
        ...sp,
        clipUrl: clip?.clipUrl || null,
        clipStart: clip?.clipStart ?? sp.clipStart,
      };
    });

    // 3. Summarize.
    const summary: MeetingSummary = await summarizeMeeting(
      meeting.title,
      meeting.meetingDate,
      merged.segments,
      finalDuration
    );

    // 4. Persist. Keep the first chunk as the primary audioUrl, plus the full
    //    chunk list (used for per-speaker clip playback and blob cleanup).
    const persistedChunks = chunks.map((c) => ({
      url: c.url,
      name: c.name,
      durationSeconds: c.durationSeconds || 0,
    }));
    const primaryUrl = chunks[0]?.url || meeting.audioUrl || null;

    await db
      .update(meetings)
      .set({
        audioUrl: primaryUrl,
        audioName: meeting.audioName || chunks[0]?.name || null,
        audioChunksJson: JSON.stringify(persistedChunks),
        audioDurationSeconds: finalDuration,
        transcriptJson: JSON.stringify(merged.segments),
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
        title: meeting.title,
        meetingDate: meeting.meetingDate,
        audioUrl: primaryUrl,
        audioChunks: persistedChunks,
        audioDurationSeconds: finalDuration,
        transcript: merged.segments,
        speakers,
        summary,
        fullText: merged.fullText,
      },
    });
  } catch (error: any) {
    try {
      const { id } = await params;
      await markStatus(id, "failed", error?.message || "Processing failed. Please try again.");
    } catch {}
    console.error("Finalize meeting error:", error);
    return NextResponse.json({ error: error?.message || "Failed to finalize meeting minutes." }, { status: 500 });
  }
}

export const maxDuration = 60;