import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { tests, questions, submissions } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { gradeMCQSubmission } from "@/lib/question-shuffler";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    await initDatabase();
    const { submissionId } = await params;

    const subRows = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, submissionId))
      .limit(1);

    if (subRows.length === 0) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const sub = subRows[0];

    const testRows = await db
      .select()
      .from(tests)
      .where(eq(tests.id, sub.testId))
      .limit(1);

    const test = testRows[0];

    const assignedIds: string[] = JSON.parse(sub.assignedQuestionsJson || "[]");
    const studentAnswers: Record<string, number> = JSON.parse(sub.answersJson || "{}");

    let corrections: any[] = [];

    if (assignedIds.length > 0) {
      const qRows = await db
        .select()
        .from(questions)
        .where(inArray(questions.id, assignedIds));

      const gradeResult = gradeMCQSubmission(qRows, studentAnswers);
      corrections = gradeResult.corrections;
    }

    return NextResponse.json({
      submission: {
        id: sub.id,
        testTitle: test?.title || "Exam",
        testSubject: test?.subject,
        testCode: test?.code,
        studentName: sub.studentName,
        studentId: sub.studentId,
        score: sub.score,
        maxScore: sub.maxScore,
        percentage: sub.percentage,
        passed: sub.passed === 1,
        passScorePercentage: test?.passScorePercentage || 50,
        allowRetake: test ? test.allowRetake === 1 : true,
        timeSpentSeconds: sub.timeSpentSeconds,
        isAutoSubmitted: sub.isAutoSubmitted === 1,
        startedAt: sub.startedAt,
        submittedAt: sub.submittedAt,
        showCorrectionsImmediately: test?.showCorrectionsImmediately === 1,
      },
      corrections,
    });
  } catch (error: any) {
    console.error("Fetch submission error:", error);
    return NextResponse.json({ error: error?.message || "Failed to fetch submission" }, { status: 500 });
  }
}
