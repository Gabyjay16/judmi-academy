import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { enrollments, courses, users } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { generateId } from "@/lib/utils";

const STAFF = ["admin", "org_admin", "teacher"];

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    if (user.role === "student") {
      const rows = await db
        .select()
        .from(enrollments)
        .where(and(eq(enrollments.orgId, user.orgId), eq(enrollments.studentId, user.id)))
        .orderBy(desc(enrollments.enrolledAt));
      return NextResponse.json({ enrollments: rows });
    }

    if (!STAFF.includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const studentId = req.nextUrl.searchParams.get("studentId");
    const query = studentId
      ? and(eq(enrollments.orgId, user.orgId), eq(enrollments.studentId, studentId))
      : eq(enrollments.orgId, user.orgId);

    const rows = await db.select().from(enrollments).where(query).orderBy(desc(enrollments.enrolledAt));

    // Also fetch courses + students so the UI can populate selectors.
    const [courseRows, studentRows] = await Promise.all([
      db.select().from(courses).where(eq(courses.orgId, user.orgId)).orderBy(desc(courses.createdAt)),
      db.select().from(users).where(and(eq(users.orgId, user.orgId), eq(users.role, "student"))).orderBy(desc(users.createdAt)),
    ]);

    return NextResponse.json({
      enrollments: rows,
      courses: courseRows,
      students: studentRows.map((s) => ({ id: s.id, name: s.name, email: s.email, studentId: s.studentId, year: s.year })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.orgId || !STAFF.includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { studentId, courseId } = body;
    if (!studentId || !courseId) return NextResponse.json({ error: "Student and course are required." }, { status: 400 });

    const courseRows = await db.select().from(courses).where(and(eq(courses.id, courseId), eq(courses.orgId, user.orgId))).limit(1);
    if (courseRows.length === 0) return NextResponse.json({ error: "Course not found" }, { status: 404 });

    // Avoid duplicates
    const existing = await db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.orgId, user.orgId), eq(enrollments.studentId, studentId), eq(enrollments.courseId, courseId)))
      .limit(1);
    if (existing.length > 0) return NextResponse.json({ success: true, alreadyEnrolled: true });

    await db.insert(enrollments).values({
      id: generateId(),
      orgId: user.orgId,
      studentId,
      courseId,
      courseName: courseRows[0].name,
      year: courseRows[0].year || null,
      enrolledAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.orgId || !STAFF.includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    await db.delete(enrollments).where(and(eq(enrollments.id, id), eq(enrollments.orgId, user.orgId!)));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
