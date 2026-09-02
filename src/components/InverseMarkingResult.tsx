"use client";

import { CheckCircle2, XCircle, Scale, TrendingDown, User } from "lucide-react";

export interface InverseMarkingResultData {
  submissionId: string;
  exerciseTitle: string;
  studentName: string;
  accuracyScore: number;
  passed: boolean;
  tolerance: number;
  passThreshold: number;
  totalTeacherMarks: number;
  totalControlMarks: number;
  totalMaxMarks: number;
  deviationTotal: number;
  leniency: number;
  perQuestion: {
    id: string;
    prompt: string;
    maxMarks: number;
    answer: string;
    controlMark: number;
    studentMarks: number;
    deviation: number;
    agreed: boolean;
    justification: string;
  }[];
  submittedAt: string;
}

export default function InverseMarkingResult({ result }: { result: InverseMarkingResultData }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className={`p-5 sm:p-6 border-b border-slate-100 ${result.passed ? "bg-emerald-50/60" : "bg-rose-50/60"}`}>
        <div className="flex flex-wrap items-center gap-2">
          {result.passed ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              PASSED
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200 text-[11px] font-bold">
              <XCircle className="w-3.5 h-3.5" />
              NEEDS REVIEW
            </span>
          )}
          <span className="text-[11px] text-slate-500">
            {result.submittedAt ? new Date(result.submittedAt).toLocaleString() : ""}
          </span>
        </div>
        <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-2">{result.exerciseTitle}</h2>
        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" />
          {result.studentName}
        </p>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {/* Accuracy score */}
        <div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-bold text-slate-700">Marking accuracy</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                How close your marks were to the teacher&apos;s control marks (allowing ±{result.tolerance} mark).
              </p>
            </div>
            <span className="text-3xl font-extrabold text-navy-900 font-mono">{result.accuracyScore}%</span>
          </div>
          <div className="mt-2 h-3 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${result.passed ? "bg-emerald-500" : "bg-rose-500"}`}
              style={{ width: `${Math.min(100, Math.max(0, result.accuracyScore))}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Pass line: <strong>{result.passThreshold}%</strong>. You awarded{" "}
            <strong className="text-slate-800">{result.totalTeacherMarks}</strong> / {result.totalMaxMarks} marks; the
            teacher awarded <strong className="text-slate-800">{result.totalControlMarks}</strong>. Total deviation{" "}
            <strong className="text-slate-800">{result.deviationTotal}</strong> marks.
          </p>
        </div>

        {/* Leniency */}
        <div className="flex items-center gap-2.5 p-3.5 rounded-2xl border border-slate-200 text-xs">
          <TrendingDown className={`w-4 h-4 shrink-0 ${result.leniency >= 0 ? "text-amber-600" : "text-sky-600"}`} />
          <p className="text-slate-600">
            Marker tendency: you were{" "}
            <strong className={result.leniency >= 0 ? "text-amber-700" : "text-sky-700"}>
              {result.leniency >= 0 ? `generous (averaged ${result.leniency} mark${result.leniency === 1 ? "" : "s"} over)` : `strict (averaged ${Math.abs(result.leniency)} mark${Math.abs(result.leniency) === 1 ? "" : "s"} under)`}
            </strong>{" "}
            compared with the teacher&apos;s control marks.
          </p>
        </div>

        {/* Per-question comparison */}
        <div className="space-y-3">
          <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-indigo-600" />
            Your marks vs the teacher&apos;s control marks
          </h3>
          {result.perQuestion.map((q, i) => (
            <div key={q.id} className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="p-3.5 sm:p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-bold text-slate-800 flex-1">
                    Q{i + 1}. {q.prompt}
                  </p>
                  <span
                    className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                      q.agreed ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    {q.agreed ? "In agreement" : `Off by ${q.deviation}`}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
                    You: <strong className="text-navy-900">{q.studentMarks} / {q.maxMarks}</strong>
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    Teacher (control): <strong className="text-emerald-800">{q.controlMark} / {q.maxMarks}</strong>
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200">
                    Teacher&apos;s answer: <strong className="text-indigo-800">{q.answer}</strong>
                  </span>
                </div>

                {q.justification && (
                  <p className="text-[11px] text-slate-600 bg-slate-50 rounded-xl px-3 py-2 text-xs leading-relaxed">
                    <span className="font-bold text-slate-700 block mb-0.5">Your reasoning:</span>
                    {q.justification}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}