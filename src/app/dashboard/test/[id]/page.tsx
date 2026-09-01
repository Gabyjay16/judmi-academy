"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { 
  BookOpen, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Timer, 
  Shuffle, 
  Copy, 
  Check, 
  Download, 
  ExternalLink,
  ArrowLeft,
  Award,
  BarChart2,
  Lock,
  FileText
} from "lucide-react";
import { formatTime } from "@/lib/utils";
import { exportClassResultsPDF } from "@/lib/pdf-export";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function TestAnalyticsPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const testId = resolvedParams.id;

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [testId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/analytics/${testId}`);
      const json = await res.json();
      if (json.test) {
        setData(json);
      }
    } catch (e) {
      console.error("Failed to load test analytics:", e);
    } finally {
      setLoading(false);
    }
  };

  const copyStudentLink = () => {
    if (!data?.test?.code) return;
    const url = `${window.location.origin}/test/${data.test.code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = () => {
    if (!data?.submissions || data.submissions.length === 0) {
      alert("No submissions to export yet.");
      return;
    }
    exportClassResultsPDF({
      test: data.test,
      stats: data.stats,
      submissions: data.submissions,
    });
  };

  const exportCSV = () => {
    if (!data?.submissions || data.submissions.length === 0) {
      alert("No submissions to export yet.");
      return;
    }

    const headers = ["Student Name", "Student ID", "Score", "Max Score", "Percentage", "Passed", "Time Spent (s)", "Submitted At"];
    const rows = data.submissions.map((s: any) => [
      `"${s.studentName}"`,
      `"${s.studentId || ""}"`,
      s.score,
      s.maxScore,
      `${s.percentage}%`,
      s.passed === 1 ? "Passed" : "Failed",
      s.timeSpentSeconds,
      `"${new Date(s.submittedAt).toLocaleString()}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e: any) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${data.test.code}_results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportExcel = async () => {
    if (!data?.submissions || data.submissions.length === 0) {
      alert("No submissions to export yet.");
      return;
    }
    try {
      const res = await fetch(`/api/analytics/${testId}/export`);
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        alert(json?.error || "Failed to export. Please try again.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="?([^";]+)"?/);
      link.download = match ? match[1] : `${data.test.code}_students.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Excel export error:", e);
      alert("Failed to export. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-slate-500">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading exam analytics...
      </div>
    );
  }

  if (!data?.test) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center space-y-3">
        <h2 className="text-xl font-bold text-slate-800">Exam not found</h2>
        <Link href="/dashboard" className="text-indigo-600 text-xs font-semibold hover:underline">
          ← Return to Dashboard
        </Link>
      </div>
    );
  }

  const { test, stats, submissions } = data;
  const allowRetake = test.allowRetake === 1;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Back button & Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {test.title}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Subject: {test.subject || "General"} • Code: <span className="font-mono font-bold text-indigo-700">{test.code}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={copyStudentLink}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors shadow-xs"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? "Link Copied!" : "Copy Test Link"}</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download Class Results PDF</span>
          </button>

          <button
            onClick={exportExcel}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <FileText className="w-4 h-4" />
            <span>Excel</span>
          </button>

          <button
            onClick={exportCSV}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <FileText className="w-4 h-4" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Analytics Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] sm:text-xs text-slate-500 font-medium">Total Submissions</span>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
            {stats.totalSubmissions}
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400">Students tested</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] sm:text-xs text-slate-500 font-medium">Average Score</span>
          <div className="text-2xl sm:text-3xl font-bold text-indigo-600 mt-1">
            {stats.avgPercentage}%
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400">Class performance</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] sm:text-xs text-slate-500 font-medium">Pass Rate</span>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-1">
            {stats.passRate}%
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400">Threshold: {test.passScorePercentage}%</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] sm:text-xs text-slate-500 font-medium">Exam Settings</span>
          <div className="text-sm font-bold text-slate-800 mt-1">
            {test.durationMinutes} mins • {test.distributionMode === "shuffled" ? "Shuffled Pool" : "General"}
          </div>
          <span className="text-[11px] font-medium text-slate-500 mt-0.5 block">
            {allowRetake ? "✓ Retakes Allowed" : "🔒 Retakes Disabled (1 Attempt)"}
          </span>
        </div>
      </div>

      {/* Submissions List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>Classroom Student Submissions ({submissions.length})</span>
          </h2>
          <span className="text-xs text-slate-400 font-medium">
            All students who partook in this assessment
          </span>
        </div>

        {submissions.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No students have taken this exam yet. Share the code <span className="font-bold text-indigo-600">{test.code}</span> with students to begin.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/75 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Student</th>
                  <th className="px-4 py-3">ID / Matric</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Percentage</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Time Spent</th>
                  <th className="px-5 py-3 text-right">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {submissions.map((sub: any) => (
                  <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-900">
                      {sub.studentName}
                    </td>

                    <td className="px-4 py-4 text-slate-500 font-mono">
                      {sub.studentId || "—"}
                    </td>

                    <td className="px-4 py-4 font-bold text-slate-800">
                      {sub.score} / {sub.maxScore}
                    </td>

                    <td className="px-4 py-4 font-bold">
                      <span className={sub.passed === 1 ? "text-indigo-600" : "text-rose-600"}>
                        {sub.percentage}%
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      {sub.passed === 1 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Passed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          Failed
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {formatTime(sub.timeSpentSeconds)}
                    </td>

                    <td className="px-5 py-4 text-right text-slate-400 text-xs">
                      {new Date(sub.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })},{" "}
                      {new Date(sub.submittedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
