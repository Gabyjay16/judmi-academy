import { NextRequest, NextResponse } from "next/server";
import { gradeStudentEssay } from "@/lib/gemini";
import { db, initDatabase } from "@/db";
import { essayGradings } from "@/db/schema";
import { generateId } from "@/lib/utils";
import { desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { checkUserQuota, incrementUserQuota, enforceServiceAccess } from "@/lib/plan-limits";

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();
    const body = await req.json();
    const {
      title = "Essay Submission",
      studentName = "Anonymous Student",
      essayPrompt,
      rubricPrompt,
      studentEssay,
      maxScore = 100,
    } = body;

    if (!essayPrompt || !studentEssay) {
      return NextResponse.json(
        { error: "Both essay prompt and student essay text are required." },
        { status: 400 }
      );
    }

    // Enforce per-service access control (admin/granted)
    const denied = await enforceServiceAccess("gradeEssays", currentUser);
    if (denied) return denied;

    // Check user quota for essay gradings
    if (currentUser) {
      const quota = await checkUserQuota(currentUser, "essayGradings");
      if (!quota.allowed) {
        return NextResponse.json(
          {
            error: `You have used your ${quota.limit} free AI essay evaluations on the Starter Plan. Please upgrade to Pro for unlimited essay marking.`,
            quotaReached: true,
            limit: quota.limit,
            used: quota.used,
          },
          { status: 403 }
        );
      }
    }

    // Call Gemini AI to grade the essay
    const result = await gradeStudentEssay(
      essayPrompt,
      studentEssay,
      rubricPrompt,
      Number(maxScore) || 100
    );

    const gradingId = generateId();
    const now = new Date().toISOString();

    // Persist to Turso / SQLite database
    await db.insert(essayGradings).values({
      id: gradingId,
      teacherUserId: currentUser?.id || null,
      title,
      studentName,
      essayPrompt,
      rubricPrompt: rubricPrompt || null,
      studentEssay,
      overallScore: result.overallScore,
      maxScore: result.maxScore,
      criteriaScoresJson: JSON.stringify(result.criteriaScores),
      strengthsJson: JSON.stringify(result.strengths),
      weaknessesJson: JSON.stringify(result.weaknesses),
      detailedFeedback: result.detailedFeedback,
      correctedExcerptsJson: JSON.stringify(result.correctedExcerpts),
      createdAt: now,
    });

    if (currentUser) {
      await incrementUserQuota(currentUser.id, "essayGradings");
    }

    return NextResponse.json({
      success: true,
      id: gradingId,
      grading: result,
    });
  } catch (error: any) {
    console.error("Essay grading API error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to evaluate essay." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const rows = await db.select().from(essayGradings).where(eq(essayGradings.id, id)).limit(1);
      if (rows.length === 0) {
        return NextResponse.json({ error: "Grading record not found" }, { status: 404 });
      }
      const record = rows[0];
      return NextResponse.json({
        record: {
          ...record,
          criteriaScores: JSON.parse(record.criteriaScoresJson),
          strengths: record.strengthsJson ? JSON.parse(record.strengthsJson) : [],
          weaknesses: record.weaknessesJson ? JSON.parse(record.weaknessesJson) : [],
          correctedExcerpts: record.correctedExcerptsJson ? JSON.parse(record.correctedExcerptsJson) : [],
        },
      });
    }

    const list = await db.select().from(essayGradings).orderBy(desc(essayGradings.createdAt)).limit(30);
    return NextResponse.json({ gradings: list });
  } catch (error: any) {
    console.error("Fetch essays error:", error);
    return NextResponse.json({ error: error?.message || "Failed to fetch essays" }, { status: 500 });
  }
}
