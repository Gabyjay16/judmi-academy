import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { timetableEntries, courses, users, departments } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { generateId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    const deptFilter = req.nextUrl.searchParams.get("departmentId");
    const yearFilter = req.nextUrl.searchParams.get("year");

    // Students see only entries for their department + year; staff see everything in their org.
    const isStaff = user.role === "admin" || user.role === "org_admin" || user.role === "teacher";
    const targetDept = isStaff ? deptFilter : user.departmentId;
    const targetYear = isStaff ? yearFilter : user.year;

    const conditions = [eq(timetableEntries.orgId, user.orgId)];
    if (targetDept) conditions.push(eq(timetableEntries.departmentId, targetDept));
    if (targetYear) conditions.push(eq(timetableEntries.year, targetYear));

    const rows = await db
      .select({
        id: timetableEntries.id,
        day: timetableEntries.day,
        periodNo: timetableEntries.periodNo,
        startTime: timetableEntries.startTime,
        endTime: timetableEntries.endTime,
        venue: timetableEntries.venue,
        year: timetableEntries.year,
        courseId: timetableEntries.courseId,
        courseName: courses.name,
        courseCode: courses.code,
        departmentId: timetableEntries.departmentId,
        departmentName: departments.name,
        teacherId: timetableEntries.teacherId,
        teacherName: users.name,
      })
      .from(timetableEntries)
      .innerJoin(courses, eq(courses.id, timetableEntries.courseId))
      .leftJoin(departments, eq(departments.id, timetableEntries.departmentId))
      .leftJoin(users, eq(users.id, timetableEntries.teacherId))
      .where(and(...conditions))
      .orderBy(timetableEntries.day, timetableEntries.periodNo);

    return NextResponse.json({ entries: rows });
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
      return NextResponse.json({ error: "Only school staff can manage timetables." }, { status: 403 });
    }

    const body = await req.json();
    const { courseId, day, periodNo, startTime, endTime, venue, year, departmentId, teacherId } = body;

    if (!courseId || day == null || !periodNo || !startTime || !endTime) {
      return NextResponse.json({ error: "Course, day, period, and time are required." }, { status: 400 });
    }

    const id = generateId();
    const now = new Date().toISOString();

    await db.insert(timetableEntries).values({
      id,
      orgId: user.orgId,
      departmentId: departmentId || null,
      courseId,
      day: Number(day),
      periodNo: Number(periodNo),
      startTime,
      endTime,
      venue: venue?.trim() || null,
      year: year?.trim() || null,
      teacherId: teacherId || null,
      createdAt: now,
    });

    return NextResponse.json({ success: true, id });
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
    if (!id) return NextResponse.json({ error: "Missing entry id" }, { status: 400 });

    // Verify ownership: entry must belong to user's org.
    const entry = await db.select().from(timetableEntries).where(eq(timetableEntries.id, id)).limit(1);
    if (!entry[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (entry[0].orgId !== user.orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await db.delete(timetableEntries).where(eq(timetableEntries.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
