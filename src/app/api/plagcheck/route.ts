import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { db, initDatabase } from "@/db";
import { plagiarismChecks } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { generateId, generateTestCode } from "@/lib/utils";
import { analyzePlagiarism } from "@/lib/openrouter";

const MIN_TEXT_CHARS = 80;
const MAX_TEXT_CHARS = 60_000;
const COMBINED_THRESHOLD = 30; // approved when Similarity + (AI% * 0.5) <= 30

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }
    if (!currentUser.orgId) {
      return NextResponse.json(
        { error: "This tool is only available to students and teachers registered under a school." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const title = String(body?.title || "").trim() || "Untitled work";
    const text = String(body?.text || "").trim();

    if (text.length < MIN_TEXT_CHARS) {
      return NextResponse.json(
        { error: `Please enter at least ${MIN_TEXT_CHARS} characters of text to check.` },
        { status: 400 }
      );
    }
    if (text.length > MAX_TEXT_CHARS) {
      return NextResponse.json(
        { error: `Text is too long (max ${MAX_TEXT_CHARS.toLocaleString()} characters).` },
        { status: 400 }
      );
    }

    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const textHash = createHash("sha256").update(text).digest("hex");
    const analysis = await analyzePlagiarism(text);

    const combinedScore = Math.max(
      0,
      Math.min(100, Math.round(analysis.similarityPercent + analysis.aiPercent * 0.5))
    );
    const verdict = combinedScore <= COMBINED_THRESHOLD ? "approved" : "flagged";

    // Issue a short, unique verification code.
    let code = generateTestCode();
    for (let i = 0; i < 5; i++) {
      const existing = await db
        .select({ id: plagiarismChecks.id })
        .from(plagiarismChecks)
        .where(eq(plagiarismChecks.code, code))
        .limit(1);
      if (existing.length === 0) break;
      code = generateTestCode();
    }

    const id = generateId();
    const now = new Date().toISOString();
    await db.insert(plagiarismChecks).values({
      id,
      code,
      ownerUserId: currentUser.id,
      orgId: currentUser.orgId,
      title,
      textHash,
      textExcerpt: text.slice(0, 4000),
      wordCount,
      similarityPercent: analysis.similarityPercent,
      aiPercent: analysis.aiPercent,
      combinedScore,
      verdict,
      analysisJson: JSON.stringify({ summary: analysis.summary, flags: analysis.flags }),
      createdAt: now,
    });

    return NextResponse.json({
      success: true,
      check: {
        id,
        code,
        title,
        wordCount,
        similarityPercent: analysis.similarityPercent,
        aiPercent: analysis.aiPercent,
        combinedScore,
        verdict,
        summary: analysis.summary,
        flags: analysis.flags,
        createdAt: now,
      },
    });
  } catch (error: any) {
    console.error("Plagiarism check error:", error);
    return NextResponse.json(
      { error: error?.message || "The authenticity check failed. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const rows = await db
      .select()
      .from(plagiarismChecks)
      .where(eq(plagiarismChecks.ownerUserId, currentUser.id))
      .orderBy(desc(plagiarismChecks.createdAt))
      .limit(50);

    const checks = rows.map((c) => ({
      id: c.id,
      code: c.code,
      title: c.title,
      wordCount: c.wordCount,
      similarityPercent: c.similarityPercent,
      aiPercent: c.aiPercent,
      combinedScore: c.combinedScore,
      verdict: c.verdict,
      createdAt: c.createdAt,
    }));

    return NextResponse.json({ checks });
  } catch (error: any) {
    console.error("List plagiarism checks error:", error);
    return NextResponse.json({ error: "Failed to load your checks." }, { status: 500 });
  }
}

export const maxDuration = 60;