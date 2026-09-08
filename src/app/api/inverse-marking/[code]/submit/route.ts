import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { inverseMarkings, inverseMarkingSubmissions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";

function parseQuestions(raw: string | null): any[] {
  try {
    const qs = JSON.parse(raw || "[]");
    if (Array.isArray(qs)) return qs;
    return [];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    await initDatabase();
    const { code } = await params;

    const rows = await db
      .select()
      .from(inverseMarkings)
      .where(eq(inverseMarkings.code, code.trim().toUpperCase()))
      .limit(1);
    if (rows.length === 0) {
      return NextResponse.json({ error: "No inverse marking exercise found for that code." }, { status: 404 });
    }
    const ex = rows[0];
    if (ex.status !== "active") {
      return NextResponse.json({ error: "This exercise has been closed by the teacher. Submissions are no longer accepted." }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const studentName = String(body?.studentName || "").trim();
    const studentEmail = String(body?.studentEmail || "").trim();
    const marks: { qId: string; marks: number; justification: string }[] = Array.isArray(body?.marks) ? body.marks : [];

    if (studentName.length < 2) {
      return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
    }

    const questions = parseQuestions(ex.questionsJson);
    const tolerance = ex.tolerance ?? 1;
    const passThreshold = ex.passThreshold ?? 80;

    const cleanMarks: { qId: string; marks: number; justification: string }[] = [];
    let totalTeacherMarks = 0;
    let totalControlMarks = 0;
    let totalMaxMarks = 0;
    let deviationTotal = 0;
    let effectiveDeviationTotal = 0;

    for (const q of questions) {
      const maxMarks = Number(q.maxMarks) || 0;
      const controlMark = Number(q.controlMark) || 0;
      const qMark = marks.find((m) => m.qId === q.id);
      const markValue = qMark ? Math.round(Number(qMark.marks)) : NaN;
      const justification = String(qMark?.justification || "").trim();

      if (Number.isNaN(markValue) || markValue < 0 || markValue > maxMarks) {
        return NextResponse.json({ error: `Please award between 0 and ${maxMarks} marks for: “${String(q.prompt).slice(0, 60)}”` }, { status: 400 });
      }
      if (justification.length < 2) {
        return NextResponse.json({ error: `Explain why you awarded those marks for: “${String(q.prompt).slice(0, 60)}”` }, { status: 400 });
      }

      const deviation = Math.abs(markValue - controlMark);
      totalTeacherMarks += markValue;
      totalControlMarks += controlMark;
      totalMaxMarks += maxMarks;
      deviationTotal += deviation;
      effectiveDeviationTotal += Math.max(0, deviation - tolerance);
      cleanMarks.push({ qId: q.id, marks: markValue, justification });
    }

    const accuracyScore =
      totalMaxMarks > 0
        ? Math.max(0, Math.min(100, Math.round(100 * (1 - effectiveDeviationTotal / totalMaxMarks))))
        : 0;
    const passed = accuracyScore >= passThreshold;
    const leniency = questions.length > 0 ? Math.round((totalTeacherMarks - totalControlMarks) / questions.length) : 0;

    const id = generateId();
    const now = new Date().toISOString();
    await db.insert(inverseMarkingSubmissions).values({
      id,
      exerciseId: ex.id,
      studentName,
      studentEmail: studentEmail || null,
      marksJson: JSON.stringify(cleanMarks),
      totalTeacherMarks,
      totalControlMarks,
      totalMaxMarks,
      deviationTotal,
      accuracyScore,
      passed: passed ? 1 : 0,
      leniency,
      submittedAt: now,
    });

    const perQuestion = questions.map((q) => {
      const response = cleanMarks.find((m) => m.qId === q.id);
      const deviation = Math.abs((response?.marks || 0) - (Number(q.controlMark) || 0));
      return {
        id: q.id,
        prompt: q.prompt,
        maxMarks: Number(q.maxMarks) || 0,
        answer: q.answer,
        controlMark: Number(q.controlMark) || 0,
        studentMarks: response?.marks || 0,
        deviation,
        agreed: deviation <= tolerance,
        justification: response?.justification || "",
      };
    });

    return NextResponse.json({
      success: true,
      result: {
        submissionId: id,
        exerciseTitle: ex.title,
        studentName,
        accuracyScore,
        passed,
        tolerance,
        passThreshold,
        totalTeacherMarks,
        totalControlMarks,
        totalMaxMarks,
        deviationTotal,
        leniency,
        perQuestion,
        submittedAt: now,
      },
    });
  } catch (error: any) {
    console.error("Inverse marking submit error:", error);
    return NextResponse.json({ error: error?.message || "Failed to submit your marks. Please try again." }, { status: 500 });
  }
}

export const maxDuration = 60;