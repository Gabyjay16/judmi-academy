"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  ScanSearch,
  ArrowLeft,
  FileText,
  Building2,
  Loader2,
  Copy,
  Check,
  Sparkles,
  AlertTriangle,
  KeyRound,
} from "lucide-react";
import PlagiarismResult, { CheckDisplay } from "@/components/PlagiarismResult";

const MIN_CHARS = 80;

export default function StudentPlagiarismPage() {
  const router = useRouter();
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<CheckDisplay | null>(null);
  const [history, setHistory] = useState<CheckDisplay[]>([]);
  const [lastCopied, setLastCopied] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/plagcheck");
      if (!res.ok) return;
      const json = await res.json();
      setHistory(json.checks || []);
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth");
        const data = await res.json();
        setUser(data.user || null);
      } catch {}
      setLoading(false);
      fetchHistory();
    })();
  }, [fetchHistory]);

  const runCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (text.trim().length < MIN_CHARS) {
      setError(`Please enter at least ${MIN_CHARS} characters of text to check.`);
      return;
    }
    setRunning(true);
    try {
      const res = await fetch("/api/plagcheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() || "Untitled work", text }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "The check failed. Please try again.");
        return;
      }
      setResult(json.check);
      setText("");
      fetchHistory();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setError(err?.message || "The check failed. Please try again.");
    } finally {
      setRunning(false);
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setLastCopied(code);
      setTimeout(() => setLastCopied(null), 2000);
    } catch {}
  };

  if (!loading && user && !user.orgId) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
          <Building2 className="w-7 h-7 text-slate-400" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">Plagiarism & Authenticity Checker</h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          This tool is available to students and teachers registered under a school. Ask your school administrator for the enrolment link to join your school.
        </p>
        <Link href="/" className="inline-block mt-2 text-sm font-bold text-indigo-600 hover:underline">
          ← Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-7">
      <Link
        href="/student/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
      </Link>

      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Plagiarism & Authenticity Checker</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Paste your work to check it for copied/recycled text and likely AI-generated writing. When the check finishes, a unique verification code lets your teacher confirm the exact result under your school.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <PlagiarismResult check={result} showCopyHint />
      )}

      {/* Check form */}
      <form onSubmit={runCheck} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ScanSearch className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-extrabold text-slate-800">Run a new check</h2>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Work title (optional)</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. History Essay — Origins of the Cold War"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              Your text
            </span>
            <span className="font-normal text-slate-400">{text.trim().length.toLocaleString()} / 60,000 chars • min {MIN_CHARS}</span>
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder="Paste the assignment, essay, or report you want to check..."
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
          />
        </div>

        <button
          type="submit"
          disabled={running || text.trim().length < MIN_CHARS}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5"
        >
          {running ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing your text…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Run Authenticity Check
            </>
          )}
        </button>

        <p className="text-[11px] text-slate-400 flex items-start gap-1.5">
          <KeyRound className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Analysis takes a few seconds. The AI-use estimate is advisory and style-based. Combined score = Similarity + (AI-use × 0.5); approved when it is 30% or below.
        </p>
      </form>

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-extrabold text-slate-800">Your previous checks</h2>
          <div className="space-y-2">
            {history.map((c) => {
              const approved = c.verdict === "approved" || c.combinedScore <= 30;
              return (
                <div
                  key={c.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white rounded-2xl border border-slate-200 shadow-xs p-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{c.title}</p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(c.createdAt || "").toLocaleString()} • {c.wordCount.toLocaleString()} words
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] font-bold">
                      <span className={approved ? "text-emerald-600" : "text-rose-600"}>
                        {approved ? "APPROVED" : "FLAGGED"}
                      </span>
                      <span className="text-slate-400 font-normal">Combined {c.combinedScore}%</span>
                      <span className="text-slate-400 font-normal">Similarity {c.similarityPercent}%</span>
                      <span className="text-slate-400 font-normal">AI-use {c.aiPercent}%</span>
                    </div>
                  </div>
                  <button
                    onClick={() => copyCode(c.code)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 text-white text-[11px] font-bold hover:bg-slate-800 transition-colors shrink-0"
                    title="Copy code"
                  >
                    {lastCopied === c.code ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="font-mono tracking-widest">{c.code}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}