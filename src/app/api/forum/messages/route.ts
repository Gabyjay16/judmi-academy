import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { chatMessages, chatChannels, chatNotifications, users } from "@/db/schema";
import { eq, and, or, desc, asc, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { generateId } from "@/lib/utils";
import { canPostInForum, canReadChannel, GENERAL, DEPARTMENT } from "@/lib/forum";

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const channelId = req.nextUrl.searchParams.get("channel");
    if (!channelId) return NextResponse.json({ error: "Missing channel" }, { status: 400 });

    const chRows = await db.select().from(chatChannels).where(eq(chatChannels.id, channelId)).limit(1);
    if (!chRows[0]) return NextResponse.json({ error: "Forum not found" }, { status: 404 });

    const access = await canReadChannel(user, chRows[0]);
    if (!access.ok) return NextResponse.json({ error: access.reason || "Forbidden" }, { status: 403 });

    const rows = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.channelId, channelId))
      .orderBy(asc(chatMessages.createdAt));

    return NextResponse.json({ channel: chRows[0], messages: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!canPostInForum(user)) {
      return NextResponse.json({ error: "This account is limited to viewing the forum." }, { status: 403 });
    }

    const body = await req.json();
    const { channelId, type, content, mediaUrl, mediaDurationSeconds, replyToId, taggedUserId } = body;

    if (!channelId) return NextResponse.json({ error: "Missing channel" }, { status: 400 });

    const chRows = await db.select().from(chatChannels).where(eq(chatChannels.id, channelId)).limit(1);
    if (!chRows[0]) return NextResponse.json({ error: "Forum not found" }, { status: 404 });

    const access = await canReadChannel(user, chRows[0]);
    if (!access.ok) return NextResponse.json({ error: access.reason || "Forbidden" }, { status: 403 });

    const channel = chRows[0];
    const msgType = type === "image" || type === "voice" ? type : "text";

    if (msgType === "text" && !content?.trim()) {
      return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
    }

    // Validate media presence for image/voice
    if (msgType !== "text" && !mediaUrl) {
      return NextResponse.json({ error: "Missing media" }, { status: 400 });
    }

    const id = generateId();
    const now = new Date().toISOString();

    // Resolve reply preview if replying to a message.
    let replyPreview: string | null = null;
    let replyAuthor: string | null = null;
    if (replyToId) {
      const repRows = await db.select().from(chatMessages).where(eq(chatMessages.id, replyToId)).limit(1);
      if (repRows[0]) {
        const r = repRows[0];
        replyAuthor = r.authorName;
        replyPreview = r.type === "voice" ? "🎤 Voice note" : r.type === "image" ? "📷 Image" : (r.content || "").slice(0, 100);
      }
    }

    await db.insert(chatMessages).values({
      id,
      orgId: channel.orgId,
      channelId,
      authorUserId: user.id,
      authorName: user.name,
      authorAvatarUrl: user.avatarUrl || null,
      type: msgType,
      content: msgType === "text" ? content : content || null,
      mediaUrl: mediaUrl || null,
      mediaDurationSeconds: mediaDurationSeconds || null,
      replyToId: replyToId || null,
      replyPreview,
      replyAuthorName: replyAuthor,
      createdAt: now,
    });

    // Create a notification for the tagged user (recipient) when someone
    // tags them, so they can jump straight into the chat.
    const channelLabel = channel.type === DEPARTMENT ? (channel.name || "Department Forum") : "General Forum";

    if (taggedUserId && taggedUserId !== user.id && channel.orgId === user.orgId) {
      const tRows = await db.select({ id: users.id }).from(users).where(eq(users.id, taggedUserId)).limit(1);
      if (tRows[0] && (user.role === "admin" || tRows[0].id === taggedUserId)) {
        await db.insert(chatNotifications).values({
          id: generateId(),
          userId: taggedUserId,
          messageId: id,
          senderUserId: user.id,
          senderName: user.name,
          channelId,
          channelLabel,
          replyContent: content || (msgType === "voice" ? "🎤 Voice note" : "📷 Image"),
          replyType: msgType,
          isRead: 0,
          createdAt: now,
        });
      }
    }

    const inserted = await db.select().from(chatMessages).where(eq(chatMessages.id, id)).limit(1);

    return NextResponse.json({ success: true, message: inserted[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
