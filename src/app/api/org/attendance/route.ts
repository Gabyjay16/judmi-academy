import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { attendanceRecords, courses, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { generateId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    const courseId = req.nextUrl.searchParams.get("courseId");
    const date = req.nextUrl.searchParams.get("date");
    const studentId = req.nextUrl.searchParams.get("studentId");

    const isStaff = user.role === "admin" || user.role === "org_admin" || user.role === "teacher";
    const conditions = [eq(attendanceRecords.orgId, user.orgId)];

    if (courseId) conditions.push(eq(attendanceRecords.courseId, courseId));
    if (date) conditions.push(eq(attendanceRecords.date, date));

    // Students can only see their own records.
    if (!isStaff) {
      conditions.push(eq(attendanceRecords.studentId, user.id));
    } else if (studentId) {
      conditions.push(eq(attendanceRecords.studentId, studentId));
    }

    const rows = await db
      .select({
        id: attendanceRecords.id,
        courseId: attendanceRecords.courseId,
        courseName: courses.name,
        courseCode: courses.code,
        studentId: attendanceRecords.studentId,
        studentName: users.name,
        date: attendanceRecords.date,
        status: attendanceRecords.status,
        markedBy: attendanceRecords.markedBy,
      })
      .from(attendanceRecords)
      .innerJoin(courses, eq(courses.id, attendanceRecords.courseId))
      .innerJoin(users, eq(users.id, attendanceRecords.studentId))
      .where(and(...conditions));

    return NextResponse.json({ records: rows });
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
      return NextResponse.json({ error: "Only school staff can mark attendance." }, { status: 403 });
    }

    const body = await req.json();
    const { courseId, date, records } = body as {
      courseId: string;
      date: string;
      records: { studentId: string; status: string }[];
    };

    if (!courseId || !date || !records?.length) {
      return NextResponse.json({ error: "Course, date, and records are required." }, { status: 400 });
    }

    // Verify course belongs to user's org.
    const course = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
    if (!course[0] || course[0].orgId !== user.orgId) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const now = new Date().toISOString();

    // Upsert: delete existing records for this course+date, then insert new ones.
    await db
      .delete(attendanceRecords)
      .where(and(eq(attendanceRecords.courseId, courseId), eq(attendanceRecords.date, date)));

    if (records.length > 0) {
      await db.insert(attendanceRecords).values(
        records.map((r) => ({
          id: generateId(),
          orgId: user.orgId!,
          courseId,
          studentId: r.studentId,
          date,
          status: r.status || "present",
          markedBy: user.id,
          createdAt: now,
        }))
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
