"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Scale,
  ArrowLeft,
  ArrowRight,
  KeyRound,
  Loader2,
  Sparkles,
  AlertTriangle,
  User,
  Lock,
  BookOpenCheck,
} from "lucide-react";
import InverseMarkingResult, { InverseMarkingResultData } from "@/components/InverseMarkingResult";

interface ExerciseQuestion {
  id: string;
  prompt: string;
  maxMarks: number;
  markScheme?: string;
  answer: string;
  isTrap?: boolean;
  controlMark?: number;
}

interface Exercise {
  id: string;
  code: string;
  title: string;
  instruction?: string | null;
  questions: ExerciseQuestion[];
  tolerance: number;
  passThreshold: number;
  status: string;
  showResultsToStudents?: boolean;
  createdAt: string;
}

export default function StudentInverseMarkingPage() {
  const [codeInput, setCodeInput] = useState("");
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [teacherName, setTeacherName] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "marking" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [marks, setMarks] = useState<Record<string, { marks: string; justification: string }>>({});
  const [result, setResult] = useState<InverseMarkingResultData | null>(null);
  const [revealAnswer, setRevealAnswer] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (code && code.trim().length >= 4) {
      loadExercise(code.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadExercise = useCallback(async (code: string) => {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch(`/api/inverse-marking/${code.trim().toUpperCase()}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Could not load that exercise.");
        setStatus("idle");
        return;
      }
      setExercise(json.exercise);
      setTeacherName(json.teacher?.name || null);
      const initial: Record<string, { marks: string; justification: string }> = {};
      json.exercise.questions.forEach((q: ExerciseQuestion) => {
        initial[q.id] = { marks: "", justification: "" };
      });
      setMarks(initial);
      setStatus("marking");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setError(err?.message || "Could not load that exercise.");
      setStatus("idle");
    }
  }, []);

  const submitMarks = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (studentName.trim().length < 2) {
      setError("Please enter your name.");
      return;
    }
    for (const q of exercise?.questions || []) {
      const entry = marks[q.id];
      const value = entry ? Math.round(Number(entry.marks)) : NaN;
      if (Number.isNaN(value) || value < 0 || value > q.maxMarks) {
        setError(`Award between 0 and ${q.maxMarks} marks for every question (check Q: "${q.prompt.slice(0, 50)}").`);
        return;
      }
      if ((entry?.justification || "").trim().length < 2) {
        setError("Explain your marks for every question — at least a short reason.");
        return;
      }
    }

    setSubmitting(true);
    const payload = {
      studentName: studentName.trim(),
      studentEmail: studentEmail.trim() || undefined,
      marks: (exercise?.questions || []).map((q) => ({
        qId: q.id,
        marks: Math.round(Number(marks[q.id]?.marks)),
        justification: marks[q.id]?.justification.trim(),
      })),
    };

    try {
      const res = await fetch(`/api/inverse-marking/${exercise?.code}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to submit your marks.");
        return;
      }
      setResult(json.result);
      setStatus("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setError(err?.message || "Failed to submit your marks.");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setExercise(null);
    setResult(null);
    setStudentName("");
    setStudentEmail("");
    setMarks({});
    setRevealAnswer({});
    setCodeInput("");
    setStatus("idle");
  };

  if (status === "done" && result) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        <Link href="/student/dashboard" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Inverse Marking — Result</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              Here is how your marks compare with the teacher&apos;s control marks. That comparison is the real lesson — reread it to sharpen your marking eye.
            </p>
          </div>
        </div>
        <InverseMarkingResult result={result} />
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => { setExercise(null); setResult(null); setStatus("idle"); setCodeInput(""); }}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors"
          >
            Mark another exercise
          </button>
          <Link href="/student/dashboard" className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (status === "marking" && exercise) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Exit this exercise
        </button>

        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">{exercise.title}</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {teacherName ? `Set by ${teacherName}` : "Set by your teacher"}
              {exercise.passThreshold ? ` • Pass at ${exercise.passThreshold}% accuracy` : ""} • Code{" "}
              <span className="font-mono font-bold tracking-widest text-slate-700">{exercise.code}</span>
            </p>
          </div>
        </div>

        {exercise.status !== "active" && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            This exercise has been closed by the teacher. You can still read it, but submissions are no longer accepted.
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* How it works mini-note */}
        <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 leading-relaxed">
          <p className="font-bold flex items-center gap-1.5 mb-1">
            <BookOpenCheck className="w-4 h-4 text-indigo-600" />
            The teacher wrote this script and marked it themselves. Your job:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-indigo-800">
            <li>Read each question and the teacher&apos;s answer.</li>
            <li>Award marks like a real examiner — with your best judgement (0 to the question&apos;s max).</li>
            <li>Write a short reason for the marks you gave (this is what the teacher grades).</li>
            <li>Submit to see how your marks compare with the teacher&apos;s control marks.</li>
          </ol>
        </div>

        {/* Student identity */}
        <form onSubmit={submitMarks} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                <User className="w-3.5 h-3.5 text-indigo-600" /> Your full name
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g. Aisha N. Kamga"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-600" /> Email (optional)
              </label>
              <input
                type="email"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                placeholder="you@school.edu"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {exercise.questions.map((q, i) => {
            const entry = marks[q.id] || { marks: "", justification: "" };
            return (
              <div key={q.id} className="rounded-2xl border border-slate-200 overflow-hidden">
                {/* Question header */}
                <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-100">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-extrabold text-slate-800 flex-1">
                      {q.isTrap && (
                        <span className="mr-2 inline-block px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold align-middle">
                          TRAP
                        </span>
                      )}
                      Q{i + 1}. {q.prompt}
                    </p>
                    <span className="shrink-0 text-[11px] font-bold text-slate-500 bg-white border border-slate-200 rounded-lg px-2.5 py-1">
                      {q.maxMarks} mark{q.maxMarks === 1 ? "" : "s"}
                    </span>
                  </div>
                  {q.markScheme && (
                    <p className="text-[11px] text-slate-500 mt-2 italic">Rubric: {q.markScheme}</p>
                  )}

                  {/* Reference answer toggle */}
                  <button
                    type="button"
                    onClick={() => setRevealAnswer((prev) => ({ ...prev, [q.id]: !prev[q.id] }))}
                    className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    <BookOpenCheck className="w-3.5 h-3.5" />
                    {revealAnswer[q.id] ? "Hide" : "Reveal"} the teacher&apos;s answer
                  </button>
                </div>

                {revealAnswer[q.id] && (
                  <div className="px-4 sm:px-5 py-3 bg-emerald-50/50 border-b border-emerald-100">
                    <p className="text-xs font-bold text-emerald-800 mb-1">Teacher&apos;s script (the answer you must mark):</p>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{q.answer}</p>
                  </div>
                )}

                {/* Marking inputs */}
                <div className="p-4 sm:p-5 space-y-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="text-xs font-bold text-slate-700">Award marks (0–{q.maxMarks}):</label>
                    <input
                      type="number"
                      min={0}
                      max={q.maxMarks}
                      step={1}
                      value={entry.marks}
                      onChange={(e) => {
                        const v = e.target.value;
                        setMarks((prev) => ({ ...prev, [q.id]: { ...prev[q.id], marks: v } }));
                      }}
                      placeholder="0"
                      className="w-20 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-mono font-bold text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-[11px] text-slate-400">
                      Marks awarded must total how fully the answer meets the question.
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Why did you give these exact marks?
                    </label>
                    <textarea
                      value={entry.justification}
                      onChange={(e) => {
                        const v = e.target.value;
                        setMarks((prev) => ({ ...prev, [q.id]: { ...prev[q.id], justification: v } }));
                      }}
                      rows={2}
                      placeholder="e.g. The paragraph covers the definition fully but misses the example, so I deducted 2 marks."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/20 inline-flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Comparing with control marks…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Submit my marks
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              The teacher&apos;s control marks stay hidden until you submit.
            </span>
          </div>
        </form>
      </div>
    );
  }

  // Idle / loading — code entry screen
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-6">
      <Link href="/student/dashboard" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
      </Link>

      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
          <Scale className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Inverse Marking</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Your teacher wrote a script and marked it themselves. You mark the same script against the question marks — then see how close you came to the teacher&apos;s control marks.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (codeInput.trim().length >= 4) loadExercise(codeInput);
          else setError("Please enter the exercise code from your teacher.");
        }}
        className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4"
      >
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-extrabold text-slate-800">Enter your exercise code</h2>
        </div>
        <input
          type="text"
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
          placeholder="e.g. HK4T9W"
          maxLength={6}
          disabled={status === "loading"}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-center font-mono font-extrabold tracking-[0.4em] text-xl uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={status === "loading" || codeInput.trim().length < 4}
          className="w-full px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/20 inline-flex items-center justify-center gap-1.5"
        >
          {status === "loading" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Loading exercise…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" /> Start marking
            </>
          )}
        </button>
        <p className="text-[11px] text-slate-400 text-center">
          Ask your teacher for the exercise code. The teacher&apos;s control marks are hidden until you submit.
        </p>
      </form>
    </div>
  );
}