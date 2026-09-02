import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { inverseMarkings, inverseMarkingSubmissions } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { generateId, generateTestCode } from "@/lib/utils";

const MAX_QUESTIONS = 20;
const MAX_MARKS_PER_QUESTION = 100;

export function canCreateInverseMarking(role?: string | null) {
  return role === "teacher" || role === "org_admin" || role === "admin" || role === "super_admin";
}

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }
    if (!canCreateInverseMarking(currentUser.role)) {
      return NextResponse.json({ error: "Only teachers can create inverse marking exercises." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const title = String(body?.title || "").trim();
    const instruction = String(body?.instruction || "").trim();
    const questions = Array.isArray(body?.questions) ? body.questions : [];
    const tolerance = Math.max(0, Math.min(10, parseInt(body?.tolerance, 10) || 1));
    const passThreshold = Math.max(50, Math.min(100, parseInt(body?.passThreshold, 10) || 80));

    if (!title) {
      return NextResponse.json({ error: "Please give this exercise a title." }, { status: 400 });
    }
    if (questions.length < 1 || questions.length > MAX_QUESTIONS) {
      return NextResponse.json({ error: `Add between 1 and ${MAX_QUESTIONS} questions.` }, { status: 400 });
    }

    const cleanQuestions: any[] = [];
    for (const q of questions) {
      const prompt = String(q?.prompt || "").trim();
      const answer = String(q?.answer || "").trim();
      const markScheme = String(q?.markScheme || "").trim();
      const maxMarks = Math.max(1, Math.min(MAX_MARKS_PER_QUESTION, Math.round(Number(q?.maxMarks) || 0)));
      const controlMark = Math.max(0, Math.min(maxMarks, Math.round(Number(q?.controlMark) || 0)));

      if (!prompt) {
        return NextResponse.json({ error: "Every question needs a prompt." }, { status: 400 });
      }
      if (answer.length < 10) {
        return NextResponse.json({ error: "Every question needs the teacher's reference answer (at least 10 characters) for students to mark." }, { status: 400 });
      }

      cleanQuestions.push({
        id: q?.id || generateId(),
        prompt,
        maxMarks,
        markScheme,
        answer,
        controlMark,
        isTrap: Boolean(q?.isTrap),
      });
    }

    let code = generateTestCode();
    for (let i = 0; i < 5; i++) {
      const existing = await db
        .select({ id: inverseMarkings.id })
        .from(inverseMarkings)
        .where(eq(inverseMarkings.code, code))
        .limit(1);
      if (existing.length === 0) break;
      code = generateTestCode();
    }

    const id = generateId();
    const now = new Date().toISOString();
    await db.insert(inverseMarkings).values({
      id,
      code,
      ownerUserId: currentUser.id,
      orgId: currentUser.orgId || null,
      title,
      instruction,
      questionsJson: JSON.stringify(cleanQuestions),
      tolerance,
      passThreshold,
      showResultsToStudents: 1,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      success: true,
      exercise: {
        id,
        code,
        title,
        createdAt: now,
      },
    });
  } catch (error: any) {
    console.error("Create inverse marking error:", error);
    return NextResponse.json({ error: error?.message || "Failed to create the exercise. Please try again." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }
    if (!canCreateInverseMarking(currentUser.role)) {
      return NextResponse.json({ error: "Only teachers can view inverse marking exercises." }, { status: 403 });
    }

    const rows = await db
      .select()
      .from(inverseMarkings)
      .where(eq(inverseMarkings.ownerUserId, currentUser.id))
      .orderBy(desc(inverseMarkings.createdAt))
      .limit(50);

    const exercises: any[] = [];
    for (const row of rows) {
      const subRows = await db
        .select({ id: inverseMarkingSubmissions.id })
        .from(inverseMarkingSubmissions)
        .where(eq(inverseMarkingSubmissions.exerciseId, row.id));
      const questionRows = ((row.questionsJson || "[]") as string);
      let questionCount = 0;
      let totalMarks = 0;
      try {
        const qs = JSON.parse(questionRows);
        if (Array.isArray(qs)) {
          questionCount = qs.length;
          totalMarks = qs.reduce((sum: number, q: any) => sum + (Number(q.maxMarks) || 0), 0);
        }
      } catch {}
      exercises.push({
        id: row.id,
        code: row.code,
        title: row.title,
        status: row.status,
        tolerance: row.tolerance,
        passThreshold: row.passThreshold,
        questionCount,
        totalMarks,
        submissionCount: subRows.length,
        createdAt: row.createdAt,
      });
    }

    return NextResponse.json({ exercises });
  } catch (error: any) {
    console.error("List inverse marking exercises error:", error);
    return NextResponse.json({ error: "Failed to load your exercises." }, { status: 500 });
  }
}

export const maxDuration = 60;