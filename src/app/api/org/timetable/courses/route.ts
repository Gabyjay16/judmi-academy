import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { courses, users, departments } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { generateId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    const rows = await db
      .select({
        id: courses.id,
        name: courses.name,
        code: courses.code,
        year: courses.year,
        departmentId: courses.departmentId,
        departmentName: departments.name,
        teacherId: courses.teacherId,
        teacherName: users.name,
        createdAt: courses.createdAt,
      })
      .from(courses)
      .leftJoin(departments, eq(departments.id, courses.departmentId))
      .leftJoin(users, eq(users.id, courses.teacherId))
      .where(eq(courses.orgId, user.orgId))
      .orderBy(desc(courses.createdAt));

    return NextResponse.json({ courses: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });
    if (user.role !== "admin" && user.role !== "org_admin" && user.role !== "teacher") {
      return NextResponse.json({ error: "Only school staff can create courses." }, { status: 403 });
    }

    const body = await req.json();
    const { name, code, departmentId, teacherId, year } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Course name is required." }, { status: 400 });
    }

    const id = generateId();
    const now = new Date().toISOString();

    await db.insert(courses).values({
      id,
      orgId: user.orgId,
      departmentId: departmentId || null,
      name: name.trim(),
      code: code?.trim().toUpperCase() || null,
      teacherId: teacherId || null,
      year: year?.trim() || null,
      createdAt: now,
    });

    const created = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
    return NextResponse.json({ success: true, course: created[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
