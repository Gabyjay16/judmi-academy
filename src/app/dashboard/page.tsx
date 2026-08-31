"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Sparkles, 
  BookOpen, 
  PenTool, 
  Timer, 
  Shuffle, 
  Users, 
  TrendingUp, 
  Copy, 
  Check, 
  ExternalLink,
  Plus,
  Play,
  FileCheck2,
  Calendar,
  AlertCircle,
  Camera,
  Crown,
  Zap,
  ArrowRight
} from "lucide-react";
import { UpgradeModal } from "@/components/UpgradeModal";

interface TestItem {
  id: string;
  code: string;
  title: string;
  description: string | null;
  subject: string | null;
  durationMinutes: number;
  distributionMode: string;
  passScorePercentage: number;
  totalQuestions: number;
  submissionCount: number;
  createdAt: string;
  status: string;
}

export default function DashboardPage() {
  const [tests, setTests] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    fetchTests();
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth");
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
      }
    } catch {}
  };

  const fetchTests = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tests");
      const data = await res.json();
      if (data.tests) {
        setTests(data.tests);
      }
    } catch (err) {
      console.error("Failed to load tests:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (code: string) => {
    const url = `${window.location.origin}/test/${code}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const totalSubmissions = tests.reduce((acc, t) => acc + (t.submissionCount || 0), 0);
  const totalQuestions = tests.reduce((acc, t) => acc + (t.totalQuestions || 0), 0);

  const isPro = user?.planType === "individual" || user?.planType === "school_pro" || user?.role === "admin" || user?.role === "org_admin";
  const examGens = user?.examGenerationsUsed || 0;
  const scriptScans = user?.scriptScansUsed || 0;
  const essayGradings = user?.essayGradingsUsed || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Teacher Assessment Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage your AI exams, camera-scanned physical papers, and student transcripts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/dashboard/extract-info"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-xs"
          >
            <FileCheck2 className="w-3.5 h-3.5 text-teal-100" />
            <span>Extract Info</span>
          </Link>

          <Link
            href="/dashboard/scan-scripts"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs"
          >
            <Camera className="w-3.5 h-3.5 text-indigo-300" />
            <span>Mark Scripts</span>
          </Link>

          <Link
            href="/dashboard/create"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create Exam</span>
          </Link>
        </div>
      </div>

      {/* REVEAL / HIDE STATISTICS TOGGLE BUTTON - FULL WIDTH ACROSS SCREEN */}
      <div className="w-full pt-1">
        <button
          type="button"
          onClick={() => setShowStats(!showStats)}
          className="w-full flex items-center justify-between px-4 sm:px-5 py-3 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:bg-slate-50 text-xs font-bold text-slate-800 shadow-xs transition-all"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>{showStats ? "Hide Statistics & Quota Tracker ▴" : "Show Statistics & Analytics (4 Cards) ▾"}</span>
          </div>

          <span className="text-[11px] text-slate-500 font-normal shrink-0">
            {tests.length} published exams • {totalSubmissions} submissions
          </span>
        </button>
      </div>

      {/* FREEMIUM USAGE & STATS (COLLAPSIBLE / HIDDEN BY DEFAULT) */}
      {showStats && (
        <div className="space-y-6 animate-fade-in">
          {/* FREEMIUM USAGE & QUOTA TRACKER BANNER */}
          {!isPro ? (
            <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-indigo-800/40">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                    Free Starter Plan
                  </span>
                  <span className="text-xs text-indigo-200">Limited trial services</span>
                </div>
                <h3 className="text-lg font-bold text-white">
                  Your Free Feature Quota Tracker
                </h3>
                <p className="text-xs text-slate-300 max-w-md">
                  Upgrade to the Solo Teacher Plan (5,000 FCFA/mo) for unlimited AI exam creation, camera script scans, and rubric marking.
                </p>
              </div>

              <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                {/* Quota Counters */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-2xl bg-white/10 border border-white/15">
                    <span className="text-[10px] text-indigo-200 block">AI Exams</span>
                    <span className="text-sm font-extrabold text-white">{examGens} / 3</span>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-white/10 border border-white/15">
                    <span className="text-[10px] text-indigo-200 block">Paper Scans</span>
                    <span className="text-sm font-extrabold text-white">{scriptScans} / 3</span>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-white/10 border border-white/15">
                    <span className="text-[10px] text-indigo-200 block">Essays</span>
                    <span className="text-sm font-extrabold text-white">{essayGradings} / 2</span>
                  </div>
                </div>

                <Link
                  href="/checkout?plan=individual"
                  className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/30 transition-all flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Zap className="w-4 h-4 fill-slate-950" />
                  <span>Upgrade to Pro (5,000 FCFA)</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-emerald-950 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                  ★
                </span>
                <div>
                  <div className="text-xs font-bold text-emerald-950">
                    {user?.planType === "school_pro" ? "School Organization Pro Plan Active" : "Individual Educator Pro Plan Active"}
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    Unlimited AI exam generations, unlimited camera paper scans, and full cohort analytics unlocked.
                  </div>
                </div>
              </div>

              <span className="text-[11px] font-bold text-emerald-700 bg-white px-3 py-1 rounded-full border border-emerald-200 shadow-xs">
                Unlimited Full Access
              </span>
            </div>
          )}

          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-medium text-slate-500">Total Exams</span>
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                {tests.length}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Active assessments</div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-medium text-slate-500">Submissions</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                {totalSubmissions}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Completed tests</div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-medium text-slate-500">Question Pool</span>
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <FileCheck2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                {totalQuestions}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Items in bank</div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-medium text-slate-500">Mark Scripts</span>
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
              </div>
              <div className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                Gemini Vision
              </div>
              <div className="text-[10px] text-emerald-600 font-medium mt-0.5">● Paper & Essay OCR</div>
            </div>
          </div>
        </div>
      )}

      {/* Tests Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>All Published Exams ({tests.length})</span>
          </h2>
          <Link
            href="/dashboard/create"
            className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New</span>
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading your exams...
          </div>
        ) : tests.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No exams created yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Upload your teaching notes to generate your first AI-powered MCQ or essay test.
            </p>
            <Link
              href="/dashboard/create"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create First Exam
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/75 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Exam Details</th>
                  <th className="px-4 py-3">Access Code</th>
                  <th className="px-4 py-3">Distribution Mode</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Questions</th>
                  <th className="px-4 py-3">Submissions</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tests.map((test) => (
                  <tr key={test.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900">{test.title}</div>
                      {test.subject && (
                        <div className="text-[11px] text-slate-500 mt-0.5">{test.subject}</div>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 font-mono font-bold text-xs">
                        <span>{test.code}</span>
                        <button
                          onClick={() => handleCopy(test.code)}
                          title="Copy student link"
                          className="hover:text-indigo-900 transition-colors"
                        >
                          {copiedCode === test.code ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      {test.distributionMode === "shuffled" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-medium">
                          <Shuffle className="w-3 h-3" />
                          Unique / Shuffled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium">
                          General (Identical)
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      <div className="flex items-center gap-1">
                        <Timer className="w-3.5 h-3.5 text-slate-400" />
                        <span>{test.durationMinutes} mins</span>
                      </div>
                    </td>

                    <td className="px-4 py-4 font-semibold text-slate-800">
                      {test.totalQuestions}
                    </td>

                    <td className="px-4 py-4">
                      <span className="font-semibold text-slate-800">{test.submissionCount}</span>
                      <span className="text-slate-400 text-xs"> student{test.submissionCount === 1 ? "" : "s"}</span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/test/${test.id}`}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                        >
                          Analytics
                        </Link>
                        <Link
                          href={`/test/${test.code}`}
                          target="_blank"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          title="Preview Test as Student"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="general"
      />
    </div>
  );
}
