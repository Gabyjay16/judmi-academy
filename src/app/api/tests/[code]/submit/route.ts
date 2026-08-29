import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { tests, questions, submissions } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { gradeMCQSubmission } from "@/lib/question-shuffler";
import { generateId } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    await initDatabase();
    const { code } = await params;
    const body = await req.json();
    const currentUser = await getCurrentUser();

    const {
      studentName = currentUser?.name || "Anonymous Student",
      studentId = currentUser?.studentId || "",
      studentEmail = currentUser?.email || "",
      answers = {}, // { [questionId]: selectedOptionIndex }
      assignedQuestionIds = [], // Array of question IDs assigned to this student
      timeSpentSeconds = 0,
      isAutoSubmitted = false,
      startedAt = new Date().toISOString(),
    } = body;

    const testRows = await db
      .select()
      .from(tests)
      .where(eq(tests.code, code.toUpperCase()))
      .limit(1);

    if (testRows.length === 0) {
      return NextResponse.json({ error: "Test not found." }, { status: 404 });
    }

    const test = testRows[0];

    // Fetch the assigned questions with actual answers
    if (!assignedQuestionIds || assignedQuestionIds.length === 0) {
      return NextResponse.json({ error: "No assigned questions found in submission." }, { status: 400 });
    }

    const assignedQuestions = await db
      .select()
      .from(questions)
      .where(inArray(questions.id, assignedQuestionIds));

    // Grade the MCQ submission
    const { score, maxScore, percentage, corrections } = gradeMCQSubmission(
      assignedQuestions,
      answers
    );

    const passed = percentage >= test.passScorePercentage ? 1 : 0;
    const submissionId = generateId();
    const submittedAt = new Date().toISOString();

    // Save submission to database linked to student user ID
    await db.insert(submissions).values({
      id: submissionId,
      testId: test.id,
      studentUserId: currentUser?.id || null,
      studentName: studentName.trim() || "Anonymous Student",
      studentId: studentId.trim() || null,
      studentEmail: studentEmail.trim() || null,
      score,
      maxScore,
      percentage,
      passed,
      assignedQuestionsJson: JSON.stringify(assignedQuestionIds),
      answersJson: JSON.stringify(answers),
      timeSpentSeconds: Number(timeSpentSeconds) || 0,
      isAutoSubmitted: isAutoSubmitted ? 1 : 0,
      startedAt,
      submittedAt,
    });

    return NextResponse.json({
      success: true,
      submissionId,
      score,
      maxScore,
      percentage,
      passed: passed === 1,
      passScorePercentage: test.passScorePercentage,
      timeSpentSeconds,
      isAutoSubmitted,
      showCorrectionsImmediately: test.showCorrectionsImmediately === 1,
      corrections: test.showCorrectionsImmediately === 1 ? corrections : [],
    });
  } catch (error: any) {
    console.error("Submit test error:", error);
    return NextResponse.json({ error: error?.message || "Failed to submit test" }, { status: 500 });
  }
}
