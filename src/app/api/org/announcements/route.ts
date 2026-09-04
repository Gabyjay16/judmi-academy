import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { announcements } from "@/db/schema";
import { eq, and, or, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { generateId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    const isStaff = user.role === "admin" || user.role === "org_admin" || user.role === "teacher";
    const orgCondition = eq(announcements.orgId, user.orgId);

    const audienceCondition = isStaff
      ? undefined
      : or(eq(announcements.audience, "all"), eq(announcements.audience, "students"));

    const where = audienceCondition ? and(orgCondition, audienceCondition) : orgCondition;

    const rows = await db
      .select()
      .from(announcements)
      .where(where)
      .orderBy(desc(announcements.pinned), desc(announcements.createdAt));

    return NextResponse.json({ announcements: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });
    if (user.role !== "admin" && user.role !== "org_admin" && user.role !== "teacher") {
      return NextResponse.json({ error: "Only school staff can post announcements." }, { status: 403 });
    }

    const body = await req.json();
    const { title, body: content, pinned, audience, eventDate } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Announcement title is required." }, { status: 400 });
    }

    const id = generateId();
    const now = new Date().toISOString();

    await db.insert(announcements).values({
      id,
      orgId: user.orgId,
      title: title.trim(),
      body: content?.trim() || null,
      pinned: pinned ? 1 : 0,
      audience: audience || "all",
      authorId: user.id,
      authorName: user.name,
      eventDate: eventDate || null,
      createdAt: now,
    });

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin" && user.role !== "org_admin") {
      return NextResponse.json({ error: "Only school administrators can delete announcements." }, { status: 403 });
    }

    const body = await req.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const a = await db.select().from(announcements).where(eq(announcements.id, id)).limit(1);
    if (!a[0] || a[0].orgId !== user.orgId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.delete(announcements).where(eq(announcements.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}