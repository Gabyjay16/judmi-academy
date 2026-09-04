"use client";

import { useEffect, useState } from "react";
import { GraduationCap, Award, BookOpen, Download, Printer } from "lucide-react";

interface Result {
  id: string;
  courseName: string | null;
  term: string;
  examScore: number | null;
  assignmentScore: number | null;
  total: number | null;
  grade: string | null;
  remarks: string | null;
}

function gradeColor(g: string | null) {
  switch (g) {
    case "A": return "bg-emerald-100 text-emerald-700";
    case "B": return "bg-sky-100 text-sky-700";
    case "C": return "bg-amber-100 text-amber-700";
    case "D": return "bg-orange-100 text-orange-700";
    case "F": return "bg-rose-100 text-rose-700";
    default: return "bg-slate-100 text-slate-600";
  }
}

export default function StudentResultsPage() {
  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem("judmi_user") || "null")); } catch {}
  }, []);

  useEffect(() => {
    if (!user?.orgId) { setLoading(false); return; }
    fetch("/api/org/results")
      .then((r) => r.json())
      .then((data) => setItems(data.results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.orgId]);

  const grouped = items.reduce<Record<string, Result[]>>((acc, r) => {
    (acc[r.term] = acc[r.term] || []).push(r);
    return acc;
  }, {});

  const overall = items.filter((r) => r.total != null);
  const avg = overall.length
    ? Math.round(overall.reduce((s, r) => s + (r.total || 0), 0) / overall.length)
    : 0;

  const print = () => window.print();

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-16 flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center animate-pulse">
          <GraduationCap className="w-6 h-6" />
        </div>
        <p className="text-sm text-slate-500 font-semibold">Loading results…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-16 text-center space-y-4 animate-fade-in">
        <div className="w-16 h-16 rounded-3xl bg-navy-900 text-amber-500 flex items-center justify-center mx-auto">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900">My Results</h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          {user?.orgId ? "No published results yet. Your school publishes transcripts here." : "Link your school account to view results."}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-3 no-print">
        <div>
          <span className="inline-block text-[12px] sm:text-sm font-bold uppercase tracking-[0.22em] text-amber-600">Transcript</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-navy-700" /> My Results
          </h1>
        </div>
        <div className="flex gap-2">
          <a href="/api/org/transcript" className="btn-primary text-xs py-2 px-3 rounded-xl flex items-center gap-1.5 shrink-0">
            <Download className="w-4 h-4" /> Official Transcript (PDF)
          </a>
          <button type="button" onClick={print} className="btn-outline text-xs py-2 px-3 rounded-xl flex items-center gap-1.5 shrink-0">
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {overall.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="surface-elevated rounded-2xl p-5 text-center">
            <Award className="w-6 h-6 text-amber-600 mx-auto" />
            <div className="mt-2 text-2xl font-extrabold text-slate-900">{avg}%</div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Average</div>
          </div>
          <div className="surface-elevated rounded-2xl p-5 text-center">
            <GraduationCap className="w-6 h-6 text-navy-700 mx-auto" />
            <div className="mt-2 text-2xl font-extrabold text-slate-900">{items.length}</div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Subjects</div>
          </div>
        </div>
      )}

      {Object.entries(grouped).map(([term, rows]) => (
        <section key={term} className="animate-slide-up">
          <h2 className="text-sm font-extrabold text-slate-900 mb-2">{term}</h2>
          <div className="surface-elevated rounded-2xl overflow-hidden">
            <div className="hidden sm:grid grid-cols-[1fr_80px_80px_80px_70px] gap-2 px-5 py-3 bg-navy-50 border-b border-navy-100 text-[11px] font-extrabold text-navy-700 uppercase tracking-wide">
              <span>Subject</span>
              <span className="text-center">Exam</span>
              <span className="text-center">Assign</span>
              <span className="text-center">Total</span>
              <span className="text-center">Grade</span>
            </div>
            {rows.map((r) => (
              <div key={r.id} className="grid grid-cols-2 sm:grid-cols-[1fr_80px_80px_80px_70px] gap-2 px-5 py-3.5 border-b border-slate-50 items-center">
                <div className="col-span-2 sm:col-span-1 flex items-center gap-2 min-w-0">
                  <BookOpen className="w-4 h-4 text-slate-300 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">{r.courseName || "General"}</div>
                    {r.remarks && <div className="text-[11px] text-slate-400 truncate">{r.remarks}</div>}
                  </div>
                </div>
                <div className="text-sm text-slate-600 font-semibold sm:text-center">{r.examScore ?? "—"}</div>
                <div className="text-sm text-slate-600 font-semibold sm:text-center">{r.assignmentScore ?? "—"}</div>
                <div className="text-sm font-extrabold text-slate-900 sm:text-center">{r.total ?? "—"}</div>
                <div className="sm:text-center">
                  {r.grade && <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-extrabold ${gradeColor(r.grade)}`}>{r.grade}</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}