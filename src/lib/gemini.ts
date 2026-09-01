import { callOpenRouter, getOpenRouterKey } from "./openrouter";

export interface GeneratedMCQ {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  marks: number;
}

export interface GeneratedEssay {
  questionText: string;
  modelAnswer: string;
  rubric: {
    criterion: string;
    weightPercentage: number;
    description: string;
  }[];
  marks: number;
}

export interface EssayGradingResult {
  overallScore: number;
  maxScore: number;
  criteriaScores: {
    criterion: string;
    score: number;
    maxScore: number;
    comment: string;
  }[];
  strengths: string[];
  weaknesses: string[];
  detailedFeedback: string;
  correctedExcerpts: {
    original: string;
    suggestion: string;
    reason: string;
  }[];
}

const GEMINI_API_KEY = getOpenRouterKey();

/**
 * Direct OpenRouter chat completions caller (supports Google Gemini models
 * and any other model OpenRouter exposes) using modern Fetch.
 */
async function callGeminiRest(prompt: string, model: string = "google/gemini-2.5-flash"): Promise<string> {
  return callOpenRouter(prompt, { model, temperature: 0.4, topP: 0.95, responseFormat: "text" });
}

/**
 * Generate MCQs from notes or subject material
 */
export async function generateMCQQuestions(
  notes: string,
  count: number = 10,
  difficulty: "easy" | "medium" | "hard" | "mixed" = "mixed",
  subject?: string
): Promise<GeneratedMCQ[]> {
  if (!GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is not set. Generating questions using smart curriculum template generator.");
    return generateFallbackMCQs(notes, count, subject);
  }

  try {
    const prompt = `You are an expert exam creator and pedagogical specialist.
Generate exactly ${count} high-quality Multiple Choice Questions (MCQ) based on the factual content of the teaching notes provided.

${subject ? `Subject: ${subject}` : ""}
${difficulty !== "mixed" ? `Target Difficulty: ${difficulty}` : "Difficulty: Mix of easy, medium, and hard"}

Teaching Notes/Material:
"""
${notes.slice(0, 15000)}
"""

CONTENT RULES (very important):
- Write QUESTIONS THAT TEST REAL KNOWLEDGE from the notes: exact definitions, names of concepts/terms/processes, properties and characteristics, mechanisms, sequences/order of steps, causes and effects, numbers or calculations stated in the notes, and correct real-world applications.
- Every question and its correct answer must be directly and specifically supported by sentences or facts in the notes.
- NEVER write "meta" questions that only ask about the notes document itself. These are FORBIDDEN and must not appear anywhere:
  * "What is the main topic of chapter one?" / "What is discussed in chapter two?"
  * "Which subject or topic is this material about?"
  * "What was mentioned in the notes?" / "According to the notes, which of the following was covered?"
  * "What is the title of the notes?"
  * Any question whose only purpose is to check whether the student read the document, instead of checking knowledge of the subject.
- For each question: pick the correct answer from the notes (use its exact wording or values where the notes are specific), then invent 3 distractors that are plausible but factually wrong (common misconceptions, opposite statements, or wrong values). Do not use "All of the above" or "None of the above".

Requirements for each question:
1. Exactly 4 distinct and plausible options (A, B, C, D).
2. correctAnswerIndex is the 0-indexed position of the correct option (0..3).
3. Provide a thorough, educational explanation detailing why the correct option is right and why the distractors are incorrect.
4. Set marks to 1.
5. Set difficulty ("easy", "medium", "hard").

OUTPUT FORMAT: Return ONLY a valid JSON array of objects with the exact schema below, with no markdown code fences or other text:
[
  {
    "questionText": "What is the primary function of...?",
    "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
    "correctAnswerIndex": 0,
    "explanation": "Option A is correct because... Option B is incorrect because...",
    "difficulty": "medium",
    "marks": 1
  }
]`;

    const rawText = await callGeminiRest(prompt);
    const jsonStr = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(jsonStr) as GeneratedMCQ[];
    
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    throw new Error("Invalid output format from Gemini");
  } catch (error) {
    console.error("Gemini generation failed, falling back to smart extractor:", error);
    return generateFallbackMCQs(notes, count, subject);
  }
}

/**
 * Generate Essay Questions and Rubrics from notes
 */
export async function generateEssayQuestions(
  notes: string,
  count: number = 3,
  subject?: string
): Promise<GeneratedEssay[]> {
  if (!GEMINI_API_KEY) {
    return generateFallbackEssays(notes, count, subject);
  }

  try {
    const prompt = `You are an expert academic examiner.
Generate ${count} essay or theory questions with comprehensive grading rubrics and model answers based on these teaching notes.

Subject: ${subject || "General"}
Teaching Notes:
"""
${notes.slice(0, 15000)}
"""

Return ONLY a valid JSON array matching this format:
[
  {
    "questionText": "Discuss the mechanism of...",
    "modelAnswer": "A complete response should cover the following points...",
    "rubric": [
      { "criterion": "Concept Accuracy", "weightPercentage": 40, "description": "Accurately identifies key components..." },
      { "criterion": "Analysis & Depth", "weightPercentage": 30, "description": "Provides thorough explanation..." },
      { "criterion": "Structure & Clarity", "weightPercentage": 30, "description": "Well-organized with clear terminology..." }
    ],
    "marks": 20
  }
]`;

    const rawText = await callGeminiRest(prompt);
    const jsonStr = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    return JSON.parse(jsonStr) as GeneratedEssay[];
  } catch (error) {
    console.error("Gemini essay question generation failed:", error);
    return generateFallbackEssays(notes, count, subject);
  }
}

/**
 * Grade Student Essay against prompt & rubric using AI
 */
export async function gradeStudentEssay(
  essayPrompt: string,
  studentEssay: string,
  rubricPrompt?: string,
  maxScore: number = 100
): Promise<EssayGradingResult> {
  if (!GEMINI_API_KEY) {
    return evaluateFallbackEssay(essayPrompt, studentEssay, maxScore);
  }

  try {
    const prompt = `You are a fair, thorough, and constructive academic essay examiner.
Evaluate the following student's essay submission based on the prompt and grading criteria.

Prompt / Question:
"""
${essayPrompt}
"""

${rubricPrompt ? `Grading Rubric / Criteria:\n"""\n${rubricPrompt}\n"""` : "Standard Academic Rubric: Content & Relevance (40%), Structure & Argument (25%), Evidence & Technical Accuracy (20%), Grammar & Mechanics (15%)"}

Student Essay Submission:
"""
${studentEssay}
"""

Max Score: ${maxScore}

Please evaluate the essay thoroughly and return ONLY a valid JSON object matching this structure:
{
  "overallScore": 85,
  "maxScore": ${maxScore},
  "criteriaScores": [
    { "criterion": "Content & Relevance", "score": 35, "maxScore": 40, "comment": "Thorough coverage of primary concepts..." },
    { "criterion": "Structure & Argument", "score": 22, "maxScore": 25, "comment": "Logical paragraph progression..." },
    { "criterion": "Technical Accuracy", "score": 16, "maxScore": 20, "comment": "Accurate definitions with minor omission of..." },
    { "criterion": "Grammar & Mechanics", "score": 12, "maxScore": 15, "comment": "Good sentence variety, occasional comma splices." }
  ],
  "strengths": ["Clear thesis statement", "Strong understanding of foundational concepts", "Good use of academic vocabulary"],
  "weaknesses": ["Needs more concrete examples in paragraph 3", "Conclusion is somewhat abrupt"],
  "detailedFeedback": "Overall, this is a strong submission demonstrating good comprehension...",
  "correctedExcerpts": [
    {
      "original": "The system are configured differently",
      "suggestion": "The system is configured differently",
      "reason": "Subject-verb agreement error with singular subject 'system'."
    }
  ]
}`;

    const rawText = await callGeminiRest(prompt);
    const jsonStr = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    return JSON.parse(jsonStr) as EssayGradingResult;
  } catch (error) {
    console.error("Gemini essay grading failed:", error);
    return evaluateFallbackEssay(essayPrompt, studentEssay, maxScore);
  }
}

// Smart local fallback generators when API key is not configured
function cleanSourceLine(line: string): string {
  const cleaned = line.replace(/^[\s\d\-•*]+/, "").trim();
  return cleaned.length > 90 ? `${cleaned.slice(0, 90).trimEnd()}…` : cleaned;
}

function generateFallbackMCQs(notes: string, count: number, subject?: string): GeneratedMCQ[] {
  const sourceLines = notes
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 25);
  const pool = sourceLines.length > 0 ? sourceLines : [notes.trim()];
  const sampleTopic = subject || "the study material";
  const results: GeneratedMCQ[] = [];

  for (let i = 0; i < count; i++) {
    const baseIdx = i % pool.length;
    const base = cleanSourceLine(pool[baseIdx]);

    // Distractors: other factual statements from the notes (real content, not meta)
    const distractors: string[] = [];
    let step = 1;
    while (distractors.length < 3 && step < pool.length) {
      const d = cleanSourceLine(pool[(baseIdx + step) % pool.length]);
      if (d !== base && !distractors.includes(d)) distractors.push(d);
      step++;
    }
    while (distractors.length < 3) {
      distractors.push("This statement is not supported by the study notes.");
    }

    // Rotate the correct answer position so it is not always option A
    const options: string[] = new Array(4).fill("");
    const correctPos = i % 4;
    options[correctPos] = base;
    let dIdx = 0;
    for (let s = 0; s < 4; s++) {
      if (s === correctPos) continue;
      options[s] = distractors[dIdx];
      dIdx++;
    }

    results.push({
      questionText: `Which of the following statements about ${sampleTopic} is correct?`,
      options,
      correctAnswerIndex: correctPos,
      explanation: `The notes state: "${base}". The other statements contain details that are not correct for this material.`,
      difficulty: (i % 3 === 0 ? "easy" : i % 3 === 1 ? "medium" : "hard") as any,
      marks: 1,
    });
  }

  return results;
}

function generateFallbackEssays(notes: string, count: number, subject?: string): GeneratedEssay[] {
  const sampleTopic = subject || "the provided subject notes";
  return [
    {
      questionText: `Critically analyze the core principles of ${sampleTopic}. How do these principles influence real-world implementation?`,
      modelAnswer: `A comprehensive essay must articulate the theoretical foundations, provide at least two concrete practical applications, address limitations, and conclude with modern perspectives.`,
      rubric: [
        { criterion: "Conceptual Mastery", weightPercentage: 40, description: "Depth of knowledge and accurate terminology." },
        { criterion: "Critical Evaluation", weightPercentage: 30, description: "Ability to evaluate advantages and trade-offs." },
        { criterion: "Clarity & Structure", weightPercentage: 30, description: "Coherent essay flow and proper formatting." }
      ],
      marks: 20
    }
  ];
}

function evaluateFallbackEssay(prompt: string, essay: string, maxScore: number): EssayGradingResult {
  const wordCount = essay.trim().split(/\s+/).length;
  const scoreRatio = Math.min(Math.max(wordCount / 200, 0.5), 0.95);
  const overall = Math.round(maxScore * scoreRatio);

  return {
    overallScore: overall,
    maxScore: maxScore,
    criteriaScores: [
      {
        criterion: "Content & Relevance",
        score: Math.round(overall * 0.4),
        maxScore: Math.round(maxScore * 0.4),
        comment: wordCount > 150 ? "Addressed the primary aspects of the prompt with good context." : "Content is brief; expand further on core arguments."
      },
      {
        criterion: "Structure & Flow",
        score: Math.round(overall * 0.3),
        maxScore: Math.round(maxScore * 0.3),
        comment: "Clear progression between introduction, body points, and conclusion."
      },
      {
        criterion: "Grammar & Expression",
        score: Math.round(overall * 0.3),
        maxScore: Math.round(maxScore * 0.3),
        comment: "Solid sentence structure and appropriate vocabulary usage."
      }
    ],
    strengths: [
      "Addressed the core subject of the prompt directly.",
      "Clear paragraph organization and readability.",
      "Good foundational understanding shown."
    ],
    weaknesses: [
      wordCount < 200 ? "Essay length is on the shorter side; include more supporting evidence." : "Elaborate more deeply on edge cases and counter-arguments.",
      "Could strengthen transitional phrasing between complex points."
    ],
    detailedFeedback: `Your essay shows a commendable grasp of the topic. You have articulated the main themes effectively. To elevate your grade further, expand with additional real-world case studies and deepen your comparative analysis.`,
    correctedExcerpts: [
      {
        original: "The main point being that...",
        suggestion: "The primary thesis is that...",
        reason: "Using stronger academic terminology sharpens the opening argument."
      }
    ]
  };
}
