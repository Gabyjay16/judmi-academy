import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { results } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { generateId } from "@/lib/utils";
import { canViewResults } from "@/lib/results-access";

function computeGrade(total: number) {
  if (total >= 80) return "A";
  if (total >= 70) return "B";
  if (total >= 60) return "C";
  if (total >= 50) return "D";
  return "F";
}

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    if (user.role === "student") {
      // Students only see published results, and only if fees are settled (or admin-approved).
      if (!(await canViewResults(user))) {
        return NextResponse.json({ results: [], gated: true, reason: "fees" }, { status: 200 });
      }
      const rows = await db
        .select()
        .from(results)
        .where(and(eq(results.studentId, user.id), eq(results.published, 1)))
        .orderBy(desc(results.term), desc(results.createdAt));
      return NextResponse.json({ results: rows });
    }

    const isStaff = user.role === "admin" || user.role === "org_admin" || user.role === "teacher";
    if (!isStaff) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const rows = await db
      .select()
      .from(results)
      .where(eq(results.orgId, user.orgId))
      .orderBy(desc(results.createdAt));
    return NextResponse.json({ results: rows });
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
      return NextResponse.json({ error: "Only school staff can add results." }, { status: 403 });
    }

    const body = await req.json();
    const { studentId, studentName, courseId, courseName, term, examScore, assignmentScore, remarks, published } = body;

    if (!studentId || !term?.trim()) {
      return NextResponse.json({ error: "Student and term are required." }, { status: 400 });
    }

    const exam = examScore !== undefined && examScore !== null && examScore !== "" ? Number(examScore) : undefined;
    const assign = assignmentScore !== undefined && assignmentScore !== null && assignmentScore !== "" ? Number(assignmentScore) : undefined;

    // Weight: 60% exam + 40% assignment if both provided; otherwise whichever is present.
    let total: number | undefined;
    if (exam !== undefined && assign !== undefined) {
      total = Math.round(exam * 0.6 + assign * 0.4);
    } else if (exam !== undefined) {
      total = exam;
    } else if (assign !== undefined) {
      total = assign;
    }

    const grade = total !== undefined ? computeGrade(total) : null;

    const now = new Date().toISOString();
    const id = generateId();

    await db.insert(results).values({
      id,
      orgId: user.orgId,
      studentId,
      studentName: studentName?.trim() || null,
      courseId: courseId || null,
      courseName: courseName?.trim() || null,
      term: term.trim(),
      examScore: exam,
      assignmentScore: assign,
      total: total ?? null,
      grade,
      remarks: remarks?.trim() || null,
      published: published ? 1 : 0,
      publishedAt: published ? now : null,
      createdBy: user.id,
      createdAt: now,
    });

    return NextResponse.json({ success: true, id, total, grade });
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
      return NextResponse.json({ error: "Only administrators can delete results." }, { status: 403 });
    }
    const body = await req.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    await db.delete(results).where(and(eq(results.id, id), eq(results.orgId, user.orgId!)));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}