"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  GraduationCap, 
  BookOpen, 
  Timer, 
  CheckCircle2, 
  XCircle, 
  Award, 
  History, 
  Play, 
  ArrowRight, 
  ExternalLink, 
  KeyRound, 
  FileCheck2,
  TrendingUp,
  Clock,
  Sparkles,
  Download
} from "lucide-react";
import { formatTime } from "@/lib/utils";
import { exportStudentTranscriptPDF } from "@/lib/pdf-export";

export default function StudentDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [examCode, setExamCode] = useState("");

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/student/history");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error("Failed to load student history:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (examCode.trim()) {
      router.push(`/test/${examCode.trim().toUpperCase()}`);
    }
  };

  const handleDownloadPDF = () => {
    if (!data) return;
    exportStudentTranscriptPDF({
      student: data.student,
      stats: data.stats,
      history: data.history,
    });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-slate-500 space-y-3">
        <div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-semibold">Loading student portal & examination transcripts...</p>
      </div>
    );
  }

  const student = data?.student || { name: "Student", studentId: "" };
  const stats = data?.stats || { totalTaken: 0, avgPercentage: 0, passRate: 0, highestScore: 0 };
  const history = data?.history || [];
  const availableExams = data?.availableExams || [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
      
      {/* Mobile-First Primary Hero & Exam Code Bar */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-5 sm:p-8 text-white shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <GraduationCap className="w-4 h-4" />
              <span>Student Examination Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {student.name}
            </h1>
            <p className="text-xs text-indigo-200">
              {student.studentId ? `Matric / ID: ${student.studentId} • ` : ""}
              {student.email}
            </p>
          </div>

          <button
            onClick={handleDownloadPDF}
            disabled={history.length === 0}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 text-white font-bold text-xs shadow-xs transition-colors"
          >
            <Download className="w-4 h-4 text-indigo-200" />
            <span>Download PDF Transcript</span>
          </button>
        </div>

        {/* PROMINENT MOBILE EXAM CODE BAR */}
        <div className="bg-white/10 p-3 sm:p-4 rounded-2xl border border-white/15 backdrop-blur-sm space-y-2">
          <label className="block text-xs font-bold text-indigo-200 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5" />
            <span>Have an Exam Access Code from your Teacher?</span>
          </label>
          
          <form onSubmit={handleJoinByCode} className="flex flex-col sm:flex-row items-center gap-2">
            <input
              type="text"
              required
              placeholder="ENTER 6-CHAR EXAM CODE (e.g. BIO101)"
              value={examCode}
              onChange={(e) => setExamCode(e.target.value.toUpperCase())}
              maxLength={8}
              className="w-full px-4 py-3 bg-white text-slate-900 rounded-xl text-sm font-mono font-extrabold tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:normal-case placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={!examCode.trim()}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white font-bold text-xs tracking-wide shadow-md transition-all flex items-center justify-center gap-1.5 shrink-0"
            >
              <span>Start Assessment</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] sm:text-xs text-slate-500 font-medium">Tests Completed</span>
          <div className="text-xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            {stats.totalTaken}
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400">Total transcripts</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] sm:text-xs text-slate-500 font-medium">Average Score</span>
          <div className="text-xl sm:text-3xl font-extrabold text-indigo-600 mt-1">
            {stats.avgPercentage}%
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400">Overall academic avg</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] sm:text-xs text-slate-500 font-medium">Pass Rate</span>
          <div className="text-xl sm:text-3xl font-extrabold text-emerald-600 mt-1">
            {stats.passRate}%
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400">Success rate</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] sm:text-xs text-slate-500 font-medium">Best Score</span>
          <div className="text-xl sm:text-3xl font-extrabold text-purple-600 mt-1">
            {stats.highestScore}%
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400">Peak performance</span>
        </div>
      </div>

      {/* Test History Transcripts & PDF Download */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600" />
              <span>Examination Transcripts & AI Review</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review past scores and click any exam to study step-by-step corrections.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={history.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Transcript PDF</span>
          </button>
        </div>

        {history.length === 0 ? (
          <div className="p-8 sm:p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-800">No completed exams yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Enter an exam code in the bar above or pick an assessment below to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/75 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-4 sm:px-5 py-3">Assessment</th>
                  <th className="px-3 sm:px-4 py-3">Code</th>
                  <th className="px-3 sm:px-4 py-3">Score</th>
                  <th className="px-3 sm:px-4 py-3">Grade %</th>
                  <th className="px-3 sm:px-4 py-3">Status</th>
                  <th className="px-3 sm:px-4 py-3">Time</th>
                  <th className="px-4 sm:px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((sub: any) => (
                  <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 sm:px-5 py-3.5">
                      <div className="font-bold text-slate-900">{sub.testTitle || "Exam"}</div>
                      {sub.testSubject && (
                        <div className="text-[10px] sm:text-xs text-slate-400">{sub.testSubject}</div>
                      )}
                    </td>

                    <td className="px-3 sm:px-4 py-3.5">
                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-xs">
                        {sub.testCode || "—"}
                      </span>
                    </td>

                    <td className="px-3 sm:px-4 py-3.5 font-bold text-slate-800">
                      {sub.score} / {sub.maxScore}
                    </td>

                    <td className="px-3 sm:px-4 py-3.5 font-extrabold text-slate-900">
                      {sub.percentage}%
                    </td>

                    <td className="px-3 sm:px-4 py-3.5">
                      {sub.passed === 1 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] sm:text-[11px] font-bold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Passed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] sm:text-[11px] font-bold">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          Failed
                        </span>
                      )}
                    </td>

                    <td className="px-3 sm:px-4 py-3.5 text-slate-600 text-xs">
                      {formatTime(sub.timeSpentSeconds)}
                    </td>

                    <td className="px-4 sm:px-5 py-3.5 text-right">
                      <Link
                        href={`/test/result/${sub.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors"
                      >
                        <Sparkles className="w-3 h-3 text-indigo-600" />
                        <span className="hidden sm:inline">Review Corrections</span>
                        <span className="sm:hidden">Review</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Available School Exams */}
      {availableExams.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <span>Available Assessments</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {availableExams.map((exam: any) => (
              <div
                key={exam.id}
                className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {exam.code}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Timer className="w-3 h-3" /> {exam.durationMinutes} mins
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm sm:text-base mt-2.5">
                    {exam.title}
                  </h3>
                  {exam.subject && (
                    <p className="text-xs text-slate-500 mt-0.5">{exam.subject}</p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Pass Mark: {exam.passScorePercentage}%</span>
                  <Link
                    href={`/test/${exam.code}`}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
                  >
                    <span>Launch Test</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
