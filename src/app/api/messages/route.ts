import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { messages, users } from "@/db/schema";
import { eq, and, or, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { generateId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const box = req.nextUrl.searchParams.get("box") || "inbox";

    let inbox: any[] = [];
    let outbox: any[] = [];
    if (box === "inbox") {
      const rows = await db.select().from(messages).where(eq(messages.recipientId, user.id)).orderBy(desc(messages.createdAt));
      inbox = rows.map(m => ({ ...m, isRead: m.isRead === 1 }));
    } else {
      const rows = await db.select().from(messages).where(eq(messages.senderId, user.id)).orderBy(desc(messages.createdAt));
      outbox = rows.map(m => ({ ...m, isRead: m.isRead === 1 }));
    }

    const unread = (await db.select().from(messages).where(eq(messages.recipientId, user.id))).filter(m => m.isRead === 0).length;

    return NextResponse.json({ inbox, outbox, unread });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { recipientId, subject, body: msgBody } = body;
    if (!recipientId || !msgBody?.trim()) return NextResponse.json({ error: "Recipient and message are required." }, { status: 400 });

    const recipientRows = await db.select().from(users).where(eq(users.id, recipientId)).limit(1);
    const recipient = recipientRows[0];
    if (!recipient) return NextResponse.json({ error: "Recipient not found" }, { status: 404 });

    await db.insert(messages).values({
      id: generateId(),
      orgId: user.orgId || recipient.orgId || "org",
      senderId: user.id,
      senderName: user.name,
      recipientId,
      subject: subject?.trim() || null,
      body: msgBody.trim(),
      isRead: 0,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
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
    const { id } = body;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await db.update(messages).set({ isRead: 1, readAt: new Date().toISOString() }).where(and(eq(messages.id, id), eq(messages.recipientId, user.id)));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await db.delete(messages).where(and(eq(messages.id, id), or(eq(messages.senderId, user.id), eq(messages.recipientId, user.id))));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
