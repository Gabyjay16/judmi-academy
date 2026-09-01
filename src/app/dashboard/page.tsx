"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  BookOpen, 
  Timer, 
  Shuffle, 
  Users, 
  TrendingUp, 
  Copy, 
  Check, 
  ExternalLink,
  Plus,
  FileCheck2,
  Camera,
  Zap,
  ArrowRight,
  Trash2,
  Music4,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  BarChart3
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
  const [user, setUser] = useState<any | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("judmi_user");
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const handleDelete = async (test: TestItem) => {
    const confirmMsg = `Delete "${test.title}"?\n\nThis permanently removes the exam and all ${test.submissionCount} student submission${test.submissionCount === 1 ? "" : "s"} linked to it. This cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setDeletingId(test.id);
      const res = await fetch(`/api/tests/${test.code}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok && json.success) {
        setTests((prev) => prev.filter((t) => t.id !== test.id));
      } else {
        alert(json?.error || "Failed to delete the exam. Please try again.");
      }
    } catch (err) {
      console.error("Delete exam error:", err);
      alert("Failed to delete the exam. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const totalSubmissions = tests.reduce((acc, t) => acc + (t.submissionCount || 0), 0);
  const totalQuestions = tests.reduce((acc, t) => acc + (t.totalQuestions || 0), 0);

  const isPro = user?.planType === "individual" || user?.planType === "school_pro" || user?.role === "admin" || user?.role === "org_admin";
  const examGens = user?.examGenerationsUsed || 0;
  const scriptScans = user?.scriptScansUsed || 0;
  const essayGradings = user?.essayGradingsUsed || 0;

  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8 sm:space-y-10">

      {/* Welcome */}
      <section className="space-y-3">
        <span className="inline-block text-[13px] sm:text-sm font-bold uppercase tracking-[0.22em] text-gold-600">
          Welcome Back
        </span>
        <h1 className="text-[32px] sm:text-[42px] font-extrabold tracking-tight text-navy-900 leading-[1.1]">
          Hello {user?.name || "there"}
        </h1>
        <div className="w-16 h-[3px] rounded-full bg-gold-500" />
        <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
          Manage your AI exams, camera-scanned physical papers, and student transcripts.
        </p>
      </section>

      {/* Quick Actions */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Extract Info */}
        <Link
          href="/dashboard/extract-info"
          className="group flex items-center gap-3 rounded-[18px] bg-white px-4 py-4 sm:px-5 border border-slate-200 shadow-[0_1px_2px_rgba(16,26,46,0.05)] hover:border-navy-200 hover:shadow-[0_10px_24px_-14px_rgba(16,26,46,0.2)] transition-all"
        >
          <span className="w-10 h-10 shrink-0 rounded-xl border border-gold-200 bg-gold-50 text-gold-600 flex items-center justify-center group-hover:bg-gold-100 transition-colors">
            <FileCheck2 className="w-5 h-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-bold text-navy-900 leading-tight">Extract Info</span>
            <span className="block mt-0.5 text-[13px] leading-snug text-slate-600">
              Extract details from scanned documents.
            </span>
          </span>
        </Link>

        {/* Take Minutes */}
        {user?.orgId && (
          <Link
            href="/dashboard/take-minutes"
            className="group flex items-center gap-3 rounded-[18px] bg-white px-4 py-4 sm:px-5 border border-slate-200 shadow-[0_1px_2px_rgba(16,26,46,0.05)] hover:border-navy-200 hover:shadow-[0_10px_24px_-14px_rgba(16,26,46,0.2)] transition-all"
          >
            <span className="w-10 h-10 shrink-0 rounded-xl border border-gold-200 bg-gold-50 text-gold-600 flex items-center justify-center group-hover:bg-gold-100 transition-colors">
              <Music4 className="w-5 h-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-base font-bold text-navy-900 leading-tight">Take Minutes</span>
              <span className="block mt-0.5 text-[13px] leading-snug text-slate-600">
                Record meetings and get AI minutes.
              </span>
            </span>
          </Link>
        )}

        {/* Verify Plagiarism Code */}
        <Link
          href="/dashboard/plagiarism"
          className="group flex items-center gap-3 rounded-[18px] bg-white px-4 py-4 sm:px-5 border border-slate-200 shadow-[0_1px_2px_rgba(16,26,46,0.05)] hover:border-navy-200 hover:shadow-[0_10px_24px_-14px_rgba(16,26,46,0.2)] transition-all"
        >
          <span className="w-10 h-10 shrink-0 rounded-xl border border-gold-200 bg-gold-50 text-gold-600 flex items-center justify-center group-hover:bg-gold-100 transition-colors">
            <ShieldCheck className="w-5 h-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-bold text-navy-900 leading-tight">Verify Plagiarism Code</span>
            <span className="block mt-0.5 text-[13px] leading-snug text-slate-600">
              Check a student&apos;s authenticity result.
            </span>
          </span>
        </Link>

        {/* Mark Scripts */}
        <Link
          href="/dashboard/scan-scripts"
          className="group flex items-center gap-3 rounded-[18px] bg-white px-4 py-4 sm:px-5 border border-slate-200 shadow-[0_1px_2px_rgba(16,26,46,0.05)] hover:border-navy-200 hover:shadow-[0_10px_24px_-14px_rgba(16,26,46,0.2)] transition-all"
        >
          <span className="w-10 h-10 shrink-0 rounded-xl border border-gold-200 bg-gold-50 text-gold-600 flex items-center justify-center group-hover:bg-gold-100 transition-colors">
            <Camera className="w-5 h-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-bold text-navy-900 leading-tight">Mark Scripts</span>
            <span className="block mt-0.5 text-[13px] leading-snug text-slate-600">
              Grade camera-scanned papers with AI.
            </span>
          </span>
        </Link>

        {/* Create Exam — Primary */}
        <Link
          href="/dashboard/create"
          className="group relative flex items-center gap-3 rounded-[18px] bg-navy-900 px-4 py-4 sm:px-5 text-white shadow-[0_10px_24px_-14px_rgba(16,26,46,0.55)] hover:shadow-[0_12px_28px_-14px_rgba(16,26,46,0.65)] transition-all overflow-hidden"
        >
          <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-gold-400 to-transparent" />
          <span className="w-10 h-10 shrink-0 rounded-xl bg-white/10 border border-gold-400/40 text-gold-400 flex items-center justify-center">
            <Plus className="w-5 h-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-bold text-white leading-tight">Create Exam</span>
            <span className="block mt-0.5 text-[13px] leading-snug text-navy-100">
              Generate AI exams from your notes.
            </span>
          </span>
          <ArrowRight className="w-4 h-4 text-gold-400 shrink-0 transition-transform group-hover:translate-x-1" />
        </Link>
      </section>

      {/* REVEAL / HIDE STATISTICS TOGGLE - FULL WIDTH */}
      <div className="w-full">
        <button
          type="button"
          onClick={() => setShowStats(!showStats)}
          className="w-full flex items-center justify-between gap-4 px-5 sm:px-8 py-5 sm:py-6 rounded-[20px] bg-white border border-slate-200 shadow-[0_1px_3px_rgba(16,26,46,0.05)] hover:border-navy-200 hover:bg-slate-50/60 transition-all text-left"
        >
          <span className="flex items-center gap-3 sm:gap-4 min-w-0">
            <span className="w-11 h-11 shrink-0 rounded-xl bg-navy-50 text-gold-600 border border-navy-100 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-base sm:text-lg font-bold text-navy-900 leading-tight">
                {showStats ? "Hide Statistics & Quota Tracker" : "Show Statistics & Analytics (4 Cards)"}
              </span>
              <span className="block mt-1 text-[13px] sm:text-sm text-slate-500">
                {tests.length} published exams • {totalSubmissions} submissions
              </span>
            </span>
          </span>
          <ChevronDown className={`w-5 h-5 text-gold-500 shrink-0 transition-transform ${showStats ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* FREEMIUM USAGE & STATS (COLLAPSIBLE / HIDDEN BY DEFAULT) */}
      {showStats && (
        <div className="space-y-6 sm:space-y-8 animate-fade-in">
          {/* FREEMIUM USAGE & QUOTA TRACKER BANNER — hidden entirely for school-managed accounts */}
          {!user?.orgId && (!isPro ? (
            <div className="rounded-[22px] bg-navy-900 p-6 sm:p-8 text-white shadow-[0_18px_40px_-20px_rgba(16,26,46,0.6)] overflow-hidden">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-3 max-w-md">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="px-3 py-1 rounded-full bg-gold-500/15 border border-gold-400/40 text-gold-300 text-[13px] font-bold uppercase tracking-wider">
                      Free Starter Plan
                    </span>
                    <span className="text-sm text-navy-200">Limited trial services</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white">Your Free Feature Quota Tracker</h3>
                  <p className="text-[15px] text-navy-200 leading-relaxed">
                    Upgrade to the Solo Teacher Plan (5,000 FCFA/mo) for unlimited AI exam creation, camera script scans, and rubric marking.
                  </p>
                </div>

                <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                  {/* Quota Counters */}
                  <div className="grid grid-cols-3 gap-2.5 sm:gap-3 text-left">
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                      <span className="text-[13px] text-gold-300/90 block">AI Exams</span>
                      <span className="text-lg sm:text-xl font-extrabold text-white">{examGens} / 3</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                      <span className="text-[13px] text-gold-300/90 block">Paper Scans</span>
                      <span className="text-lg sm:text-xl font-extrabold text-white">{scriptScans} / 3</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                      <span className="text-[13px] text-gold-300/90 block">Essays</span>
                      <span className="text-lg sm:text-xl font-extrabold text-white">{essayGradings} / 2</span>
                    </div>
                  </div>

                  <Link
                    href="/checkout?plan=individual"
                    className="px-5 py-3 rounded-2xl bg-gold-500 hover:bg-gold-400 text-navy-950 font-bold text-[15px] shadow-lg shadow-gold-500/25 transition-all flex items-center justify-center gap-2 shrink-0"
                  >
                    <Zap className="w-4 h-4 fill-navy-950" />
                    <span>Upgrade to Pro (5,000 FCFA)</span>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 sm:p-6 rounded-[20px] bg-white border border-gold-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <span className="w-10 h-10 shrink-0 rounded-xl bg-navy-900 text-gold-400 flex items-center justify-center font-bold">
                  ★
                </span>
                <div className="min-w-0">
                  <div className="text-base font-bold text-navy-950">
                    {user?.planType === "school_pro" ? "School Organization Pro Plan Active" : "Individual Educator Pro Plan Active"}
                  </div>
                  <div className="text-sm text-navy-700">
                    Unlimited AI exam generations, unlimited camera paper scans, and full cohort analytics unlocked.
                  </div>
                </div>
              </div>

              <span className="shrink-0 text-[13px] font-bold text-navy-900 bg-gold-50 px-3 py-1.5 rounded-full border border-gold-200">
                Unlimited Full Access
              </span>
            </div>
          ))}

          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            <div className="bg-white p-5 sm:p-6 rounded-[18px] border border-slate-200 shadow-[0_1px_3px_rgba(16,26,46,0.05)]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] sm:text-sm font-medium text-slate-500">Total Exams</span>
                <div className="w-9 h-9 shrink-0 rounded-xl bg-navy-50 text-gold-600 border border-navy-100 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-navy-900 mt-1.5">
                {tests.length}
              </div>
              <div className="text-[13px] text-slate-400 mt-0.5">Active assessments</div>
            </div>

            <div className="bg-white p-5 sm:p-6 rounded-[18px] border border-slate-200 shadow-[0_1px_3px_rgba(16,26,46,0.05)]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] sm:text-sm font-medium text-slate-500">Submissions</span>
                <div className="w-9 h-9 shrink-0 rounded-xl bg-navy-50 text-gold-600 border border-navy-100 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-navy-900 mt-1.5">
                {totalSubmissions}
              </div>
              <div className="text-[13px] text-slate-400 mt-0.5">Completed tests</div>
            </div>

            <div className="bg-white p-5 sm:p-6 rounded-[18px] border border-slate-200 shadow-[0_1px_3px_rgba(16,26,46,0.05)]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] sm:text-sm font-medium text-slate-500">Question Pool</span>
                <div className="w-9 h-9 shrink-0 rounded-xl bg-navy-50 text-gold-600 border border-navy-100 flex items-center justify-center">
                  <FileCheck2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-navy-900 mt-1.5">
                {totalQuestions}
              </div>
              <div className="text-[13px] text-slate-400 mt-0.5">Items in bank</div>
            </div>

            <div className="bg-white p-5 sm:p-6 rounded-[18px] border border-slate-200 shadow-[0_1px_3px_rgba(16,26,46,0.05)]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] sm:text-sm font-medium text-slate-500">Mark Scripts</span>
                <div className="w-9 h-9 shrink-0 rounded-xl bg-navy-50 text-gold-600 border border-navy-100 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-navy-900 mt-1.5">
                Gemini Vision
              </div>
              <div className="text-[13px] sm:text-sm text-emerald-600 font-medium mt-0.5">● Paper & Essay OCR</div>
            </div>
          </div>
        </div>
      )}

      {/* Tests Table */}
      <div className="bg-white rounded-[22px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 sm:px-8 py-5 sm:py-6 border-b border-slate-100 flex items-center justify-between gap-3">
          <h2 className="text-lg sm:text-2xl font-bold text-navy-900 flex items-center gap-3">
            <span className="w-9 h-9 shrink-0 rounded-xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center">
              <BookOpen className="w-[18px] h-[18px]" />
            </span>
            <span>All Published Exams ({tests.length})</span>
          </h2>
          <Link
            href="/dashboard/create"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-[13px] font-bold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create New</span>
          </Link>
        </div>

        {loading ? (
          <div className="p-12 sm:p-16 text-center">
            <div className="w-9 h-9 border-2 border-navy-700 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-base text-slate-500">Loading your exams...</p>
          </div>
        ) : tests.length === 0 ? (
          <div className="p-12 sm:p-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center mx-auto">
              <BookOpen className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-navy-900">No exams created yet</h3>
            <p className="text-base text-slate-500 max-w-sm mx-auto">
              Upload your teaching notes to generate your first AI-powered MCQ or essay test.
            </p>
            <Link
              href="/dashboard/create"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-[15px] font-bold shadow-sm transition-colors mt-2"
            >
              <Plus className="w-4 h-4" />
              Create First Exam
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tests.map((test) => {
              const isOpen = expandedId === test.id;
              return (
                <div key={test.id}>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isOpen ? null : test.id)}
                    className="w-full flex items-center gap-3 sm:gap-4 px-5 sm:px-8 py-5 sm:py-6 text-left hover:bg-slate-50/60 transition-colors"
                  >
                    <span className="shrink-0 w-9 h-9 rounded-xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center transition-colors">
                      {isOpen ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-base sm:text-lg font-bold text-navy-900 truncate">
                        {test.title}
                      </span>
                      {test.subject && (
                        <span className="block text-sm text-slate-500 mt-0.5 truncate">
                          {test.subject}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-slate-500">
                      {test.submissionCount} submission{test.submissionCount === 1 ? "" : "s"}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-5 sm:px-20 pb-6 sm:pb-7 space-y-4">
                      {test.description && (
                        <p className="text-[15px] text-slate-600 leading-relaxed">{test.description}</p>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3.5">
                          <div className="text-[13px] font-semibold text-slate-500 uppercase tracking-wide">Access Code</div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[15px] font-mono font-bold text-navy-800">{test.code}</span>
                            <button
                              onClick={() => handleCopy(test.code)}
                              title="Copy student link"
                              className="text-slate-400 hover:text-navy-700 transition-colors"
                            >
                              {copiedCode === test.code ? (
                                <Check className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3.5">
                          <div className="text-[13px] font-semibold text-slate-500 uppercase tracking-wide">Distribution</div>
                          <div className="mt-1.5">
                            {test.distributionMode === "shuffled" ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-navy-50 text-navy-800 border border-navy-200 text-sm font-medium">
                                <Shuffle className="w-3.5 h-3.5" />
                                Unique / Shuffled
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-sm font-medium">
                                General (Identical)
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3.5">
                          <div className="text-[13px] font-semibold text-slate-500 uppercase tracking-wide">Duration</div>
                          <div className="mt-1.5 flex items-center gap-1.5 text-[15px] font-bold text-navy-900">
                            <Timer className="w-4 h-4 text-slate-400" />
                            <span>{test.durationMinutes} mins</span>
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3.5">
                          <div className="text-[13px] font-semibold text-slate-500 uppercase tracking-wide">Questions</div>
                          <div className="mt-1 text-[15px] font-bold text-navy-900">{test.totalQuestions}</div>
                          <div className="text-[13px] text-slate-400 mt-0.5">
                            {test.submissionCount} student{test.submissionCount === 1 ? "" : "s"} took it
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center flex-wrap gap-2.5 pt-1">
                        <Link
                          href={`/dashboard/test/${test.id}`}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[15px] font-semibold text-navy-800 bg-navy-50 hover:bg-navy-100 transition-colors"
                        >
                          <TrendingUp className="w-4 h-4" />
                          Analytics
                        </Link>
                        <Link
                          href={`/test/${test.code}`}
                          target="_blank"
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[15px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Preview as Student
                        </Link>
                        <button
                          onClick={() => handleDelete(test)}
                          disabled={deletingId === test.id}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[15px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Exam
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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