"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Scale,
  ArrowLeft,
  ArrowRight,
  Plus,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Users,
  Timeline,
  HelpCircle,
  FileText,
  Loader2,
  BookOpenCheck,
  Clock,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface ExerciseListItem {
  id: string;
  code: string;
  title: string;
  status: "active" | "ended";
  tolerance: number;
  passThreshold: number;
  durationMinutes?: number;
  questionCount: number;
  totalMarks: number;
  submissionCount: number;
  createdAt: string;
}

export default function InverseMarkingHub() {
  const router = useRouter();
  const [exercises, setExercises] = useState<ExerciseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [showHowItWorks, setShowHowItWorks] = useState(true);

  const fetchExercises = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/inverse-marking");
      const json = await res.json();
      if (!res.ok) {
        router.push("/login");
        return;
      }
      setExercises(json.exercises || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  const copyText = async (text: string, code: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {}
  };

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-900 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-navy-900 text-gold-400 flex items-center justify-center shrink-0 shadow-md shadow-navy-900/20">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-navy-900">Inverse Marking</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              You write the exam questions, complete the script yourself and mark it. Students then mark <em>your</em> script. The closer their marks match yours, the better they understand the marking criteria.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/inverse-marking/create"
          className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold shadow-[0_8px_20px_-10px_rgba(16,26,46,0.5)] transition-all"
        >
          <Plus className="w-4 h-4" />
          Create New Exercise
        </Link>
      </div>

      {/* How it works */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowHowItWorks(!showHowItWorks)}
          className="w-full flex items-center justify-between gap-3 px-5 sm:px-6 py-4 text-left"
        >
          <span className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-gold-50 text-gold-600 border border-gold-200 flex items-center justify-center">
              <HelpCircle className="w-4 h-4" />
            </span>
            <span className="text-sm font-extrabold text-navy-900">How inverse marking works</span>
          </span>
          <ChevronDown className={`w-5 h-5 text-gold-500 transition-transform ${showHowItWorks ? "rotate-180" : ""}`} />
        </button>

        {showHowItWorks && (
          <div className="px-5 sm:px-6 pb-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 text-[13px] text-slate-600 leading-relaxed">
              <div>
                <h3 className="text-xs font-extrabold text-navy-900 uppercase tracking-wide mb-2">1. You set the exercise</h3>
                <p>
                  Write the essay or theory question(s) and give each a mark value (e.g. “Explain photosynthesis — 10 marks”). Then complete the script <em>as you would want a student to answer it</em>, and mark your own script — that&apos;s your <strong className="text-navy-900">control mark</strong>. You can add a note students see before they start.
                </p>
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-navy-900 uppercase tracking-wide mb-2">2. You share a 6-letter code</h3>
                <p>
                  Send the exercise code to your students (in class, WhatsApp, or copy the link). Students open it, read your question and <em>your</em> answer, and mark it themselves — awarding marks and writing a short reason for every mark.
                </p>
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-navy-900 uppercase tracking-wide mb-2">3. Marks are compared automatically</h3>
                <p>
                  The app compares each student&apos;s marks with your control marks and computes a <strong className="text-navy-900">marking accuracy %</strong> per student. A small “agreement band” (±1 mark by default) forgives tiny differences. You choose the pass line (e.g. 80% accuracy).
                </p>
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-navy-900 uppercase tracking-wide mb-2">4. The comparison is the lesson</h3>
                <p>
                  After submitting, students see where their marks matched or missed yours — that&apos;s what trains their understanding of the rubric. You see the whole class: accuracy, deviation, and whether each student was <em>generous</em> or <em>strict</em> as a marker.
                </p>
              </div>
            </div>

            <div className="mt-5 p-4 rounded-2xl bg-navy-50/70 border border-navy-100 text-xs text-navy-800 leading-relaxed flex items-start gap-2.5">
              <BookOpenCheck className="w-4 h-4 shrink-0 mt-0.5 text-gold-600" />
              <p>
                <strong className="text-navy-900">Tip — add a “trap” question:</strong> once in a while, answer a question imperfectly on purpose (or include a weak past answer). Students who correctly mark it down show real mastery. This also stops students copying each other&apos;s numbers — their justification forces them to show their reasoning.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Exercises list */}
      <div className="space-y-3">
        <h2 className="text-sm font-extrabold text-navy-900 flex items-center gap-2">
          <FileText className="w-4 h-4 text-gold-600" />
          Your exercises
        </h2>

        {loading ? (
          <div className="flex justify-center py-14">
            <div className="w-9 h-9 border-2 border-navy-700 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : exercises.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-10 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Scale className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-bold text-navy-900">No inverse marking exercises yet</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Create your first exercise to hand students the teacher&apos;s script and measure how accurately they mark it.
            </p>
            <Link
              href="/dashboard/inverse-marking/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold transition-all"
            >
              <Plus className="w-4 h-4" /> Create New Exercise
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {exercises.map((ex) => {
              const shortDate = new Date(ex.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
              const link = `${window.location.origin}/student/inverse-marking`;
              const directLink = `${window.location.origin}/student/inverse-marking?code=${ex.code}`;
              return (
                <div key={ex.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all">
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setExpandedCode(expandedCode === ex.code ? null : ex.code)}
                          className="text-left group inline-flex items-center gap-1.5 text-sm font-extrabold text-navy-900 hover:text-navy-700"
                        >
                          <ChevronRight className={`w-4 h-4 text-gold-600 transition-transform ${expandedCode === ex.code ? "rotate-90" : ""}`} />
                          {ex.title}
                        </button>
                        {ex.status === "active" ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">OPEN</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold">CLOSED</span>
                        )}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500 space-x-3">
                        <span>{ex.questionCount} question{ex.questionCount === 1 ? "" : "s"}</span>
                        <span>• {ex.totalMarks} total marks</span>
                        {(ex.durationMinutes || 0) > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" /> {ex.durationMinutes} min
                          </span>
                        )}
                        <span>• {ex.submissionCount} submission{ex.submissionCount === 1 ? "" : "s"}</span>
                        <span>• {shortDate}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => copyText(directLink, `link-${ex.code}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 text-[11px] font-bold transition-colors"
                        title="Copy student link"
                      >
                        {copiedCode === `link-${ex.code}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        Copy link
                      </button>
                      <button
                        type="button"
                        onClick={() => copyText(ex.code, ex.code)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-[11px] font-bold transition-colors"
                        title="Copy code"
                      >
                        {copiedCode === ex.code ? <Check className="w-3.5 h-3.5 text-gold-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span className="font-mono tracking-widest">{ex.code}</span>
                      </button>
                      <Link
                        href={`/dashboard/inverse-marking/${ex.code}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-navy-950 text-[11px] font-bold transition-colors"
                      >
                        Results <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  {expandedCode === ex.code && (
                    <div className="px-6 pb-5 pt-1 border-t border-slate-100">
                      <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        Share this link with students: {link}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!loading && exercises.length > 0 && (
        <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
          <Timeline className="w-3.5 h-3.5" />
          In progress: {exercises.filter((e) => e.status === "active").length} open • {exercises.filter((e) => e.status === "ended").length} closed
        </p>
      )}
    </div>
  );
}