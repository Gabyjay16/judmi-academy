import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { chatNotifications, chatMessages } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

// GET /api/forum/notifications — the recipient's notifications (newest first)
// with the channel details needed to jump straight into the chat.
export async function GET() {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rows = await db
      .select()
      .from(chatNotifications)
      .where(eq(chatNotifications.userId, user.id))
      .orderBy(desc(chatNotifications.createdAt))
      .limit(100);

    return NextResponse.json({ notifications: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

// POST /api/forum/notifications — mark one or all notifications read.
// body: { id } to read one, or { all: true } to mark everything read.
export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    if (body?.all) {
      await db
        .update(chatNotifications)
        .set({ isRead: 1 })
        .where(and(eq(chatNotifications.userId, user.id), eq(chatNotifications.isRead, 0)));
    } else if (body?.id) {
      await db
        .update(chatNotifications)
        .set({ isRead: 1 })
        .where(and(eq(chatNotifications.userId, user.id), eq(chatNotifications.id, body.id)));
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
