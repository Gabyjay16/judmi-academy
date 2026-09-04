import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { notifications } from "@/db/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { generateId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    const unreadRows = await db
      .select({ value: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, user.id), eq(notifications.isRead, 0)));

    return NextResponse.json({
      notifications: rows,
      unreadCount: unreadRows[0]?.value || 0,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin" && user.role !== "org_admin" && user.role !== "teacher") {
      return NextResponse.json({ error: "Staff only." }, { status: 403 });
    }

    const body = await req.json();
    const { userId, type, title, body: content, link } = body;

    if (!userId || !title?.trim()) {
      return NextResponse.json({ error: "userId and title are required." }, { status: 400 });
    }

    const id = generateId();
    const now = new Date().toISOString();

    await db.insert(notifications).values({
      id,
      orgId: user.orgId,
      userId,
      type: type || "general",
      title: title.trim(),
      body: content?.trim() || null,
      link: link || null,
      isRead: 0,
      createdAt: now,
    });

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { ids, markAll } = body;

    if (markAll) {
      await db
        .update(notifications)
        .set({ isRead: 1 })
        .where(and(eq(notifications.userId, user.id), eq(notifications.isRead, 0)));
    } else if (ids?.length) {
      for (const id of ids) {
        await db
          .update(notifications)
          .set({ isRead: 1 })
          .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}