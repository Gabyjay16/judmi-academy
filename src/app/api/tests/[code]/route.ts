import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { tests, questions, submissions, organizations } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { assignQuestionsToStudent } from "@/lib/question-shuffler";
import { seedDemoData } from "@/db/seed";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    await initDatabase();
    await seedDemoData();
    const { code } = await params;
    const { searchParams } = new URL(req.url);
    const studentName = searchParams.get("studentName")?.trim();
    const studentId = searchParams.get("studentId")?.trim();
    const studentIdentifier = studentId || studentName || "guest";

    const testRows = await db
      .select()
      .from(tests)
      .where(eq(tests.code, code.toUpperCase()))
      .limit(1);

    if (testRows.length === 0) {
      return NextResponse.json({ error: "Test not found. Please check your exam code." }, { status: 404 });
    }

    const test = testRows[0];

    if (test.status !== "active") {
      return NextResponse.json({ error: "This exam is currently closed or archived." }, { status: 403 });
    }

    // Check if retakes are disabled and student has already taken this test
    const allowRetake = test.allowRetake === 1;
    if (!allowRetake && (studentName || studentId)) {
      let existingSub = null;
      if (studentId) {
        const checkId = await db
          .select()
          .from(submissions)
          .where(and(eq(submissions.testId, test.id), eq(submissions.studentId, studentId)))
          .limit(1);
        if (checkId.length > 0) existingSub = checkId[0];
      }
      
      if (!existingSub && studentName) {
        const checkName = await db
          .select()
          .from(submissions)
          .where(and(eq(submissions.testId, test.id), eq(submissions.studentName, studentName)))
          .limit(1);
        if (checkName.length > 0) existingSub = checkName[0];
      }

      if (existingSub) {
        return NextResponse.json({
          error: "Retakes are not allowed for this exam by your instructor.",
          hasSubmitted: true,
          allowRetake: false,
          previousSubmissionId: existingSub.id,
        }, { status: 403 });
      }
    }

    // Fetch all questions for this test
    const allQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.testId, test.id));

    if (allQuestions.length === 0) {
      return NextResponse.json({ error: "No questions found in this test." }, { status: 400 });
    }

    // Apply General vs Shuffled/Unique distribution algorithm
    const { studentQuestions, assignedQuestionIds } = assignQuestionsToStudent(
      allQuestions,
      test.distributionMode as "general" | "shuffled",
      test.questionsPerStudent,
      studentIdentifier,
      test.id,
      test.shuffleOptions === 1
    );

    // Lookup Organization if this is a School/Org test
    let organization: { id: string; name: string; slug: string } | null = null;
    if (test.orgId) {
      const orgRows = await db.select().from(organizations).where(eq(organizations.id, test.orgId)).limit(1);
      if (orgRows.length > 0) {
        organization = {
          id: orgRows[0].id,
          name: orgRows[0].name,
          slug: orgRows[0].slug,
        };
      }
    }

    return NextResponse.json({
      test: {
        id: test.id,
        code: test.code,
        title: test.title,
        description: test.description,
        subject: test.subject,
        durationMinutes: test.durationMinutes,
        distributionMode: test.distributionMode,
        passScorePercentage: test.passScorePercentage,
        allowRetake: test.allowRetake === 1,
        totalQuestions: studentQuestions.length,
        orgId: test.orgId || null,
        organization,
      },
      questions: studentQuestions,
      assignedQuestionIds,
    });
  } catch (error: any) {
    console.error("Fetch test by code error:", error);
    return NextResponse.json({ error: error?.message || "Failed to fetch test" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const { code } = await params;
    const testRows = await db
      .select()
      .from(tests)
      .where(eq(tests.code, code.toUpperCase()))
      .limit(1);

    if (testRows.length === 0) {
      return NextResponse.json({ error: "Test not found." }, { status: 404 });
    }

    const test = testRows[0];

    // Only the owning teacher, an admin, or a member of the owning org may delete.
    const isAdmin = user.role === "admin" || user.role === "org_admin" || user.role === "super_admin";
    const ownsExam = test.teacherUserId === user.id;
    const sameOrg = user.orgId && test.orgId === user.orgId;

    if (!isAdmin && !ownsExam && !sameOrg) {
      return NextResponse.json({ error: "You do not have permission to delete this exam." }, { status: 403 });
    }

    await db.delete(tests).where(eq(tests.id, test.id));

    return NextResponse.json({ success: true, message: "Exam deleted successfully." });
  } catch (error: any) {
    console.error("Delete test error:", error);
    return NextResponse.json({ error: error?.message || "Failed to delete test" }, { status: 500 });
  }
}
