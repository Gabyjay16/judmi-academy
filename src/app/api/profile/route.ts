import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const updates: Record<string, any> = {};

    // Profile-complete setup (student)
    if (body.departmentId !== undefined) updates.departmentId = body.departmentId || null;
    if (body.year !== undefined) updates.year = body.year || null;
    if (body.studentId !== undefined) updates.studentId = body.studentId || null;
    if (body.name !== undefined) updates.name = body.name?.trim() || user.name;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update." }, { status: 400 });
    }

    await db.update(users).set(updates).where(eq(users.id, user.id));
    return NextResponse.json({ success: true, updated: Object.keys(updates) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}