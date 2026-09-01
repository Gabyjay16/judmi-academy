import { NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { plagiarismChecks, users, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const { code } = await params;
    const checkRows = await db
      .select()
      .from(plagiarismChecks)
      .where(eq(plagiarismChecks.code, code.trim().toUpperCase()))
      .limit(1);
    if (checkRows.length === 0) {
      return NextResponse.json({ error: "No plagiarism check found for that code. Check the code and try again." }, { status: 404 });
    }

    const check = checkRows[0];

    // Same-school scope: only the student's school (or a global admin) may view it.
    const isAdmin = currentUser.role === "admin";
    if (!isAdmin && check.orgId !== currentUser.orgId) {
      return NextResponse.json(
        { error: "This code does not belong to your school. Only the same school can view it." },
        { status: 403 }
      );
    }
    // Students may only view their own checks.
    if (currentUser.role === "student" && check.ownerUserId !== currentUser.id) {
      return NextResponse.json({ error: "You can only view your own checks." }, { status: 403 });
    }

    const ownerRows = check.ownerUserId
      ? await db.select().from(users).where(eq(users.id, check.ownerUserId)).limit(1)
      : [];
    const orgRows = check.orgId
      ? await db.select().from(organizations).where(eq(organizations.id, check.orgId)).limit(1)
      : [];

    let analysis = { summary: "", flags: [] as { sample: string; reason: string }[] };
    try {
      const parsed = check.analysisJson ? JSON.parse(check.analysisJson) : null;
      if (parsed) {
        analysis = {
          summary: String(parsed.summary || ""),
          flags: Array.isArray(parsed.flags) ? parsed.flags : [],
        };
      }
    } catch {}

    return NextResponse.json({
      check: {
        id: check.id,
        code: check.code,
        title: check.title,
        wordCount: check.wordCount,
        similarityPercent: check.similarityPercent,
        aiPercent: check.aiPercent,
        combinedScore: check.combinedScore,
        verdict: check.verdict,
        textExcerpt: check.textExcerpt,
        textHash: check.textHash,
        summary: analysis.summary,
        flags: analysis.flags,
        createdAt: check.createdAt,
      },
      student: ownerRows[0]
        ? {
            name: ownerRows[0].name,
            email: ownerRows[0].email,
            studentId: ownerRows[0].studentId || null,
          }
        : null,
      schoolName: orgRows[0] ? orgRows[0].brandName || orgRows[0].name : null,
    });
  } catch (error: any) {
    console.error("Plagiarism check lookup error:", error);
    return NextResponse.json({ error: error?.message || "Failed to load this check." }, { status: 500 });
  }
}