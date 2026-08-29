import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();

    if (!currentUser || (currentUser.role !== "org_admin" && currentUser.role !== "admin")) {
      return NextResponse.json({ error: "Only school administrators can manage permissions." }, { status: 403 });
    }

    const body = await req.json();
    const { userId, canManageComplaints } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    const targetUsers = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.orgId, currentUser.orgId!)))
      .limit(1);

    if (targetUsers.length === 0) {
      return NextResponse.json({ error: "Member not found in your organization." }, { status: 404 });
    }

    await db.update(users).set({
      canManageComplaints: canManageComplaints ? 1 : 0,
    }).where(eq(users.id, userId));

    return NextResponse.json({
      success: true,
      message: `Complaint review access ${canManageComplaints ? "granted to" : "revoked from"} ${targetUsers[0].name}.`,
    });
  } catch (error: any) {
    console.error("Update permissions error:", error);
    return NextResponse.json({ error: error.message || "Failed to update permissions" }, { status: 500 });
  }
}
