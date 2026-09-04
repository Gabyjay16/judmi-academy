import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { courses, enrollments, users, departments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { generateId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "student" || !user.orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const myDept = user.departmentId;
    const myYear = user.year;

    // The course pack for the student's department + year
    const packRows = myDept && myYear
      ? await db
          .select()
          .from(courses)
          .where(and(eq(courses.orgId, user.orgId), eq(courses.departmentId, myDept), eq(courses.year, myYear)))
      : [];

    // All other courses in the school (for electives / extra registration)
    const allRows = await db.select().from(courses).where(eq(courses.orgId, user.orgId));

    // Student's current enrollments
    const enrolledRows = await db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.orgId, user.orgId), eq(enrollments.studentId, user.id)));

    const enrolledIds = new Set(enrolledRows.map((e) => e.courseId));
    const deptRows = myDept
      ? await db.select().from(departments).where(eq(departments.id, myDept)).limit(1)
      : [];

    return NextResponse.json({
      student: {
        name: user.name,
        departmentId: user.departmentId,
        departmentName: deptRows[0]?.name || null,
        year: user.year,
      },
      pack: packRows.map(packCourse),
      extras: allRows.filter((c) => !packRows.some((p) => p.id === c.id)).map(packCourse),
      enrolledIds: [...enrolledIds],
      enrolled: enrolledRows,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

function packCourse(c: typeof courses.$inferSelect) {
  return { id: c.id, name: c.name, code: c.code, year: c.year };
}

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "student" || !user.orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const action = body.action;

    if (action === "registerPack") {
      if (!user.departmentId || !user.year) {
        return NextResponse.json({ error: "Your department and year must be set before you can register your course pack." }, { status: 400 });
      }
      const packRows = await db
        .select()
        .from(courses)
        .where(and(eq(courses.orgId, user.orgId), eq(courses.departmentId, user.departmentId), eq(courses.year, user.year)));
      const added = await enrollAll(user.orgId, user.id, packRows);
      return NextResponse.json({ success: true, added });
    }

    if (action === "add") {
      const { courseId } = body;
      if (!courseId) return NextResponse.json({ error: "Course is required." }, { status: 400 });
      const courseRows = await db.select().from(courses).where(and(eq(courses.id, courseId), eq(courses.orgId, user.orgId))).limit(1);
      if (courseRows.length === 0) return NextResponse.json({ error: "Course not found." }, { status: 404 });
      const added = await enrollAll(user.orgId, user.id, courseRows);
      return NextResponse.json({ success: true, added });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

async function enrollAll(orgId: string, studentId: string, courseList: typeof courses.$inferSelect[]): Promise<number> {
  let addedCount = 0;
  for (const course of courseList) {
    const existing = await db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.orgId, orgId), eq(enrollments.studentId, studentId), eq(enrollments.courseId, course.id)))
      .limit(1);
    if (existing.length > 0) continue;
    await db.insert(enrollments).values({
      id: generateId(),
      orgId,
      studentId,
      courseId: course.id,
      courseName: course.name,
      year: course.year || null,
      enrolledAt: new Date().toISOString(),
    });
    addedCount += 1;
  }
  return addedCount;
}

export async function DELETE(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "student" || !user.orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { courseId } = body;
    if (!courseId) return NextResponse.json({ error: "Course is required." }, { status: 400 });

    await db
      .delete(enrollments)
      .where(and(eq(enrollments.orgId, user.orgId!), eq(enrollments.studentId, user.id), eq(enrollments.courseId, courseId)));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
