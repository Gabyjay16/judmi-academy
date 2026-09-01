import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { tests, questions, submissions } from "@/db/schema";
import { generateId, generateTestCode } from "@/lib/utils";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { seedDemoData } from "@/db/seed";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const body = await req.json();
    const {
      title,
      description,
      subject,
      notesContent,
      durationMinutes,
      distributionMode = "general", // "general" | "shuffled"
      questionsPerStudent = 10,
      passScorePercentage = 50,
      shuffleOptions = true,
      showCorrectionsImmediately = true,
      allowRetake = true,
      questionsList = [], // Array of questions
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Exam title is required." }, { status: 400 });
    }

    if (!questionsList || questionsList.length === 0) {
      return NextResponse.json({ error: "At least one question is required." }, { status: 400 });
    }

    const user = await getCurrentUser();
    const isPaid = user?.planType === "individual" || user?.planType === "school_pro" || user?.role === "admin";
    const finalDistributionMode = (distributionMode === "shuffled" && isPaid && questionsList.length >= 20) ? "shuffled" : "general";

    const actualQuestionsPerStudent = finalDistributionMode === "shuffled" 
      ? Math.min(Number(questionsPerStudent) || questionsList.length, questionsList.length)
      : questionsList.length;

    // The exam time is set manually by the teacher in minutes (no auto-computed duration).
    if (!durationMinutes || Number(durationMinutes) <= 0) {
      return NextResponse.json(
        { error: "Exam duration is required. Please set the time limit in minutes." },
        { status: 400 }
      );
    }
    const finalDurationMinutes = Math.min(300, Math.max(1, Math.round(Number(durationMinutes))));

    const testId = generateId();
    let code = generateTestCode();

    // Ensure code is unique
    let codeExists = await db.select().from(tests).where(eq(tests.code, code)).limit(1);
    while (codeExists.length > 0) {
      code = generateTestCode();
      codeExists = await db.select().from(tests).where(eq(tests.code, code)).limit(1);
    }

    const now = new Date().toISOString();

    await db.insert(tests).values({
      id: testId,
      code,
      title: title.trim(),
      description: description || null,
      subject: subject || null,
      notesContent: notesContent || null,
      durationMinutes: Math.max(1, finalDurationMinutes),
      distributionMode: finalDistributionMode,
      questionsPerStudent: actualQuestionsPerStudent,
      passScorePercentage: Number(passScorePercentage) || 50,
      shuffleOptions: shuffleOptions ? 1 : 0,
      showCorrectionsImmediately: showCorrectionsImmediately ? 1 : 0,
      allowRetake: allowRetake ? 1 : 0,
      teacherUserId: (user as any)?.id || null,
      orgId: (user as any)?.orgId || null,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    // Insert questions
    for (let i = 0; i < questionsList.length; i++) {
      const q = questionsList[i];
      const qId = generateId();
      await db.insert(questions).values({
        id: qId,
        testId,
        questionText: q.questionText,
        type: q.type || "mcq",
        optionsJson: q.options ? JSON.stringify(q.options) : null,
        correctAnswerIndex: q.correctAnswerIndex !== undefined ? Number(q.correctAnswerIndex) : 0,
        explanation: q.explanation || "",
        modelAnswer: q.modelAnswer || null,
        marks: Number(q.marks) || 1,
        difficulty: q.difficulty || "medium",
        orderIndex: i,
        createdAt: now,
      });
    }

    return NextResponse.json({
      success: true,
      testId,
      code,
      durationMinutes: finalDurationMinutes,
      allowRetake: allowRetake ? true : false,
      message: "Test created successfully",
    });
  } catch (error: any) {
    console.error("Create test error:", error);
    return NextResponse.json({ error: error?.message || "Failed to create test" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    await seedDemoData();

    // Scope exams to the logged-in user. Admins see everything, org admins see
    // their whole school, and teachers (including school-registered teachers)
    // see ONLY the exams they created themselves — so the delete action on
    // their dashboard always applies to an exam they own.
    const user = await getCurrentUser();
    let allTests;
    if (!user || user.role === "admin" || user.role === "super_admin") {
      allTests = await db.select().from(tests).orderBy(desc(tests.createdAt));
    } else if (user.role === "org_admin") {
      const orgId = (user as any).orgId;
      const own = eq(tests.teacherUserId, user.id);
      const byOrg = orgId ? or(eq(tests.orgId, orgId), own) : own;
      const legacy = and(isNull(tests.orgId), isNull(tests.teacherUserId));
      allTests = await db
        .select()
        .from(tests)
        .where(or(byOrg, legacy))
        .orderBy(desc(tests.createdAt));
    } else {
      // Teachers (with or without a school): only their own exams.
      allTests = await db
        .select()
        .from(tests)
        .where(eq(tests.teacherUserId, user.id))
        .orderBy(desc(tests.createdAt));
    }

    // Get question count and submission count for each test
    const enrichedTests = await Promise.all(
      allTests.map(async (t) => {
        const qCountRes = await db
          .select({ count: sql<number>`count(*)` })
          .from(questions)
          .where(eq(questions.testId, t.id));

        const subCountRes = await db
          .select({ count: sql<number>`count(*)` })
          .from(submissions)
          .where(eq(submissions.testId, t.id));

        return {
          ...t,
          allowRetake: t.allowRetake === 1,
          totalQuestions: qCountRes[0]?.count || 0,
          submissionCount: subCountRes[0]?.count || 0,
        };
      })
    );

    return NextResponse.json({ tests: enrichedTests });
  } catch (error: any) {
    console.error("List tests error:", error);
    return NextResponse.json({ error: error?.message || "Failed to fetch tests" }, { status: 500 });
  }
}
