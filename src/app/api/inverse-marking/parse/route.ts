import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { callOpenRouter, isOpenRouterKeyConfigured } from "@/lib/openrouter";
import { canCreateInverseMarking } from "../route";

const MAX_IMAGES_PER_DOC = 6;
const MAX_QUESTIONS = 20;

interface ParsedQuestion {
  prompt: string;
  maxMarks: number;
  markScheme: string;
  answer: string;
  controlMark: number;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Math.round(Number(value));
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

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
      return NextResponse.json({ error: "The AI reader isn't configured on this account. Set an OPENROUTER_API_KEY to use it." }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const questionImages = Array.isArray(body?.questionImages) ? body.questionImages.map(String) : [];
    const answerImages = Array.isArray(body?.answerImages) ? body.answerImages.map(String) : [];

    if (questionImages.length === 0 || answerImages.length === 0) {
      return NextResponse.json(
        { error: "Upload both the question paper and the answered script (as photos or PDFs) so the AI can read them." },
        { status: 400 }
      );
    }

    const qPages = questionImages.slice(0, MAX_IMAGES_PER_DOC);
    const aPages = answerImages.slice(0, MAX_IMAGES_PER_DOC);

    const prompt = `You are an expert academic examiner who converts two photographed/PDF documents into a structured inverse-marking exercise.

I am providing ${qPages.length} page image(s) of a QUESTION PAPER first, followed by ${aPages.length} page image(s) of the TEACHER'S OWN COMPLETED ANSWER SCRIPT (handwritten or typed) for that same paper. The teacher will later ask students to award marks to THIS completed script, then compare the students' marks with the teacher's own control marks.

Tasks:
1. Read every question from the question paper. Keep the question text as close to the original wording as possible in "prompt".
2. For each question, set "maxMarks" from the marks printed on the paper (e.g. "(10 marks)", "[5 pts]", "5"). If no mark is annotated, set 1.
3. Read each answer in the completed script and transcribe it faithfully into "answer" — spelling out handwriting as cleanly as you can while keeping the student-visible content. This is the script students will mark, so preserve the substance (definitions, calculations, diagrams described, etc.).
4. Score the teacher's own answer against each question: set "controlMark" to how many marks that completed answer genuinely deserves (0 to maxMarks, following the rubric). A full, correct answer = maxMarks; partial = proportional lower marks; missing/rushed = low or 0. Do NOT award partial credit above what the written answer shows.
5. If a question's mark scheme/rubric is evident from the paper (e.g. "Content 5, Expression 5"), put a short summary in "markScheme", otherwise leave it "".
6. Mark "isTrap": false for every question.

Rules:
- Output ONLY valid JSON, no markdown fences, no extra text, exactly this shape:
{
  "questions": [
    { "prompt": "...", "maxMarks": 5, "markScheme": "...", "answer": "...", "controlMark": 5 },
    { "prompt": "...", "maxMarks": 10, "markScheme": "...", "answer": "...", "controlMark": 8 }
  ]
}
- At most ${MAX_QUESTIONS} questions. If the paper has more, include the first ${MAX_QUESTIONS}.
- If an answer cannot be read in the scan, write the answer as "[Teacher's handwritten answer not clearly readable in this scan.]" so the teacher can replace it later.
- Do not invent questions that are not on the paper.`;

    const images = [...qPages, ...aPages];
    const raw = await callOpenRouter(
      prompt,
      { model: "google/gemini-2.5-flash", temperature: 0.1, responseFormat: "json" },
      images
    );

    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    let parsed: { questions?: unknown };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "The AI could not read those documents as a structured set of questions. Try clearer photos or fewer pages." }, { status: 422 });
    }

    if (!Array.isArray(parsed?.questions)) {
      return NextResponse.json({ error: "The AI could not find any clear questions in those documents. Try clearer photos or fewer pages." }, { status: 422 });
    }

    const questions: ParsedQuestion[] = [];
    for (const rawQ of parsed.questions as any[]) {
      if (questions.length >= MAX_QUESTIONS) break;
      const promptText = String(rawQ?.prompt || "").trim();
      if (!promptText) continue;
      const maxMarks = clampInt(rawQ?.maxMarks, 1, 100, 1);
      const controlMark = clampInt(rawQ?.controlMark, 0, maxMarks, maxMarks);
      const answerText = String(rawQ?.answer || "").trim();
      questions.push({
        prompt: promptText.slice(0, 2000),
        maxMarks,
        markScheme: String(rawQ?.markScheme || "").trim().slice(0, 300),
        answer: answerText || "[Teacher's handwritten answer not clearly readable in this scan.]",
        controlMark,
      });
    }

    if (questions.length === 0) {
      return NextResponse.json({ error: "No questions could be read from those documents. Try clearer photos or fewer pages." }, { status: 422 });
    }

    return NextResponse.json({ success: true, questionCount: questions.length, questions });
  } catch (error: any) {
    console.error("Parse inverse marking docs error:", error);
    return NextResponse.json({ error: error?.message || "Failed to read those documents with AI. Please try again." }, { status: 500 });
  }
}

export const maxDuration = 60;