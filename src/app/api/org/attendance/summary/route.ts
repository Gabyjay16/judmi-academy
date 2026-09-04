import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { attendanceRecords, courses } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    const targetStudentId = req.nextUrl.searchParams.get("studentId") || user.id;

    // Only staff can query other students' summaries; students always see their own.
    const isStaff = user.role === "admin" || user.role === "org_admin" || user.role === "teacher";
    if (!isStaff && targetStudentId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Aggregate per course: total sessions, present count, late count, absent count.
    const rows = await db
      .select({
        courseId: attendanceRecords.courseId,
        courseName: courses.name,
        courseCode: courses.code,
        total: sql<number>`count(*)`,
        present: sql<number>`sum(case when ${attendanceRecords.status} = 'present' then 1 else 0 end)`,
        late: sql<number>`sum(case when ${attendanceRecords.status} = 'late' then 1 else 0 end)`,
        absent: sql<number>`sum(case when ${attendanceRecords.status} = 'absent' then 1 else 0 end)`,
        excused: sql<number>`sum(case when ${attendanceRecords.status} = 'excused' then 1 else 0 end)`,
      })
      .from(attendanceRecords)
      .innerJoin(courses, eq(courses.id, attendanceRecords.courseId))
      .where(and(eq(attendanceRecords.orgId, user.orgId), eq(attendanceRecords.studentId, targetStudentId)))
      .groupBy(attendanceRecords.courseId, courses.name, courses.code);

    const summary = rows.map((r) => ({
      courseId: r.courseId,
      courseName: r.courseName,
      courseCode: r.courseCode,
      total: r.total,
      present: r.present,
      late: r.late,
      absent: r.absent,
      excused: r.excused,
      attendancePct: r.total > 0 ? Math.round(((r.present + r.late) / r.total) * 100) : 0,
    }));

    return NextResponse.json({ summary });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
