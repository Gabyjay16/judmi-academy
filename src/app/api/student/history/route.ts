import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { tests, submissions, users, organizations, departments } from "@/db/schema";
import { eq, desc, or, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { seedDemoData } from "@/db/seed";

export async function GET() {
  try {
    await initDatabase();
    await seedDemoData();
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    // Match student submissions by studentUserId, studentEmail, or studentId
    const studentSubmissions = await db
      .select({
        id: submissions.id,
        testId: submissions.testId,
        testTitle: tests.title,
        testSubject: tests.subject,
        testCode: tests.code,
        score: submissions.score,
        maxScore: submissions.maxScore,
        percentage: submissions.percentage,
        passed: submissions.passed,
        timeSpentSeconds: submissions.timeSpentSeconds,
        isAutoSubmitted: submissions.isAutoSubmitted,
        submittedAt: submissions.submittedAt,
      })
      .from(submissions)
      .leftJoin(tests, eq(submissions.testId, tests.id))
      .where(
        or(
          eq(submissions.studentUserId, currentUser.id),
          eq(submissions.studentEmail, currentUser.email),
          currentUser.studentId ? eq(submissions.studentId, currentUser.studentId) : undefined
        )
      )
      .orderBy(desc(submissions.submittedAt));

    // Stats calculations
    const totalTaken = studentSubmissions.length;
    let avgPercentage = 0;
    let passCount = 0;
    let highestScore = 0;

    if (totalTaken > 0) {
      const sum = studentSubmissions.reduce((acc, curr) => acc + curr.percentage, 0);
      avgPercentage = Math.round(sum / totalTaken);
      passCount = studentSubmissions.filter((s) => s.passed === 1).length;
      highestScore = Math.max(...studentSubmissions.map((s) => s.percentage));
    }

    // Available Active Exams for this student
    const activeExams = await db
      .select({
        id: tests.id,
        code: tests.code,
        title: tests.title,
        subject: tests.subject,
        durationMinutes: tests.durationMinutes,
        passScorePercentage: tests.passScorePercentage,
        distributionMode: tests.distributionMode,
      })
      .from(tests)
      .where(eq(tests.status, "active"))
      .orderBy(desc(tests.createdAt))
      .limit(6);

    let organizationName = null;
    let organizationSlug = null;
    let departmentName = null;

    if (currentUser.orgId) {
      const orgRows = await db.select().from(organizations).where(eq(organizations.id, currentUser.orgId)).limit(1);
      if (orgRows.length > 0) {
        organizationName = orgRows[0].name;
        organizationSlug = orgRows[0].slug;
      }
    }

    if ((currentUser as any).departmentId) {
      const deptRows = await db.select().from(departments).where(eq(departments.id, (currentUser as any).departmentId)).limit(1);
      if (deptRows.length > 0) {
        departmentName = deptRows[0].name;
      }
    }

    return NextResponse.json({
      student: {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        studentId: currentUser.studentId,
        orgId: currentUser.orgId,
        organizationName,
        organizationSlug,
        departmentId: (currentUser as any).departmentId,
        departmentName,
      },
      stats: {
        totalTaken,
        avgPercentage,
        passRate: totalTaken > 0 ? Math.round((passCount / totalTaken) * 100) : 0,
        highestScore,
      },
      history: studentSubmissions,
      availableExams: activeExams,
    });
  } catch (error: any) {
    console.error("Student history API error:", error);
    return NextResponse.json({ error: error.message || "Failed to load history" }, { status: 500 });
  }
}
