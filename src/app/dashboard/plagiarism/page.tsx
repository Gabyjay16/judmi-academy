"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ScanSearch, ArrowLeft, KeyRound, ShieldCheck, Info } from "lucide-react";

export default function PlagiarismLookupPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 4) {
      setError("Enter the student's 6-character verification code.");
      return;
    }
    setError(null);
    router.push(`/dashboard/plagiarism/${trimmed}`);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
      </Link>

      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
          <ScanSearch className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Verify Plagiarism Check Code</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            A student under your school runs an authenticity check on their work and shares a code with you. Enter it below to see the exact result — scores, flagged passages, and the text that was checked.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4">
        <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
          Verification Code
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ENTER 6-CHARACTER CODE (e.g. ABC234)"
            maxLength={8}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 font-mono font-extrabold tracking-widest text-sm uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4" />
            View Result
          </button>
        </div>

        <p className="text-[11px] text-slate-400 flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Only checks created by students under your school can be viewed. Codes from other schools will show an error — and a student can&apos;t fake a result, because the exact text that was checked is attached to the code.
        </p>
      </form>
    </div>
  );
}