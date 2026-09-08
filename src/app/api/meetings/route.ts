import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { meetings } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { generateId } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.orgId) {
      return NextResponse.json(
        { error: "This feature is only available to teachers registered under a school." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const title = (body.title || "").toString().trim() || "Meeting Minutes";
    const meetingDate = body.meetingDate ? String(body.meetingDate).slice(0, 10) : new Date().toISOString().slice(0, 10);

    const id = generateId();
    const now = new Date().toISOString();
    await db.insert(meetings).values({
      id,
      ownerUserId: currentUser.id,
      orgId: currentUser.orgId,
      title,
      meetingDate,
      status: "recording",
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      success: true,
      meeting: { id, title, meetingDate, status: "recording" },
    });
  } catch (error: any) {
    console.error("Create meeting error:", error);
    return NextResponse.json({ error: error?.message || "Failed to create meeting." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.orgId) {
      return NextResponse.json(
        { error: "This feature is only available to teachers registered under a school." },
        { status: 403 }
      );
    }

    let rows = await db.select().from(meetings).orderBy(desc(meetings.createdAt));

    const isOrgAdmin = currentUser.role === "org_admin" || currentUser.role === "admin";
    if (!isOrgAdmin) {
      rows = rows.filter((m) => m.ownerUserId === currentUser.id);
    } else {
      rows = rows.filter((m) => m.orgId === currentUser.orgId);
    }

    const list = rows.map((m) => ({
      id: m.id,
      title: m.title,
      meetingDate: m.meetingDate,
      status: m.status,
      error: m.error,
      audioDurationSeconds: m.audioDurationSeconds,
      ownerUserId: m.ownerUserId,
      segmentCount: (() => {
        try {
          const arr = JSON.parse(m.transcriptJson || "[]");
          return Array.isArray(arr) ? arr.length : 0;
        } catch {
          return 0;
        }
      })(),
      speakerCount: (() => {
        try {
          const arr = JSON.parse(m.speakersJson || "[]");
          return Array.isArray(arr) ? arr.length : 0;
        } catch {
          return 0;
        }
      })(),
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }));

    return NextResponse.json({ meetings: list });
  } catch (error: any) {
    console.error("List meetings error:", error);
    return NextResponse.json({ error: error?.message || "Failed to load meetings." }, { status: 500 });
  }
}