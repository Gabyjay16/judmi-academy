import { NextRequest, NextResponse } from "next/server";
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const rows = await db.select().from(meetings).where(eq(meetings.id, id)).limit(1);
    if (rows.length === 0) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }
    const m = rows[0];
    if (!canAccess(currentUser, m)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      meeting: {
        id: m.id,
        title: m.title,
        meetingDate: m.meetingDate,
        audioName: m.audioName,
        audioUrl: m.audioUrl,
        audioChunks: JSON.parse(m.audioChunksJson || "[]"),
        audioDurationSeconds: m.audioDurationSeconds,
        transcript: JSON.parse(m.transcriptJson || "[]"),
        speakers: JSON.parse(m.speakersJson || "[]"),
        summary: m.summaryJson ? JSON.parse(m.summaryJson) : null,
        status: m.status,
        error: m.error,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Get meeting error:", error);
    return NextResponse.json({ error: error?.message || "Failed to load meeting." }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const rows = await db.select().from(meetings).where(eq(meetings.id, id)).limit(1);
    if (rows.length === 0) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }
    const m = rows[0];
    if (!canAccess(currentUser, m)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (typeof body.title === "string") updates.title = body.title.trim() || m.title;
    if (typeof body.meetingDate === "string") updates.meetingDate = body.meetingDate.slice(0, 10);
    if (typeof body.audioUrl === "string") updates.audioUrl = body.audioUrl;
    if (typeof body.audioName === "string") updates.audioName = body.audioName;
    if (body.audioChunks && Array.isArray(body.audioChunks)) {
      updates.audioChunksJson = JSON.stringify(body.audioChunks);
    }
    if (typeof body.audioDurationSeconds === "number" && body.audioDurationSeconds >= 0) {
      updates.audioDurationSeconds = Math.round(body.audioDurationSeconds);
    }
    if (body.speakers && Array.isArray(body.speakers)) updates.speakersJson = JSON.stringify(body.speakers);
    if (body.summary) updates.summaryJson = JSON.stringify(body.summary);

    await db.update(meetings).set(updates).where(eq(meetings.id, id));

    const updated = await db.select().from(meetings).where(eq(meetings.id, id)).limit(1);
    const d = updated[0];
    return NextResponse.json({
      success: true,
      meeting: {
        id: d.id,
        title: d.title,
        meetingDate: d.meetingDate,
        speakers: JSON.parse(d.speakersJson || "[]"),
        summary: d.summaryJson ? JSON.parse(d.summaryJson) : null,
        status: d.status,
      },
    });
  } catch (error: any) {
    console.error("Update meeting error:", error);
    return NextResponse.json({ error: error?.message || "Failed to update meeting." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const rows = await db.select().from(meetings).where(eq(meetings.id, id)).limit(1);
    if (rows.length === 0) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }
    const m = rows[0];
    if (!canAccess(currentUser, m)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Best-effort delete the stored audio blobs (chunked recordings have many).
    const urls = new Set<string>();
    if (m.audioUrl) urls.add(m.audioUrl);
    try {
      const parsed = JSON.parse(m.audioChunksJson || "[]");
      if (Array.isArray(parsed)) for (const c of parsed) if (c?.url) urls.add(c.url);
    } catch {}
    if (urls.size > 0) {
      try {
        const { del } = await import("@vercel/blob");
        await Promise.all(Array.from(urls).map((u) => del(u).catch(() => {})));
      } catch {}
    }

    await db.delete(meetings).where(eq(meetings.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete meeting error:", error);
    return NextResponse.json({ error: error?.message || "Failed to delete meeting." }, { status: 500 });
  }
}