"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Search, AlertTriangle, Loader2, ShieldCheck } from "lucide-react";
import PlagiarismResult, { CheckDisplay } from "@/components/PlagiarismResult";

export default function PlagiarismResultPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = (params?.code || "").toUpperCase();
  const [data, setData] = useState<{ check: CheckDisplay; student?: any | null; schoolName?: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lookup, setLookup] = useState("");

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(`/api/plagcheck/${encodeURIComponent(code)}`);
        const json = await res.json();
        if (!res.ok) {
          setError(json.error || "Could not load this check.");
          return;
        }
        setData(json);
      } catch {
        setError("Could not load this check. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [code]);

  const lookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = lookup.trim().toUpperCase();
    if (trimmed.length >= 4) {
      router.push(`/dashboard/plagiarism/${trimmed}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href="/dashboard/plagiarism"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Plagiarism Check Lookup
        </Link>

        <form onSubmit={lookupSubmit} className="flex items-center gap-2 flex-1 sm:max-w-xs">
          <input
            type="text"
            value={lookup}
            onChange={(e) => setLookup(e.target.value.toUpperCase())}
            placeholder="ANOTHER CODE"
            maxLength={8}
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 font-mono font-extrabold tracking-widest text-xs uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center gap-1.5"
            title="Look up code"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-20 text-slate-400 text-xs font-semibold">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading check result…
        </div>
      )}

      {!loading && error && (
        <div className="bg-white rounded-3xl border border-rose-200 shadow-sm p-8 text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-rose-500" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-rose-500" />
              Code {code}
            </h2>
            <p className="text-xs text-slate-500">{error}</p>
            <p className="text-[11px] text-slate-400">
              Codes only work within the school that created them. Ask the student to double-check the code they received.
            </p>
          </div>
          <Link href="/dashboard/plagiarism" className="inline-block text-xs font-bold text-indigo-600 hover:underline">
            ← Back to code entry
          </Link>
        </div>
      )}

      {!loading && !error && data && (
        <PlagiarismResult
          check={data.check}
          student={data.student}
          schoolName={data.schoolName}
        />
      )}
    </div>
  );
}