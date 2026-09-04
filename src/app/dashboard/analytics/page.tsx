"use client";

import { useEffect, useState } from "react";
import { BarChart3, Users, BookOpen, Wallet, GraduationCap, ClipboardCheck, Library, ShieldAlert } from "lucide-react";

interface Analytics {
  overview: { students: number; teachers: number; courses: number; exams: number; enrollments: number; books: number; borrowed: number; incidents: number; rewards: number; attendanceRecords: number; results: number; invoices: number; };
  attendance: { percent: number; records: number; present: number };
  grades: { A: number; B: number; C: number; D: number; F: number };
  avgTotal: number;
  fees: { billed: number; collected: number; outstanding: number; payments: number };
  byYear: Record<string, { students: number; attendancePct: number; avgTotal: number }>;
}

function money(n: number) {
  return new Intl.NumberFormat("en-US").format(n || 0) + " FCFA";
}

const GRADE_COLORS: Record<string, string> = { A: "bg-emerald-500", B: "bg-blue-500", C: "bg-amber-500", D: "bg-orange-500", F: "bg-rose-500" };

export default function AnalyticsPage() {
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem("judmi_user") || "null")); } catch {}
  }, []);

  useEffect(() => {
    if (!user?.orgId) { setLoading(false); return; }
    fetch("/api/org/analytics")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.orgId]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-5 py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center animate-pulse mx-auto">
          <BarChart3 className="w-6 h-6" />
        </div>
        <p className="text-sm text-slate-500 font-semibold mt-3">Loading analytics…</p>
      </div>
    );
  }

  if (!data) {
    return <div className="max-w-5xl mx-auto px-5 py-16 text-center text-sm text-slate-500">Could not load analytics.</div>;
  }

  const maxGrade = Math.max(1, ...Object.values(data.grades));
  const maxYearStudents = Math.max(1, ...Object.values(data.byYear).map((y) => y.students));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in">
      <div>
        <span className="inline-block text-[12px] sm:text-sm font-bold uppercase tracking-[0.22em] text-amber-600">Staff Portal</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2">
          <BarChart3 className="w-7 h-7 text-navy-700" /> School Analytics
        </h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={<Users className="w-5 h-5" />} label="Students" value={data.overview.students} color="text-navy-700 bg-navy-50" />
        <StatCard icon={<GraduationCap className="w-5 h-5" />} label="Teachers" value={data.overview.teachers} color="text-blue-600 bg-blue-50" />
        <StatCard icon={<BookOpen className="w-5 h-5" />} label="Courses" value={data.overview.courses} color="text-amber-600 bg-amber-50" />
        <StatCard icon={<ClipboardCheck className="w-5 h-5" />} label="Exams" value={data.overview.exams} color="text-purple-600 bg-purple-50" />
        <StatCard icon={<Library className="w-5 h-5" />} label="Books" value={data.overview.books} color="text-teal-600 bg-teal-50" />
        <StatCard icon={<ShieldAlert className="w-5 h-5" />} label="Incidents" value={data.overview.incidents} color="text-rose-600 bg-rose-50" />
      </div>

      {/* Attendance + Avg */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="surface-elevated rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-extrabold text-slate-900">Attendance Rate</h3>
            <span className="text-lg font-extrabold text-navy-700">{data.attendance.percent}%</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${data.attendance.percent}%` }} />
          </div>
          <p className="text-[11px] text-slate-400 font-semibold mt-2">{data.attendance.present} of {data.attendance.records} attendance records present</p>
        </div>
        <div className="surface-elevated rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-extrabold text-slate-900">Average Score</h3>
            <span className="text-lg font-extrabold text-navy-700">{data.avgTotal}%</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-navy-700 rounded-full transition-all" style={{ width: `${Math.min(100, data.avgTotal)}%` }} />
          </div>
          <p className="text-[11px] text-slate-400 font-semibold mt-2">Across {data.overview.results} published results</p>
        </div>
      </div>

      {/* Grade distribution */}
      <section className="surface-elevated rounded-2xl p-5">
        <h3 className="text-sm font-extrabold text-slate-900 mb-4">Grade Distribution</h3>
        <div className="space-y-3">
          {(["A", "B", "C", "D", "F"] as const).map((g) => (
            <div key={g} className="flex items-center gap-3">
              <span className="w-6 text-sm font-extrabold text-slate-700">{g}</span>
              <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${GRADE_COLORS[g]} rounded-full`} style={{ width: `${(data.grades[g] / maxGrade) * 100}%` }} />
              </div>
              <span className="w-8 text-right text-xs font-bold text-slate-500">{data.grades[g]}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Fees */}
      <section className="surface-elevated rounded-2xl p-5">
        <h3 className="text-sm font-extrabold text-slate-900 mb-4 flex items-center gap-2"><Wallet className="w-4 h-4 text-navy-700" /> Fee Collection</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-sm font-extrabold text-slate-900">{money(data.fees.billed)}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">Billed</div>
          </div>
          <div>
            <div className="text-sm font-extrabold text-emerald-600">{money(data.fees.collected)}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">Collected</div>
          </div>
          <div>
            <div className="text-sm font-extrabold text-rose-600">{money(data.fees.outstanding)}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">Outstanding</div>
          </div>
        </div>
      </section>

      {/* By year */}
      {Object.keys(data.byYear).length > 0 && (
        <section className="surface-elevated rounded-2xl p-5">
          <h3 className="text-sm font-extrabold text-slate-900 mb-4">Enrollment by Level</h3>
          <div className="space-y-3">
            {Object.entries(data.byYear).map(([year, y]) => (
              <div key={year} className="flex items-center gap-3">
                <span className="w-24 text-xs font-bold text-slate-600 truncate">{year}</span>
                <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-navy-700 rounded-full" style={{ width: `${(y.students / maxYearStudents) * 100}%` }} />
                </div>
                <span className="w-8 text-right text-xs font-bold text-slate-600">{y.students}</span>
                <span className="w-14 text-right text-[10px] font-bold text-emerald-600">{y.attendancePct}% att</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard(props: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="surface-elevated rounded-2xl p-4">
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${props.color}`}>{props.icon}</span>
      <div className="text-xl font-extrabold text-slate-900 mt-2">{props.value}</div>
      <div className="text-[10px] font-bold text-slate-400 uppercase">{props.label}</div>
    </div>
  );
}
