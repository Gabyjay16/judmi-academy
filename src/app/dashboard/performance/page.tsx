"use client";

import { useEffect, useState } from "react";
import { TrendingUp, GraduationCap, Award, ClipboardCheck, BarChart2 } from "lucide-react";

interface Data { overview: { overallAvg: number | null; overallPassRate: number | null; totalAssessments: number }; gradeDistribution: { grade: string; count: number }[]; courseStats: { name: string; count: number; avg: number | null; passRate: number | null; gradeCounts: Record<string, number> }[]; deptStats: { name: string; count: number; avg: number | null }[]; levelStats: { name: string; count: number; avg: number | null }[]; }

const GRADE_COLOR: Record<string, string> = { A: "#059669", B: "#0369a1", C: "#d97706", D: "#c2410c", F: "#e11d48" };

export default function PerformancePage() {
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { try { setUser(JSON.parse(localStorage.getItem("judmi_user") || "null")); } catch {} }, []);
  const isAdmin = user?.role === "admin" || user?.role === "org_admin";

  useEffect(() => {
    if (!user?.orgId) { setLoading(false); return; }
    fetch("/api/org/performance")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.orgId]);

  if (!isAdmin) {
    return <div className="max-w-2xl mx-auto px-5 py-16 text-center surface-elevated rounded-2xl"><p className="text-sm text-slate-500 font-semibold">Only administrators and org admins can view performance analytics.</p></div>;
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-5 py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center animate-pulse mx-auto"><TrendingUp className="w-6 h-6" /></div>
        <p className="text-sm text-slate-500 font-semibold mt-3">Computing performance…</p>
      </div>
    );
  }

  if (!data) {
    return <div className="max-w-2xl mx-auto px-5 py-16 text-center surface-elevated rounded-2xl"><p className="text-sm text-slate-500 font-semibold">No performance data available.</p></div>;
  }

  const maxGradeCount = Math.max(1, ...data.gradeDistribution.map((g) => g.count));
  const maxCourseAvg = Math.max(1, ...data.courseStats.map((c) => c.avg ?? 0));
  const maxDeptAvg = Math.max(1, ...data.deptStats.map((d) => d.avg ?? 0));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in">
      <div>
        <span className="inline-block text-[12px] sm:text-sm font-bold uppercase tracking-[0.22em] text-amber-600">Staff Portal</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2">
          <BarChart2 className="w-7 h-7 text-navy-700" /> Performance Analytics
        </h1>
        <p className="text-xs text-slate-400 font-semibold mt-0.5">Class, course & department performance from published results.</p>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="surface-elevated rounded-2xl p-4">
          <div className="text-[10px] font-extrabold uppercase text-slate-400 flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> Overall Average</div>
          <div className="text-3xl font-black text-navy-800">{data.overview.overallAvg ?? "—"}</div>
        </div>
        <div className="surface-elevated rounded-2xl p-4">
          <div className="text-[10px] font-extrabold uppercase text-slate-400 flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" /> Pass Rate</div>
          <div className="text-3xl font-black text-emerald-600">{data.overview.overallPassRate == null ? "—" : data.overview.overallPassRate + "%"}</div>
        </div>
        <div className="surface-elevated rounded-2xl p-4">
          <div className="text-[10px] font-extrabold uppercase text-slate-400 flex items-center gap-1"><ClipboardCheck className="w-3.5 h-3.5" /> Assessments</div>
          <div className="text-3xl font-black text-slate-800">{data.overview.totalAssessments}</div>
        </div>
      </div>

      {/* Grade distribution */}
      <section className="surface-elevated rounded-2xl p-5">
        <h2 className="text-sm font-extrabold text-slate-900 mb-4 flex items-center gap-2"><Award className="w-4 h-4 text-amber-500" /> Grade Distribution</h2>
        <div className="space-y-3">
          {data.gradeDistribution.map((g) => (
            <div key={g.grade}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold" style={{ color: GRADE_COLOR[g.grade] }}>Grade {g.grade}</span>
                <span className="text-xs font-bold text-slate-500">{g.count}</span>
              </div>
              <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${(g.count / maxGradeCount) * 100}%`, backgroundColor: GRADE_COLOR[g.grade] }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* By course */}
      <section className="surface-elevated rounded-2xl p-5">
        <h2 className="text-sm font-extrabold text-slate-900 mb-4">Average by Course</h2>
        {data.courseStats.length === 0 ? (
          <p className="text-xs text-slate-400 font-semibold">No results yet.</p>
        ) : (
          <div className="space-y-3">
            {data.courseStats.map((c) => (
              <div key={c.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-700 truncate">{c.name}</span>
                  <span className="text-xs font-bold text-navy-700">{c.avg ?? "—"} · {c.passRate == null ? "—" : c.passRate + "%"} pass</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-navy-600 transition-all" style={{ width: `${((c.avg ?? 0) / maxCourseAvg) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* By department */}
      <section className="surface-elevated rounded-2xl p-5">
        <h2 className="text-sm font-extrabold text-slate-900 mb-4">Average by Department</h2>
        {data.deptStats.length === 0 ? (
          <p className="text-xs text-slate-400 font-semibold">No data yet.</p>
        ) : (
          <div className="space-y-3">
            {data.deptStats.map((d) => (
              <div key={d.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-700">{d.name}</span>
                  <span className="text-xs font-bold text-slate-500">{d.avg ?? "—"} ({d.count})</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${((d.avg ?? 0) / maxDeptAvg) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* By level/class */}
      {data.levelStats.length > 0 && (
        <section className="surface-elevated rounded-2xl p-5">
          <h2 className="text-sm font-extrabold text-slate-900 mb-4">Performance by Level / Class</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {data.levelStats.map((l) => (
              <div key={l.name} className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                <div className="text-xs font-extrabold uppercase text-slate-400">{l.name}</div>
                <div className="text-2xl font-black text-slate-800 mt-1">{l.avg ?? "—"}</div>
                <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{l.count} assessments</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
