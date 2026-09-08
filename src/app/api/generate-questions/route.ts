import { NextRequest, NextResponse } from "next/server";
import { generateMCQQuestions, generateEssayQuestions } from "@/lib/gemini";
import { getCurrentUser } from "@/lib/auth";
import { checkUserQuota, incrementUserQuota, enforceServiceAccess } from "@/lib/plan-limits";
import { initDatabase } from "@/db";

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();
    const body = await req.json();
    const { notes, count = 10, difficulty = "mixed", subject, type = "mcq" } = body;

    if (!notes || typeof notes !== "string" || notes.trim().length === 0) {
      return NextResponse.json(
        { error: "Teaching notes or material text is required." },
        { status: 400 }
      );
    }

    // Enforce per-service access control (admin/granted)
    const denied = await enforceServiceAccess("generateQuestions", currentUser);
    if (denied) return denied;

    // Check freemium usage quota
    if (currentUser) {
      const quota = await checkUserQuota(currentUser, "examGenerations");
      if (!quota.allowed) {
        return NextResponse.json(
          {
            error: `You have reached your limit of ${quota.limit} free AI exam generations on the Starter Plan. Please upgrade to Pro for unlimited access.`,
            quotaReached: true,
            limit: quota.limit,
            used: quota.used,
          },
          { status: 403 }
        );
      }
    }

    let questionsResult;
    if (type === "essay") {
      questionsResult = await generateEssayQuestions(notes, Number(count) || 3, subject);
    } else {
      questionsResult = await generateMCQQuestions(
        notes,
        Math.min(Math.max(Number(count) || 5, 1), 50),
        difficulty,
        subject
      );
    }

    // Increment usage counter on success
    if (currentUser) {
      await incrementUserQuota(currentUser.id, "examGenerations");
    }

    return NextResponse.json({ success: true, questions: questionsResult });
  } catch (error: any) {
    console.error("Question generation API error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate questions." },
      { status: 500 }
    );
  }
}
