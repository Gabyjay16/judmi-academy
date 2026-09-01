"use client";

import {
  ShieldCheck,
  AlertTriangle,
  FileText,
  Fingerprint,
  Copy,
  Check,
  Sparkles,
  ScanSearch,
} from "lucide-react";
import { useState } from "react";

export interface CheckDisplay {
  id: string;
  code: string;
  title: string;
  wordCount: number;
  similarityPercent: number;
  aiPercent: number;
  combinedScore: number;
  verdict: "approved" | "flagged";
  summary?: string;
  flags?: { sample: string; reason: string }[];
  textExcerpt?: string;
  textHash?: string | null;
  createdAt?: string;
}

const THRESHOLD = 30;

function metricColor(value: number) {
  if (value <= THRESHOLD) return "bg-emerald-500";
  if (value <= 60) return "bg-amber-500";
  return "bg-rose-500";
}

function MetricBar({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-slate-700">{label}</span>
        <span className="font-mono font-extrabold text-slate-900">{value}%</span>
      </div>
      <div className="mt-1.5 h-2.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${metricColor(value)}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <p className="text-[10px] text-slate-400 mt-0.5">{hint}</p>
    </div>
  );
}

export default function PlagiarismResult({
  check,
  student,
  schoolName,
  showCopyHint = false,
}: {
  check: CheckDisplay;
  student?: { name: string; email?: string; studentId?: string | null } | null;
  schoolName?: string | null;
  showCopyHint?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const approved = check.verdict === "approved" || check.combinedScore <= THRESHOLD;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(check.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            {approved ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                APPROVED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold">
                <AlertTriangle className="w-3.5 h-3.5" />
                FLAGGED — REVIEW MANUALLY
              </span>
            )}
            <span className="text-[11px] text-slate-400">
              {check.createdAt ? new Date(check.createdAt).toLocaleString() : ""} • {check.wordCount.toLocaleString()} words
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">{check.title}</h2>
          <p className="text-[11px] text-slate-500">
            {student
              ? `${student.name}${student.studentId ? ` • ${student.studentId}` : ""}${student.email ? ` • ${student.email}` : ""}`
              : ""}
            {schoolName ? ` • ${schoolName}` : ""}
          </p>
        </div>

        {/* Verification code */}
        <div className="flex items-center gap-2 bg-slate-900 rounded-2xl px-4 py-3 text-white">
          <ScanSearch className="w-4 h-4 text-indigo-300" />
          <div>
            <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Verification Code</p>
            <p className="font-mono font-extrabold text-lg tracking-widest">{check.code}</p>
          </div>
          <button
            onClick={copyCode}
            className="ml-1 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            title="Copy code"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {showCopyHint && (
        <div className="px-6 py-3 bg-indigo-50/70 border-b border-indigo-100 text-[11px] font-semibold text-indigo-800 flex items-start gap-2">
          <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>Share this code with your teacher. They can enter it on their dashboard (under the same school) to view this exact result.</span>
        </div>
      )}

      <div className="p-5 sm:p-6 space-y-6">
        {/* Scores */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <MetricBar label="Similarity" value={check.similarityPercent} hint="Recycled / unoriginal text" />
          <MetricBar label="AI-use estimate" value={check.aiPercent} hint="Advisory — style-based, not definitive" />
          <MetricBar
            label="Combined score"
            value={check.combinedScore}
            hint={`Similarity + (AI × 0.5). Approved at ≤ ${THRESHOLD}%`}
          />
        </div>

        {/* Approval rule */}
        <div
          className={`p-4 rounded-2xl border text-xs space-y-1 ${
            approved ? "bg-emerald-50/70 border-emerald-200 text-emerald-900" : "bg-rose-50/70 border-rose-200 text-rose-900"
          }`}
        >
          <p className="font-extrabold">
            {approved ? "Meets the school approval rule" : "Above the approval threshold"}
          </p>
          <p className="leading-relaxed">{check.summary || "Authenticity analysis complete."}</p>
        </div>

        {/* Flagged passages */}
        {check.flags && check.flags.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-600" />
              Areas to review ({check.flags.length})
            </h3>
            <div className="space-y-2">
              {check.flags.map((f, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 p-3.5 space-y-1.5">
                  {f.sample && (
                    <p className="text-xs italic text-slate-600 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">“{f.sample}”</p>
                  )}
                  <p className="text-[11px] text-rose-600 font-semibold">{f.reason}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {check.flags && check.flags.length === 0 && (
          <p className="text-[11px] text-slate-400">No specific passages were flagged.</p>
        )}

        {/* Checked text preview + fingerprint */}
        {check.textExcerpt && (
          <div className="space-y-1.5">
            <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-600" />
              Text that was checked (preview)
            </h3>
            <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/60 p-4 whitespace-pre-wrap text-[11px] leading-relaxed text-slate-600">
              {check.textExcerpt}
            </div>
            {check.textHash && (
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 pt-1">
                <Fingerprint className="w-3.5 h-3.5 shrink-0" />
                <span className="font-mono truncate" title="SHA-256 fingerprint of the checked text">
                  sha256 {check.textHash}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}