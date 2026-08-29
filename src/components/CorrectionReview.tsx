"use client";

import { useState } from "react";
import { 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Lightbulb, 
  Filter,
  Check,
  X
} from "lucide-react";

interface CorrectionItem {
  questionId: string;
  questionText: string;
  options: string[];
  selectedAnswerIndex: number | null;
  correctAnswerIndex: number;
  isCorrect: boolean;
  explanation: string;
  marks: number;
}

interface CorrectionReviewProps {
  corrections: CorrectionItem[];
}

export function CorrectionReview({ corrections }: CorrectionReviewProps) {
  const [filter, setFilter] = useState<"all" | "wrong" | "correct">("all");

  const wrongCount = corrections.filter((c) => !c.isCorrect).length;
  const correctCount = corrections.filter((c) => c.isCorrect).length;

  const filtered = corrections.filter((c) => {
    if (filter === "wrong") return !c.isCorrect;
    if (filter === "correct") return c.isCorrect;
    return true;
  });

  const getOptionLetter = (idx: number) => String.fromCharCode(65 + idx);

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>Detailed Question Review & Corrections</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Review your answers with step-by-step AI explanations for each question.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filter === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All ({corrections.length})
          </button>
          <button
            onClick={() => setFilter("wrong")}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
              filter === "wrong" ? "bg-white text-rose-700 shadow-sm" : "text-slate-600 hover:text-rose-700"
            }`}
          >
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
            Wrong ({wrongCount})
          </button>
          <button
            onClick={() => setFilter("correct")}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
              filter === "correct" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600 hover:text-emerald-700"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Correct ({correctCount})
          </button>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-5">
        {filtered.map((item, index) => {
          const isWrong = !item.isCorrect;
          const wasSkipped = item.selectedAnswerIndex === null;

          return (
            <div
              key={item.questionId || index}
              className={`rounded-2xl border transition-all overflow-hidden bg-white ${
                isWrong
                  ? "border-rose-200/90 shadow-sm shadow-rose-100/50"
                  : "border-emerald-200/90 shadow-sm shadow-emerald-100/50"
              }`}
            >
              {/* Question Top Header */}
              <div
                className={`px-5 py-3 border-b flex items-center justify-between gap-3 text-xs font-semibold ${
                  isWrong ? "bg-rose-50/70 border-rose-100 text-rose-900" : "bg-emerald-50/70 border-emerald-100 text-emerald-900"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-white border flex items-center justify-center font-bold text-slate-800 shadow-xs">
                    {index + 1}
                  </span>
                  <span>Question {index + 1}</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    ({item.marks} mark{item.marks > 1 ? "s" : ""})
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {isWrong ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px]">
                      <XCircle className="w-3.5 h-3.5" />
                      {wasSkipped ? "Unanswered (0 pts)" : "Incorrect (0 pts)"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Correct (+{item.marks} pts)
                    </span>
                  )}
                </div>
              </div>

              {/* Question Body */}
              <div className="p-5 sm:p-6 space-y-4">
                <h3 className="text-base font-semibold text-slate-900 leading-relaxed">
                  {item.questionText}
                </h3>

                {/* Options List */}
                <div className="space-y-2.5">
                  {item.options.map((opt, optIdx) => {
                    const isStudentChoice = item.selectedAnswerIndex === optIdx;
                    const isCorrectAnswer = item.correctAnswerIndex === optIdx;

                    let optionStyles = "border-slate-200 bg-slate-50/40 text-slate-700";
                    let badge = null;

                    if (isCorrectAnswer) {
                      optionStyles = "border-emerald-500 bg-emerald-50 text-emerald-900 font-medium ring-1 ring-emerald-400";
                      badge = (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider">
                          <Check className="w-3 h-3" /> Correct Answer
                        </span>
                      );
                    } else if (isStudentChoice && isWrong) {
                      optionStyles = "border-rose-400 bg-rose-50 text-rose-900 line-through font-medium";
                      badge = (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider">
                          <X className="w-3 h-3" /> Your Choice
                        </span>
                      );
                    }

                    return (
                      <div
                        key={optIdx}
                        className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 text-sm transition-all ${optionStyles}`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                              isCorrectAnswer
                                ? "bg-emerald-600 text-white"
                                : isStudentChoice && isWrong
                                ? "bg-rose-600 text-white"
                                : "bg-slate-200/80 text-slate-700"
                            }`}
                          >
                            {getOptionLetter(optIdx)}
                          </span>
                          <span className="leading-relaxed">{opt}</span>
                        </div>
                        {badge && <div className="shrink-0">{badge}</div>}
                      </div>
                    );
                  })}
                </div>

                {/* AI Explanation Box */}
                {item.explanation && (
                  <div className="mt-4 p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 text-slate-800 space-y-1.5">
                    <div className="flex items-center gap-2 text-indigo-700 font-semibold text-xs uppercase tracking-wider">
                      <Lightbulb className="w-4 h-4 text-indigo-600" />
                      <span>AI Explanation & Concept Guide</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed pl-6">
                      {item.explanation}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
