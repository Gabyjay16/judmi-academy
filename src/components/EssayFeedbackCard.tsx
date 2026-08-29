"use client";

import { 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  BookOpen, 
  TrendingUp,
  FileEdit
} from "lucide-react";
import { getGradeLetter } from "@/lib/utils";

export interface CriterionScore {
  criterion: string;
  score: number;
  maxScore: number;
  comment: string;
}

export interface CorrectedExcerpt {
  original: string;
  suggestion: string;
  reason: string;
}

interface EssayFeedbackCardProps {
  title: string;
  studentName?: string;
  overallScore: number;
  maxScore: number;
  criteriaScores: CriterionScore[];
  strengths: string[];
  weaknesses: string[];
  detailedFeedback: string;
  correctedExcerpts?: CorrectedExcerpt[];
}

export function EssayFeedbackCard({
  title,
  studentName,
  overallScore,
  maxScore,
  criteriaScores,
  strengths,
  weaknesses,
  detailedFeedback,
  correctedExcerpts = [],
}: EssayFeedbackCardProps) {
  const percentage = Math.round((overallScore / maxScore) * 100);
  const gradeInfo = getGradeLetter(percentage);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden space-y-6">
      {/* Top Banner */}
      <div className="p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-indigo-950 to-indigo-900 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-200 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Essay Evaluation Report</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mt-1 tracking-tight text-white">
              {title}
            </h2>
            {studentName && (
              <p className="text-sm text-indigo-200 mt-0.5">
                Author / Student: <span className="font-semibold text-white">{studentName}</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white text-indigo-900 px-5 py-3 rounded-2xl flex flex-col items-center shadow-lg">
              <span className="text-3xl font-extrabold">{overallScore}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                / {maxScore} pts ({percentage}%)
              </span>
            </div>

            <div className="w-14 h-14 rounded-2xl border border-white/20 bg-white/10 flex flex-col items-center justify-center font-bold text-2xl text-white">
              <span>{gradeInfo.letter}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-8">
        {/* Rubric Breakdown Bars */}
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-indigo-600" />
            <span>Rubric & Criteria Evaluation</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {criteriaScores.map((c, i) => {
              const criteriaPct = Math.round((c.score / c.maxScore) * 100);
              return (
                <div key={i} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">{c.criterion}</span>
                    <span className="text-xs font-bold text-indigo-700">
                      {c.score} / {c.maxScore} ({criteriaPct}%)
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${criteriaPct}%` }}
                    />
                  </div>

                  {c.comment && (
                    <p className="text-xs text-slate-600 leading-relaxed pt-1">{c.comment}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Strengths & Areas for Improvement */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Strengths */}
          <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-3">
            <h4 className="text-sm font-bold text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Key Strengths</span>
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-700">
              {strengths.map((s, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Weaknesses */}
          <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50/40 space-y-3">
            <h4 className="text-sm font-bold text-amber-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>Areas for Improvement</span>
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-700">
              {weaknesses.map((w, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Detailed Feedback */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-2">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            <span>Comprehensive Examiner Feedback</span>
          </h4>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
            {detailedFeedback}
          </p>
        </div>

        {/* Inline Excerpt Corrections */}
        {correctedExcerpts && correctedExcerpts.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileEdit className="w-4 h-4 text-indigo-600" />
              <span>Line-by-Line Excerpt Improvements</span>
            </h4>

            <div className="space-y-3">
              {correctedExcerpts.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 text-xs space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-rose-700">Original:</span>
                    <span className="italic text-slate-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 font-mono">
                      "{item.original}"
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-emerald-700">Suggested:</span>
                    <span className="font-medium text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 font-mono">
                      "{item.suggestion}"
                    </span>
                  </div>
                  {item.reason && (
                    <div className="text-slate-500 text-[11px] pt-1">
                      Reason: {item.reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
