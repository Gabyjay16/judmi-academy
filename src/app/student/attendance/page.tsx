"use client";

import { useEffect, useState } from "react";
import { ClipboardCheck, CheckCircle2, XCircle, Clock, Ban } from "lucide-react";

interface Summary {
  courseId: string;
  courseName: string;
  courseCode: string | null;
  total: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  attendancePct: number;
}

const STATUS_ICONS: Record<string, { icon: any; color: string }> = {
  present: { icon: CheckCircle2, color: "text-emerald-500" },
  absent: { icon: XCircle, color: "text-rose-500" },
  late: { icon: Clock, color: "text-amber-500" },
  excused: { icon: Ban, color: "text-slate-400" },
};

function pctColor(pct: number) {
  if (pct >= 80) return "text-emerald-600";
  if (pct >= 60) return "text-amber-600";
  return "text-rose-600";
}

function pctRing(pct: number) {
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 60) return "bg-amber-500";
  return "bg-rose-500";
}

export default function StudentAttendancePage() {
  const [user, setUser] = useState<any>(null);
  const [summary, setSummary] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem("judmi_user") || "null")); } catch {}
  }, []);

  useEffect(() => {
    if (!user?.orgId) { setLoading(false); return; }
    fetch("/api/org/attendance/summary")
      .then((r) => r.json())
      .then((data) => setSummary(data.summary || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.orgId]);

  const totalSessions = summary.reduce((a, s) => a + s.total, 0);
  const totalPresent = summary.reduce((a, s) => a + s.present + s.late, 0);
  const overallPct = totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : 0;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-16 flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center animate-pulse">
          <ClipboardCheck className="w-6 h-6" />
        </div>
        <p className="text-sm text-slate-500 font-semibold">Loading attendance…</p>
      </div>
    );
  }

  if (summary.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-16 text-center space-y-4 animate-fade-in">
        <div className="w-16 h-16 rounded-3xl bg-navy-900 text-amber-500 flex items-center justify-center mx-auto">
          <ClipboardCheck className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900">Attendance</h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          {user?.orgId
            ? "No attendance records yet. Your teachers will mark attendance during classes."
            : "Link your school account to view your attendance."}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5 animate-fade-in">
      <div>
        <span className="inline-block text-[12px] sm:text-sm font-bold uppercase tracking-[0.22em] text-amber-600">
          {user?.year || "Student"}
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2">
          <ClipboardCheck className="w-7 h-7 text-navy-700" /> My Attendance
        </h1>
      </div>

      {/* Overall card */}
      <div className="surface-elevated rounded-2xl p-5 flex items-center gap-5">
        <div className="relative w-20 h-20 shrink-0">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="35" fill="none" stroke="#e2e8f0" strokeWidth="6" />
            <circle
              cx="40" cy="40" r="35" fill="none"
              className={pctRing(overallPct)}
              strokeWidth="6"
              strokeDasharray={`${(overallPct / 100) * 220} 220`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-lg font-extrabold ${pctColor(overallPct)}`}>{overallPct}%</span>
          </div>
        </div>
        <div>
          <div className="text-sm font-bold text-slate-900">Overall Attendance</div>
          <div className="text-xs text-slate-500 mt-0.5">{totalPresent} / {totalSessions} sessions attended</div>
        </div>
      </div>

      {/* Per-course breakdown */}
      <div className="space-y-3">
        {summary.map((s) => (
          <div key={s.courseId} className="surface-elevated rounded-2xl overflow-hidden animate-slide-up">
            <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100">
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900">
                  {s.courseCode ? <span className="font-mono text-navy-700">{s.courseCode}</span> : null}{" "}
                  {s.courseName}
                </div>
              </div>
              <span className={`text-lg font-extrabold ${pctColor(s.attendancePct)}`}>{s.attendancePct}%</span>
            </div>
            <div className="px-4 py-3 grid grid-cols-4 gap-2 text-center">
              {(["present", "late", "absent", "excused"] as const).map((st) => {
                const val = s[st];
                const info = STATUS_ICONS[st];
                return (
                  <div key={st} className="flex flex-col items-center gap-1">
                    <info.icon className={`w-4 h-4 ${info.color}`} />
                    <span className="text-sm font-bold text-slate-900">{val}</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{st}</span>
                  </div>
                );
              })}
            </div>
            {/* Mini progress bar */}
            <div className="h-1.5 bg-slate-100 flex">
              {s.total > 0 && (
                <>
                  <div className="bg-emerald-500" style={{ width: `${(s.present / s.total) * 100}%` }} />
                  <div className="bg-amber-500" style={{ width: `${(s.late / s.total) * 100}%` }} />
                  <div className="bg-slate-300" style={{ width: `${(s.excused / s.total) * 100}%` }} />
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
