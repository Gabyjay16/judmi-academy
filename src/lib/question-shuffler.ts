import { Question } from "@/db/schema";

export interface StudentViewQuestion {
  id: string;
  questionText: string;
  type: string;
  options: string[]; // Options array shown to student
  marks: number;
  difficulty?: string;
  orderIndex: number;
}

/**
 * Seeded PRNG to ensure reproducible randomization for a given student
 */
function createSeededRandom(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  let s = Math.abs(hash) || 123456789;

  return function random() {
    // Linear congruential generator
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/**
 * Shuffle an array using Fisher-Yates with optional custom PRNG
 */
function shuffleArray<T>(array: T[], prng: () => number = Math.random): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Prepare and distribute questions for a specific student taking a test
 */
export function assignQuestionsToStudent(
  allQuestions: Question[],
  distributionMode: "general" | "shuffled",
  questionsPerStudent: number,
  studentIdentifier: string, // e.g. studentId or session token
  testId: string,
  shuffleOptions: boolean = true
): { studentQuestions: StudentViewQuestion[]; assignedQuestionIds: string[] } {
  const seed = `${testId}_${studentIdentifier || Math.random().toString()}`;
  const prng = createSeededRandom(seed);

  let selectedQuestions: Question[] = [];

  if (distributionMode === "general") {
    // In general mode, all students receive the same set of questions in order
    selectedQuestions = [...allQuestions].sort((a, b) => a.orderIndex - b.orderIndex);
  } else {
    // In shuffled mode, questions are randomly picked/distributed so each student gets a unique selection
    const shuffledBank = shuffleArray(allQuestions, prng);
    const count = Math.min(questionsPerStudent || 10, shuffledBank.length);
    selectedQuestions = shuffledBank.slice(0, count);
  }

  const assignedQuestionIds = selectedQuestions.map((q) => q.id);

  // Transform into student-facing view (masking the correct answer and explanations)
  const studentQuestions: StudentViewQuestion[] = selectedQuestions.map((q, idx) => {
    let options: string[] = [];
    try {
      options = q.optionsJson ? JSON.parse(q.optionsJson) : [];
    } catch {
      options = [];
    }

    return {
      id: q.id,
      questionText: q.questionText,
      type: q.type,
      options: options,
      marks: q.marks,
      difficulty: q.difficulty || "medium",
      orderIndex: idx + 1,
    };
  });

  return { studentQuestions, assignedQuestionIds };
}

/**
 * Evaluate submitted answers against actual question answer keys
 */
export function gradeMCQSubmission(
  allAssignedQuestions: Question[],
  submittedAnswers: Record<string, number> // questionId -> selectedIndex
): {
  score: number;
  maxScore: number;
  percentage: number;
  corrections: {
    questionId: string;
    questionText: string;
    options: string[];
    selectedAnswerIndex: number | null;
    correctAnswerIndex: number;
    isCorrect: boolean;
    explanation: string;
    marks: number;
  }[];
} {
  let score = 0;
  let maxScore = 0;

  const corrections = allAssignedQuestions.map((q) => {
    let options: string[] = [];
    try {
      options = q.optionsJson ? JSON.parse(q.optionsJson) : [];
    } catch {
      options = [];
    }

    const selectedIndex = submittedAnswers[q.id] !== undefined ? Number(submittedAnswers[q.id]) : null;
    const isCorrect = selectedIndex !== null && selectedIndex === q.correctAnswerIndex;
    const questionMarks = q.marks || 1;

    maxScore += questionMarks;
    if (isCorrect) {
      score += questionMarks;
    }

    return {
      questionId: q.id,
      questionText: q.questionText,
      options,
      selectedAnswerIndex: selectedIndex,
      correctAnswerIndex: q.correctAnswerIndex ?? 0,
      isCorrect,
      explanation: q.explanation || "No explanation provided.",
      marks: questionMarks,
    };
  });

  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  return {
    score,
    maxScore,
    percentage,
    corrections,
  };
}
