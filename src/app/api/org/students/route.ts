import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    const isStaff = user.role === "admin" || user.role === "org_admin" || user.role === "teacher";
    if (!isStaff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const deptId = req.nextUrl.searchParams.get("departmentId");
    const year = req.nextUrl.searchParams.get("year");

    const conditions = [eq(users.orgId, user.orgId), eq(users.role, "student")];
    if (deptId) conditions.push(eq(users.departmentId, deptId));
    if (year) conditions.push(eq(users.year, year));

    const rows = await db
      .select({ id: users.id, name: users.name, email: users.email, departmentId: users.departmentId, year: users.year, studentId: users.studentId })
      .from(users)
      .where(and(...conditions));

    return NextResponse.json({ students: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
