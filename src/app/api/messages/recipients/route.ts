import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.orgId) return NextResponse.json({ recipients: [] });

    const members = await db.select().from(users).where(eq(users.orgId, user.orgId)).orderBy(desc(users.createdAt));

    const recipients = members
      .filter((m) => m.id !== user.id)
      .map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        role: m.role,
        studentId: m.studentId || null,
        year: m.year || null,
        label: m.role === "student" ? (m.name + (m.studentId ? " · " + m.studentId : "")) : m.name + " · " + m.role.replace("_", " "),
      }));

    return NextResponse.json({ recipients });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
