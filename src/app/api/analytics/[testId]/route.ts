import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { tests, questions, submissions, organizations } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  try {
    await initDatabase();
    const { testId } = await params;

    const testRows = await db.select().from(tests).where(eq(tests.id, testId)).limit(1);
    if (testRows.length === 0) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    const test = testRows[0];

    // Resolve the school/organization this exam belongs to so class-result
    // reports can be branded with the school name instead of the platform name.
    let organization: { id: string; name: string; brandName: string | null } | null = null;
    if (test.orgId) {
      const orgRows = await db.select().from(organizations).where(eq(organizations.id, test.orgId)).limit(1);
      if (orgRows.length > 0) {
        organization = {
          id: orgRows[0].id,
          name: orgRows[0].name,
          brandName: orgRows[0].brandName || null,
        };
      }
    }

    const testQuestions = await db.select().from(questions).where(eq(questions.testId, testId));
    const testSubmissions = await db
      .select()
      .from(submissions)
      .where(eq(submissions.testId, testId))
      .orderBy(desc(submissions.submittedAt));

    const totalSubmissions = testSubmissions.length;
    let avgPercentage = 0;
    let passCount = 0;
    let maxPercentage = 0;
    let minPercentage = 100;

    if (totalSubmissions > 0) {
      const sumPercentage = testSubmissions.reduce((acc, curr) => acc + curr.percentage, 0);
      avgPercentage = Math.round(sumPercentage / totalSubmissions);
      passCount = testSubmissions.filter((s) => s.passed === 1).length;
      maxPercentage = Math.max(...testSubmissions.map((s) => s.percentage));
      minPercentage = Math.min(...testSubmissions.map((s) => s.percentage));
    } else {
      minPercentage = 0;
    }

    return NextResponse.json({
      test: {
        ...test,
        organizationName: organization ? (organization.brandName || organization.name) : null,
      },
      organization,
      totalQuestions: testQuestions.length,
      stats: {
        totalSubmissions,
        avgPercentage,
        passRate: totalSubmissions > 0 ? Math.round((passCount / totalSubmissions) * 100) : 0,
        maxPercentage,
        minPercentage,
      },
      submissions: testSubmissions,
      questions: testQuestions.map((q) => ({
        id: q.id,
        questionText: q.questionText,
        options: q.optionsJson ? JSON.parse(q.optionsJson) : [],
        correctAnswerIndex: q.correctAnswerIndex,
        explanation: q.explanation,
        marks: q.marks,
        difficulty: q.difficulty,
      })),
    });
  } catch (error: any) {
    console.error("Test analytics error:", error);
    return NextResponse.json({ error: error?.message || "Failed to load analytics" }, { status: 500 });
  }
}
