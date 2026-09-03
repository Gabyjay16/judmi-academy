import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { chatMessages } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

// A sender can delete anything they've posted. A super admin (admin) can also
// delete any message within their scope as a moderator. Deleting removes the
// message everywhere (no monitoring trace is surfaced to students).
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const rows = await db.select().from(chatMessages).where(eq(chatMessages.id, id)).limit(1);
    const msg = rows[0];
    if (!msg) return NextResponse.json({ error: "Message not found" }, { status: 404 });

    const isAuthor = msg.authorUserId === user.id;
    const isModerator = user.role === "admin";
    if (!isAuthor && !isModerator) {
      return NextResponse.json({ error: "You can only delete messages you sent." }, { status: 403 });
    }

    await db.delete(chatMessages).where(eq(chatMessages.id, id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
