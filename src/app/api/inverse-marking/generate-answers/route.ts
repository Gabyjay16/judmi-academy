import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { callOpenRouter, isOpenRouterKeyConfigured } from "@/lib/openrouter";
import { canCreateInverseMarking } from "../route";

const MAX_QUESTIONS = 20;

type AnswerStyle = "professional" | "medium" | "poor" | "mix";

const STYLE_GUIDE: Record<AnswerStyle, string> = {
  professional:
    "PROFESSIONAL / EXCELLENT: The script reads like a top student's polished exam answer — accurate, well-structured, complete, and uses correct terminology. It should fully deserve near-full marks (aim 90-100% of each question's marks).",
  medium:
    "MEDIUM / AVERAGE: The script reads like an average student's exam answer — broadly correct idea, but with vague phrasing, minor errors, some missing depth or a skipped detail, and weaker structure. It should deserve around 55-75% of each question's marks.",
  poor:
    "POOR / WEAK: The script reads like a weak student's answer — key concepts missing or confused, shallow, terse, with obvious mistakes, but still trying. It should deserve around 20-45% of each question's marks.",
  mix: "MIXED: Vary the quality realistically across the questions in one test-worth: roughly a third professional-quality, a third medium, a third poor. Every answer must genuinely deserve the control mark you assign it.",
};

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }
    if (!canCreateInverseMarking(currentUser.role)) {
      return NextResponse.json({ error: "Only teachers can create inverse marking exercises." }, { status: 403 });
    }
    if (!isOpenRouterKeyConfigured()) {
      return NextResponse.json({ error: "The AI answer writer isn't configured on this account. Set an OPENROUTER_API_KEY to use it." }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const rawQuestions = Array.isArray(body?.questions) ? body.questions : [];
    const style = String(body?.style || "medium") as AnswerStyle;
    if (!STYLE_GUIDE[style]) {
      return NextResponse.json({ error: "Choose a valid answer style." }, { status: 400 });
    }
    if (rawQuestions.length < 1 || rawQuestions.length > MAX_QUESTIONS) {
      return NextResponse.json({ error: `Add between 1 and ${MAX_QUESTIONS} questions first.` }, { status: 400 });
    }

    const questions: { prompt: string; maxMarks: number; markScheme: string }[] = [];
    for (const q of rawQuestions) {
      const prompt = String(q?.prompt || "").trim();
      const maxMarks = Math.max(1, Math.min(100, Math.round(Number(q?.maxMarks) || 0)));
      const markScheme = String(q?.markScheme || "").trim();
      if (!prompt) {
        return NextResponse.json({ error: "Every question needs a prompt so the AI can answer it." }, { status: 400 });
      }
      questions.push({ prompt, maxMarks, markScheme });
    }

    const numbered = questions
      .map((q, i) => {
        const scheme = q.markScheme ? ` (mark scheme/rubric: ${q.markScheme})` : "";
        return `Question ${i + 1} [${q.maxMarks} marks]${scheme}: ${q.prompt}`;
      })
      .join("\n\n");

    const prompt = `You are an expert examiner and a believable student-voice writer who creates the TEACHER'S COMPLETED ANSWER SCRIPT used for an inverse-marking exercise. In inverse marking, students award marks to the teacher's script, and the teacher then grades how closely the students' marks match the teacher's control marks.

The requested script quality is:
${STYLE_GUIDE[style]}

Write a complete, realistic exam script answering EVERY question below — written the way a real student of that quality would on paper (natural phrasing, occasional abbreviations; professional quality still reads like a strong student, not an essay from an AI assistant). One answer per question.

For every question:
1. "answer": the completed answer text. It must be long/complete enough for students to grade (at least a few full sentences — never a single word unless the question genuinely is).
2. "controlMark": an honest score for what THIS answer deserves against the question's rubric — exactly consistent with the quality level above. State the certainty: full marks only when the answer truly earns it.
3. "markScheme": a short rubric summary that justifies the control mark (e.g. "Definition 3, process 4, example 3 — definition present, example weak"). Leave "" only if no sensible rubric applies.

Rules:
- Do NOT "correct" the answers — write them at the requested quality as-is, including the flaws for medium/poor.
- The script must allow a careful student to award marks close to the control marks; the flaws must be gradeable, not invisible.
- Respond with ONLY valid JSON, no markdown fences, exactly this shape and order (same order as the questions below):
{
  "questions": [
    { "answer": "...", "controlMark": 8, "markScheme": "..." },
    { "answer": "...", "controlMark": 3, "markScheme": "..." }
  ]
}

QUESTIONS:
${numbered}`;

    const raw = await callOpenRouter(prompt, {
      model: "google/gemini-2.5-flash",
      temperature: 0.6,
      responseFormat: "json",
    });

    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    let parsed: { questions?: unknown };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "The AI did not return a usable answer script. Please try again." }, { status: 422 });
    }
    const list = Array.isArray(parsed?.questions) ? parsed.questions : [];
    if (list.length !== questions.length) {
      return NextResponse.json({ error: "The AI returned a mismatched answer count. Please try again." }, { status: 422 });
    }

    const results = questions.map((q, i) => {
      const item = list[i] as any;
      const answer = String(item?.answer || "").trim();
      const controlMark = Math.max(0, Math.min(q.maxMarks, Math.round(Number(item?.controlMark)) || 0));
      return {
        prompt: q.prompt,
        maxMarks: q.maxMarks,
        markScheme: String(item?.markScheme || "").trim().slice(0, 300),
        answer: answer || "[AI could not draft this answer — replace it.]",
        controlMark,
      };
    });

    return NextResponse.json({ success: true, questionCount: results.length, questions: results });
  } catch (error: any) {
    console.error("Generate inverse-marking answers error:", error);
    return NextResponse.json({ error: error?.message || "Failed to draft the answers with AI. Please try again." }, { status: 500 });
  }
}

export const maxDuration = 60;