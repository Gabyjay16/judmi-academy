import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { assignments, assignmentSubmissions } from "@/db/schema";
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
      .select()
      .from(assignments)
      .where(eq(assignments.orgId, user.orgId))
      .orderBy(desc(assignments.pinned), desc(assignments.createdAt));

    // For students, attach whether they've submitted and their score.
    if (user.role === "student") {
      const subs = await db
        .select()
        .from(assignmentSubmissions)
        .where(eq(assignmentSubmissions.studentId, user.id));
      const subMap: Record<string, any> = {};
      for (const s of subs) subMap[s.assignmentId] = s;
      const items = rows.map((a) => ({
        ...a,
        mySubmission: subMap[a.id] || null,
      }));
      return NextResponse.json({ assignments: items });
    }

    // For staff, attach submission counts.
    const counts: Record<string, number> = {};
    for (const a of rows) {
      const sub = await db
        .select()
        .from(assignmentSubmissions)
        .where(eq(assignmentSubmissions.assignmentId, a.id));
      counts[a.id] = sub.length;
    }
    const items = rows.map((a) => ({ ...a, submissionCount: counts[a.id] || 0 }));
    return NextResponse.json({ assignments: items });
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
      return NextResponse.json({ error: "Only school staff can create assignments." }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, courseId, courseName, dueDate, maxScore, pinned } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Assignment title is required." }, { status: 400 });
    }

    const id = generateId();
    const now = new Date().toISOString();

    await db.insert(assignments).values({
      id,
      orgId: user.orgId,
      title: title.trim(),
      description: description?.trim() || null,
      courseId: courseId || null,
      courseName: courseName?.trim() || null,
      dueDate: dueDate || null,
      maxScore: maxScore ? Number(maxScore) : 100,
      createdBy: user.id,
      createdByName: user.name,
      pinned: pinned ? 1 : 0,
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
    if (user.role !== "admin" && user.role !== "org_admin") {
      return NextResponse.json({ error: "Only administrators can delete assignments." }, { status: 403 });
    }

    const body = await req.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const a = await db.select().from(assignments).where(eq(assignments.id, id)).limit(1);
    if (!a[0] || a[0].orgId !== user.orgId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.delete(assignments).where(eq(assignments.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}