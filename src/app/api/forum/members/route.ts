import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { users, chatChannels, departments } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { canReadChannel } from "@/lib/forum";
import { GENERAL, DEPARTMENT } from "@/lib/forum";

// GET /api/forum/members?channel=<id> — students who can see this channel,
// used for @-mention / tagging in replies.
export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const channelId = req.nextUrl.searchParams.get("channel");
    if (!channelId) return NextResponse.json({ error: "Missing channel" }, { status: 400 });

    const chRows = await db.select().from(chatChannels).where(eq(chatChannels.id, channelId)).limit(1);
    if (!chRows[0]) return NextResponse.json({ error: "Forum not found" }, { status: 404 });

    const channel = chRows[0];

    // Non-monitor users can only tag within forums they can read.
    if (user.role !== "admin" && user.role !== "org_admin") {
      const access = await canReadChannel(user, channel);
      if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const whereClause = and(
      eq(users.orgId, channel.orgId),
      channel.type === DEPARTMENT && channel.departmentId
        ? eq(users.departmentId, channel.departmentId)
        : undefined as any
    );

    const members = await db
      .select({
        id: users.id,
        name: users.name,
        studentId: users.studentId,
        departmentName: departments.name,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .leftJoin(departments, eq(departments.id, users.departmentId))
      .where(whereClause)
      .orderBy(asc(users.name));

    return NextResponse.json({ members });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
