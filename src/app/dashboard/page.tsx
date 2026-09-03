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
  BarChart3,
  Scale
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
  const [showExam, setShowExam] = useState(false);
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

  const quickActions = [
    {
      href: "/dashboard/extract-info",
      icon: FileCheck2,
      title: "Extract Info",
      desc: "Extract data from scanned documents",
      color: "amber",
      bg: "bg-amber-50",
      border: "border-amber-200",
      iconColor: "text-amber-600",
    },
    ...(user?.orgId ? [{
      href: "/dashboard/take-minutes",
      icon: Music4,
      title: "Take Minutes",
      desc: "Record meetings, get AI minutes",
      color: "indigo",
      bg: "bg-indigo-50",
      border: "border-indigo-200",
      iconColor: "text-indigo-600",
    }] : []),
    {
      href: "/dashboard/plagiarism",
      icon: ShieldCheck,
      title: "Verify Plagiarism",
      desc: "Check student authenticity codes",
      color: "emerald",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      iconColor: "text-emerald-600",
    },
  ];

  const examActions = [
    {
      href: "/dashboard/scan-scripts",
      icon: Camera,
      title: "Mark Scripts",
      desc: "Grade camera-scanned papers with AI",
      primary: false,
    },
    {
      href: "/dashboard/inverse-marking",
      icon: Scale,
      title: "Inverse Marking",
      desc: "Students mark your script — grade accuracy",
      primary: false,
    },
    {
      href: "/dashboard/create",
      icon: Plus,
      title: "Create Exam",
      desc: "Generate AI exams from your notes",
      primary: true,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8 sm:space-y-10 animate-fade-in">

      {/* Welcome Section */}
      <section className="space-y-4 animate-slide-up">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="inline-block text-[13px] sm:text-sm font-bold uppercase tracking-[0.22em] text-amber-600">
              Welcome Back
            </span>
            <h1 className="page-heading mt-1">
              Hello {user?.name?.split(" ")[0] || "there"}
            </h1>
            <p className="page-subheading max-w-2xl mt-2">
              Manage your AI exams, camera-scanned physical papers, and student transcripts.
            </p>
          </div>
          {!isPro && !user?.orgId && (
            <Link
              href="/checkout?plan=individual"
              className="btn-accent shrink-0 px-5 py-3 text-sm"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>Upgrade to Pro</span>
            </Link>
          )}
        </div>
      </section>

      {/* Quick Actions Grid */}
      <section className="animate-slide-up" style={{ animationDelay: "60ms" }}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {quickActions.map((action, idx) => (
            <Link
              key={action.title}
              href={action.href}
              className="group surface card-hover p-4 sm:p-5 flex items-center gap-3 sm:gap-4 transition-all"
            >
              <span className={`w-11 h-11 shrink-0 rounded-xl border flex items-center justify-center group-hover:scale-105 transition-transform ${action.bg} ${action.border} ${action.iconColor}`}>
                <action.icon className="w-5 h-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-base sm:text-lg font-bold text-slate-900 leading-tight">{action.title}</span>
                <span className="block mt-0.5 text-[13px] leading-snug text-slate-500">{action.desc}</span>
              </span>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500 transition-colors shrink-0 ml-auto" />
            </Link>
          ))}
        </div>
      </section>

      {/* Exam Actions Accordion */}
      <section className="animate-slide-up" style={{ animationDelay: "120ms" }}>
        <button
          type="button"
          onClick={() => setShowExam(!showExam)}
          className="w-full surface card-hover p-5 sm:p-6 flex items-center justify-between gap-4 transition-all text-left"
        >
          <span className="flex items-center gap-3 sm:gap-4 min-w-0">
            <span className="w-12 h-12 shrink-0 rounded-xl bg-navy-900 text-amber-500 border border-navy-800 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-base sm:text-lg font-bold text-slate-900 leading-tight">Exam Studio</span>
              <span className="block mt-1 text-[13px] sm:text-sm text-slate-500">Mark Scripts • Inverse Marking • Create Exam</span>
            </span>
          </span>
          <ChevronDown className={`w-5 h-5 text-amber-500 shrink-0 transition-transform ${showExam ? "rotate-180" : ""}`} />
        </button>

        {showExam && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-4 animate-fade-in">
            {examActions.map((action, idx) => (
              <Link
                key={action.title}
                href={action.href}
                className={`group flex items-center gap-3 rounded-xl p-4 sm:p-5 transition-all ${
                  action.primary
                    ? "bg-navy-900 text-white shadow-lg shadow-navy-900/25 overflow-hidden"
                    : "surface card-hover"
                }`}
              >
                {!action.primary && (
                  <span className="w-11 h-11 shrink-0 rounded-xl border border-amber-200 bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                    <action.icon className="w-5 h-5" />
                  </span>
                )}
                {action.primary && (
                  <>
                    <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
                    <span className="w-11 h-11 shrink-0 rounded-xl bg-white/10 border border-amber-400/40 text-amber-400 flex items-center justify-center relative z-10">
                      <action.icon className="w-5 h-5" />
                    </span>
                  </>
                )}
                <span className={`min-w-0 flex-1 ${action.primary ? "relative z-10" : ""}`}>
                  <span className={`block text-base font-bold leading-tight ${action.primary ? "text-white" : "text-slate-900"}`}>{action.title}</span>
                  <span className={`block mt-0.5 text-[13px] leading-snug ${action.primary ? "text-navy-100" : "text-slate-500"}`}>{action.desc}</span>
                </span>
                {action.primary && <ArrowRight className="w-4 h-4 text-amber-400 shrink-0 transition-transform group-hover:translate-x-1 relative z-10" />}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Statistics Toggle */}
      <section className="animate-slide-up" style={{ animationDelay: "180ms" }}>
        <button
          type="button"
          onClick={() => setShowStats(!showStats)}
          className="w-full surface card-hover p-5 sm:p-6 flex items-center justify-between gap-4 transition-all text-left"
        >
          <span className="flex items-center gap-3 sm:gap-4 min-w-0">
            <span className="w-12 h-12 shrink-0 rounded-xl bg-navy-50 text-amber-600 border border-navy-100 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {showStats ? "Hide Statistics & Quota Tracker" : "Show Statistics & Analytics (4 Cards)"}
              </span>
              <span className="block mt-1 text-[13px] sm:text-sm text-slate-500">
                {tests.length} published exams • {totalSubmissions} submissions
              </span>
            </span>
          </span>
          <ChevronDown className={`w-5 h-5 text-amber-500 shrink-0 transition-transform ${showStats ? "rotate-180" : ""}`} />
        </button>

        {showStats && (
          <div className="space-y-6 mt-4 animate-fade-in">
            {/* Freemium Usage Banner */}
            {!user?.orgId && !isPro ? (
              <div className="surface-elevated p-6 sm:p-8 text-white overflow-hidden relative" style={{ background: "linear-gradient(135deg, #1a2c47 0%, #243b5e 100%)" }}>
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-transparent" />
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                  <div className="space-y-3 max-w-md">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-[13px] font-bold uppercase tracking-wider">
                        Free Starter Plan
                      </span>
                      <span className="text-sm text-slate-300">Limited trial services</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-white">Your Free Feature Quota Tracker</h3>
                    <p className="text-[15px] text-slate-300 leading-relaxed">
                      Upgrade to the Solo Teacher Plan (5,000 FCFA/mo) for unlimited AI exam creation, camera script scans, and rubric marking.
                    </p>
                  </div>

                  <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    <div className="grid grid-cols-3 gap-2.5 sm:gap-3 text-left">
                      <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                        <span className="text-[13px] text-amber-300/90 block">AI Exams</span>
                        <span className="text-lg sm:text-xl font-extrabold text-white">{examGens} / 3</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                        <span className="text-[13px] text-amber-300/90 block">Paper Scans</span>
                        <span className="text-lg sm:text-xl font-extrabold text-white">{scriptScans} / 3</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                        <span className="text-[13px] text-amber-300/90 block">Essays</span>
                        <span className="text-lg sm:text-xl font-extrabold text-white">{essayGradings} / 2</span>
                      </div>
                    </div>

                    <Link
                      href="/checkout?plan=individual"
                      className="btn-accent px-6 py-3 rounded-2xl text-sm shrink-0"
                    >
                      <Zap className="w-4 h-4 fill-white" />
                      <span>Upgrade to Pro (5,000 FCFA)</span>
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="surface p-5 sm:p-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <span className="w-11 h-11 shrink-0 rounded-xl bg-navy-900 text-amber-500 flex items-center justify-center font-bold text-xl">★</span>
                  <div className="min-w-0">
                    <div className="text-base font-bold text-slate-950">
                      {user?.planType === "school_pro" ? "School Organization Pro Plan Active" : "Individual Educator Pro Plan Active"}
                    </div>
                    <div className="text-sm text-slate-600">
                      Unlimited AI exam generations, unlimited camera paper scans, and full cohort analytics unlocked.
                    </div>
                  </div>
                </div>
                <span className="shrink-0 text-[13px] font-bold text-slate-900 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
                  Unlimited Full Access
                </span>
              </div>
            )}

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
              <div className="surface card-hover p-5 sm:p-6">
                <div className="flex items-center justify-between gap-2">
                  <span className="metric-label">Total Exams</span>
                  <div className="w-10 h-10 shrink-0 rounded-xl bg-navy-50 text-amber-600 border border-navy-100 flex items-center justify-center">
                    <BookOpen className="w-4 h-4" />
                  </div>
                </div>
                <div className="metric-value mt-1.5">{tests.length}</div>
                <div className="text-[13px] text-slate-400 mt-0.5">Active assessments</div>
              </div>

              <div className="surface card-hover p-5 sm:p-6">
                <div className="flex items-center justify-between gap-2">
                  <span className="metric-label">Submissions</span>
                  <div className="w-10 h-10 shrink-0 rounded-xl bg-navy-50 text-amber-600 border border-navy-100 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="metric-value mt-1.5">{totalSubmissions}</div>
                <div className="text-[13px] text-slate-400 mt-0.5">Completed tests</div>
              </div>

              <div className="surface card-hover p-5 sm:p-6">
                <div className="flex items-center justify-between gap-2">
                  <span className="metric-label">Question Pool</span>
                  <div className="w-10 h-10 shrink-0 rounded-xl bg-navy-50 text-amber-600 border border-navy-100 flex items-center justify-center">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="metric-value mt-1.5">{totalQuestions}</div>
                <div className="text-[13px] text-slate-400 mt-0.5">Items in bank</div>
              </div>

              <div className="surface card-hover p-5 sm:p-6">
                <div className="flex items-center justify-between gap-2">
                  <span className="metric-label">Mark Scripts</span>
                  <div className="w-10 h-10 shrink-0 rounded-xl bg-navy-50 text-amber-600 border border-navy-100 flex items-center justify-center">
                    <Camera className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1.5">Gemini Vision</div>
                <div className="text-[13px] sm:text-sm text-emerald-600 font-medium mt-0.5">● Paper & Essay OCR</div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Tests Table */}
      <section className="animate-slide-up" style={{ animationDelay: "240ms" }}>
        <div className="surface-elevated overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
            <h2 className="section-title">
              <span className="w-10 h-10 shrink-0 rounded-xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center">
                <BookOpen className="w-[18px] h-[18px]" />
              </span>
              <span>All Published Exams ({tests.length})</span>
            </h2>
            <Link
              href="/dashboard/create"
              className="btn-primary px-4 py-2.5 text-[13px] shrink-0"
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
              <h3 className="text-xl font-bold text-slate-900">No exams created yet</h3>
              <p className="text-base text-slate-500 max-w-sm mx-auto">
                Upload your teaching notes to generate your first AI-powered MCQ or essay test.
              </p>
              <Link
                href="/dashboard/create"
                className="btn-primary mt-2"
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
                  <div key={test.id} className="animate-fade-in">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isOpen ? null : test.id)}
                      className="w-full flex items-center gap-3 sm:gap-4 px-5 sm:px-8 py-5 sm:py-6 text-left hover:bg-slate-50/60 transition-colors"
                    >
                      <span className="shrink-0 w-10 h-10 rounded-xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center transition-colors">
                        {isOpen ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-base sm:text-lg font-bold text-slate-900 truncate">
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
                      <div className="px-5 sm:px-20 pb-6 sm:pb-7 space-y-4 border-t border-slate-100 bg-slate-50/30">
                        {test.description && (
                          <p className="text-[15px] text-slate-600 leading-relaxed">{test.description}</p>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          <div className="surface p-4 rounded-2xl">
                            <div className="text-[13px] font-semibold text-slate-500 uppercase tracking-wide">Access Code</div>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[15px] font-mono font-bold text-navy-800">{test.code}</span>
                              <button
                                onClick={() => handleCopy(test.code)}
                                title="Copy student link"
                                className="text-slate-400 hover:text-navy-700 transition-colors p-1"
                              >
                                {copiedCode === test.code ? (
                                  <Check className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>

                          <div className="surface p-4 rounded-2xl">
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

                          <div className="surface p-4 rounded-2xl">
                            <div className="text-[13px] font-semibold text-slate-500 uppercase tracking-wide">Duration</div>
                            <div className="mt-1.5 flex items-center gap-1.5 text-[15px] font-bold text-navy-900">
                              <Timer className="w-4 h-4 text-slate-400" />
                              <span>{test.durationMinutes} mins</span>
                            </div>
                          </div>

                          <div className="surface p-4 rounded-2xl">
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
                            className="btn-outline px-4 py-2.5 text-[15px]"
                          >
                            <TrendingUp className="w-4 h-4" />
                            Analytics
                          </Link>
                          <Link
                            href={`/test/${test.code}`}
                            target="_blank"
                            className="btn-outline px-4 py-2.5 text-[15px]"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Preview as Student
                          </Link>
                          <button
                            onClick={() => handleDelete(test)}
                            disabled={deletingId === test.id}
                            className="btn-danger px-4 py-2.5 text-[15px] disabled:opacity-40 disabled:cursor-not-allowed"
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
      </section>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="general"
      />
    </div>
  );
}