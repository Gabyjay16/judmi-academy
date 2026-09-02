"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Scale,
  ArrowLeft,
  Copy,
  Check,
  Users,
  AlertTriangle,
  Loader2,
  ChevronRight,
  Trash2,
  Play,
  Pause,
  BarChart3,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface Question {
  id: string;
  prompt: string;
  maxMarks: number;
  markScheme?: string;
  answer: string;
  controlMark: number;
  isTrap?: boolean;
}

interface Submission {
  id: string;
  studentName: string;
  studentEmail?: string | null;
  marks: { qId: string; marks: number; justification: string }[];
  totalTeacherMarks: number;
  totalControlMarks: number;
  totalMaxMarks: number;
  deviationTotal: number;
  accuracyScore: number;
  passed: boolean;
  leniency: number;
  submittedAt: string;
}

interface ExerciseData {
  id: string;
  code: string;
  title: string;
  instruction?: string | null;
  questions: Question[];
  tolerance: number;
  passThreshold: number;
  status: "active" | "ended";
  showResultsToStudents: boolean;
  createdAt: string;
}

export default function InverseMarkingResults({ params }: { params: Promise<{ code: string }> }) {
  const router = useRouter();
  const [code, setCode] = useState<string | null>(null);
  const [exercise, setExercise] = useState<ExerciseData | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [patched, setPatched] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setCode(p.code));
  }, [params]);

  const fetchData = useCallback(async () => {
    if (!code) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/inverse-marking/${code}`);
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 404) {
          setError("Exercise not found. Check the code and try again.");
        } else {
          setError(json.error || "Failed to load this exercise.");
        }
        return;
      }
      setExercise(json.exercise);
      setSubmissions(json.submissions || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load this exercise.");
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    if (code) fetchData();
  }, [code, fetchData]);

  const copyId = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const setExerciseStatus = async (status: "active" | "ended") => {
    if (!exercise) return;
    setPatched(true);
    try {
      const res = await fetch(`/api/inverse-marking/${exercise.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_status", status }),
      });
      const json = await res.json();
      if (res.ok) {
        setExercise((prev) => (prev ? { ...prev, status } : prev));
      } else {
        alert(json.error || "Failed to update the exercise.");
      }
    } catch (err: any) {
      alert(err?.message || "Failed to update the exercise.");
    } finally {
      setPatched(false);
    }
  };

  const handleDelete = async () => {
    if (!exercise) return;
    if (!window.confirm(`Delete "${exercise.title}"?\n\nThis permanently removes the exercise and all ${submissions.length} submission(s). This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/inverse-marking/${exercise.id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok) {
        router.push("/dashboard/inverse-marking");
      } else {
        alert(json.error || "Failed to delete the exercise.");
      }
    } catch (err: any) {
      alert(err?.message || "Failed to delete the exercise.");
    } finally {
      setDeleting(false);
    }
  };

  const averageAccuracy = submissions.length ? Math.round(submissions.reduce((s, x) => s + x.accuracyScore, 0) / submissions.length) : 0;
  const passCount = submissions.filter((s) => s.passed).length;

  if (loading || !exercise) {
    return (
      <div className="max-w-5xl mx-auto px-5 sm:px-6 py-12 flex justify-center">
        <div className="w-9 h-9 border-2 border-navy-700 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const studentUrl = `${window.location.origin}/student/inverse-marking?code=${exercise.code}`;

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      <Link href="/dashboard/inverse-marking" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-900 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Inverse Marking
      </Link>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-navy-900 text-gold-400 flex items-center justify-center shrink-0 shadow-md shadow-navy-900/20">
            <Scale className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-navy-900">{exercise.title}</h1>
              {exercise.status === "active" ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">OPEN</span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold">CLOSED</span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
              {exercise.questions.length} question{exercise.questions.length === 1 ? "" : "s"} • control marks visible to you • pass at {exercise.passThreshold}% accuracy (allowing ±{exercise.tolerance} mark)
              {exercise.instruction ? <> • <span className="italic">“{exercise.instruction}”</span></> : null}
            </p>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <button
                type="button"
                onClick={() => copyId(studentUrl)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 text-[11px] font-bold transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Link copied" : "Copy student link"}
              </button>
              <button
                type="button"
                onClick={() => copyId(exercise.code)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-[11px] font-bold transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-gold-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="font-mono tracking-widest">{exercise.code}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            disabled={patched}
            onClick={() => setExerciseStatus(exercise.status === "active" ? "ended" : "active")}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors ${
              exercise.status === "active"
                ? "bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100"
                : "bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            {exercise.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {patched ? "Updating…" : exercise.status === "active" ? "Close submissions" : "Reopen exercise"}
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-xs font-bold transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Class summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-navy-50 text-gold-600 border border-navy-100 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </span>
          <div>
            <p className="text-xl sm:text-2xl font-extrabold text-navy-900">{submissions.length}</p>
            <p className="text-[11px] text-slate-500">Submissions</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-navy-50 text-gold-600 border border-navy-100 flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5" />
          </span>
          <div>
            <p className="text-xl sm:text-2xl font-extrabold text-navy-900">{submissions.length ? `${averageAccuracy}%` : "—"}</p>
            <p className="text-[11px] text-slate-500">Average marking accuracy</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-navy-50 text-gold-600 border border-navy-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </span>
          <div>
            <p className="text-xl sm:text-2xl font-extrabold text-navy-900">
              {submissions.length ? `${Math.round((passCount / submissions.length) * 100)}%` : "—"}
            </p>
            <p className="text-[11px] text-slate-500">{passCount} of {submissions.length} passed</p>
          </div>
        </div>
      </div>

      {/* Submissions */}
      <div className="space-y-3">
        <h2 className="text-sm font-extrabold text-navy-900 flex items-center gap-2">
          <Users className="w-4 h-4 text-gold-600" />
          Student submissions
        </h2>

        {submissions.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-10 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Scale className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-bold text-navy-900">No submissions yet</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Share the student link so your class can mark your script. You&apos;ll see their accuracy, deviation, and reasoning here.
            </p>
            <button
              type="button"
              onClick={() => copyId(studentUrl)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold transition-colors mx-auto"
            >
              {copied ? <Check className="w-4 h-4 text-gold-400" /> : <Copy className="w-4 h-4" />}
              {copied ? "Link copied" : "Copy student link"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.map((s) => {
              const isOpen = expandedId === s.id;
              return (
                <div key={s.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isOpen ? null : s.id)}
                    className="w-full text-left p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-extrabold text-navy-900">{s.studentName}</span>
                        {s.passed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3" /> PASSED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                            <XCircle className="w-3 h-3" /> NEEDS REVIEW
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        {new Date(s.submittedAt).toLocaleString()}{s.studentEmail ? ` • ${s.studentEmail}` : ""}
                      </div>
                      <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px] font-bold">
                        <span className={s.accuracyScore >= exercise.passThreshold ? "text-emerald-700" : "text-rose-700"}>
                          {s.accuracyScore}% accuracy
                        </span>
                        <span className="text-slate-400 font-normal">• awarded {s.totalTeacherMarks}/{s.totalMaxMarks}</span>
                        <span className="text-slate-400 font-normal">• control {s.totalControlMarks}</span>
                        <span className="text-slate-400 font-normal">• deviation {s.deviationTotal}</span>
                        <span className={s.leniency >= 0 ? "text-amber-600" : "text-sky-600"}>
                          • {s.leniency >= 0 ? `generous (+${s.leniency})` : `strict (${s.leniency})`}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className={`w-5 h-5 text-gold-600 shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                  </button>

                  {isOpen && (
                    <div className="px-5 sm:px-6 pb-5 border-t border-slate-100 space-y-3 animate-fade-in">
                      {exercise.questions.map((q, qi) => {
                        const m = s.marks.find((x) => x.qId === q.id);
                        const deviation = m ? Math.abs(m.marks - q.controlMark) : 0;
                        const agreed = m ? deviation <= exercise.tolerance : false;
                        return (
                          <div key={q.id} className="rounded-2xl border border-slate-200 p-3.5 sm:p-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-extrabold text-slate-800 flex-1">
                                {q.isTrap && <span className="mr-1.5 px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200 text-[9px] font-bold align-middle">TRAP</span>}
                                Q{qi + 1}. {q.prompt}
                              </p>
                              <span className={`shrink-0 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${agreed ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>
                                {agreed ? "Agrees" : `Off by ${deviation}`}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2 text-[11px]">
                              <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200">Student: <strong>{m?.marks ?? "—"} / {q.maxMarks}</strong></span>
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200">Control: <strong>{q.controlMark} / {q.maxMarks}</strong></span>
                            </div>
                            {m?.justification && (
                              <p className="text-[11px] text-slate-600 bg-slate-50 rounded-xl px-3 py-2 leading-relaxed">
                                <span className="font-bold text-slate-700 block mb-0.5">Student&apos;s reasoning:</span>
                                {m.justification}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}