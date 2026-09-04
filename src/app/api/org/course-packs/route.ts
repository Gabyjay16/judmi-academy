import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { courses, departments } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { generateId } from "@/lib/utils";

const STAFF = ["admin", "org_admin", "teacher"];
export const YEARS = ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7"];

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [courseRows, deptRows] = await Promise.all([
      db.select().from(courses).where(eq(courses.orgId, user.orgId)).orderBy(desc(courses.createdAt)),
      db.select().from(departments).where(eq(departments.orgId, user.orgId)).orderBy(desc(departments.createdAt)),
    ]);

    return NextResponse.json({
      years: YEARS,
      departments: deptRows,
      courses: courseRows,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user || !user.orgId || !STAFF.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, code, departmentId, year, teacherId } = body;
    if (!name?.trim() || !year?.trim()) {
      return NextResponse.json({ error: "Course name and year are required." }, { status: 400 });
    }
    if (!YEARS.includes(year)) {
      return NextResponse.json({ error: "Invalid year. Must be Year 1 through Year 7." }, { status: 400 });
    }

    if (!departmentId) {
      return NextResponse.json({ error: "Course must be assigned to a department." }, { status: 400 });
    }
    const deptRows = await db.select().from(departments).where(and(eq(departments.id, departmentId), eq(departments.orgId, user.orgId))).limit(1);
    if (deptRows.length === 0) {
      return NextResponse.json({ error: "Department not found." }, { status: 404 });
    }

    if (code?.trim()) {
      const dup = await db
        .select()
        .from(courses)
        .where(and(eq(courses.orgId, user.orgId), eq(courses.code, code.trim())))
        .limit(1);
      if (dup.length > 0) return NextResponse.json({ error: `A course with code ${code.trim()} already exists.` }, { status: 400 });
    }

    const id = generateId();
    await db.insert(courses).values({
      id,
      orgId: user.orgId,
      departmentId,
      name: name.trim(),
      code: code?.trim() || null,
      year,
      teacherId: teacherId || null,
      createdAt: new Date().toISOString(),
    });

    const created = (await db.select().from(courses).where(eq(courses.id, id)).limit(1))[0];
    return NextResponse.json({ success: true, course: created });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user || !user.orgId || !STAFF.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: "Missing course id" }, { status: 400 });

    await db.delete(courses).where(and(eq(courses.id, id), eq(courses.orgId, user.orgId!)));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
