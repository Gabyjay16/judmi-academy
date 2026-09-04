"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Clock, MapPin, GraduationCap } from "lucide-react";

interface TimetableEntry {
  id: string;
  day: number;
  periodNo: number;
  startTime: string;
  endTime: string;
  venue: string | null;
  year: string | null;
  courseId: string;
  courseName: string;
  courseCode: string | null;
  departmentId: string | null;
  departmentName: string | null;
  teacherId: string | null;
  teacherName: string | null;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const COURSE_COLORS = [
  { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-800", dot: "bg-indigo-500" },
  { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", dot: "bg-emerald-500" },
  { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", dot: "bg-amber-500" },
  { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-800", dot: "bg-rose-500" },
  { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-800", dot: "bg-sky-500" },
  { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-800", dot: "bg-violet-500" },
  { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-800", dot: "bg-teal-500" },
  { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-800", dot: "bg-orange-500" },
];

export default function StudentTimetablePage() {
  const [user, setUser] = useState<any>(null);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("judmi_user") || "null");
      if (stored) setUser(stored);
    } catch {}
  }, []);

  useEffect(() => {
    if (!user?.orgId) {
      setLoading(false);
      return;
    }
    fetch("/api/org/timetable")
      .then((r) => r.json())
      .then((data) => setEntries(data.entries || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.orgId]);

  const colorMap = new Map<string, number>();
  let colorIdx = 0;
  const getColor = (courseId: string) => {
    if (!colorMap.has(courseId)) {
      colorMap.set(courseId, colorIdx % COURSE_COLORS.length);
      colorIdx++;
    }
    return COURSE_COLORS[colorMap.get(courseId)!];
  };

  // Group entries by day (0-6).
  const byDay = new Map<number, TimetableEntry[]>();
  for (const e of entries) {
    const list = byDay.get(e.day) || [];
    list.push(e);
    byDay.set(e.day, list);
  }

  // Collect all unique periods across all days to render a consistent row grid.
  const allPeriods = Array.from(new Set(entries.map((e) => e.periodNo))).sort((a, b) => a - b);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-16 flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center animate-pulse">
          <CalendarDays className="w-6 h-6" />
        </div>
        <p className="text-sm text-slate-500 font-semibold">Loading your timetable…</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-16 text-center space-y-4 animate-fade-in">
        <div className="w-16 h-16 rounded-3xl bg-navy-900 text-amber-500 flex items-center justify-center mx-auto">
          <CalendarDays className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900">Timetable</h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          {user?.orgId
            ? "Your school hasn't published a timetable yet. Check back later — your teachers are setting it up!"
            : "Link your school account to view your class schedule."}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <span className="inline-block text-[12px] sm:text-sm font-bold uppercase tracking-[0.22em] text-amber-600">
          {user?.year || "Student"}
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2">
          <CalendarDays className="w-7 h-7 text-navy-700" /> My Timetable
        </h1>
        {user?.departmentId && (
          <p className="text-xs text-slate-500 mt-1">Showing schedule for your department and year level.</p>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {Array.from(colorMap.entries()).map(([courseId, idx]) => {
          const entry = entries.find((e) => e.courseId === courseId);
          if (!entry) return null;
          const c = COURSE_COLORS[idx];
          return (
            <span key={courseId} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${c.bg} ${c.text} border ${c.border}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
              {entry.courseCode || entry.courseName}
            </span>
          );
        })}
      </div>

      {/* Weekly grid — horizontal scroll on mobile */}
      <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-[320px]">
          {DAYS.map((dayName, dayIdx) => {
            const dayEntries = (byDay.get(dayIdx) || []).sort((a, b) => a.periodNo - b.periodNo);
            if (dayEntries.length === 0) return null;
            return (
              <div key={dayIdx} className="surface-elevated rounded-2xl overflow-hidden animate-slide-up" style={{ animationDelay: `${dayIdx * 60}ms` }}>
                <div className="px-4 py-3 bg-navy-900 text-white flex items-center gap-2">
                  <span className="text-sm font-extrabold">{dayName}</span>
                  <span className="ml-auto text-[11px] text-navy-200/80 font-semibold">{dayEntries.length} class{dayEntries.length > 1 ? "es" : ""}</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {dayEntries.map((e) => {
                    const c = getColor(e.courseId);
                    return (
                      <div key={e.id} className={`px-4 py-3 flex items-start gap-3 ${c.bg}`}>
                        <div className={`mt-0.5 w-2 h-2 rounded-full ${c.dot} shrink-0`} />
                        <div className="min-w-0 flex-1">
                          <div className={`text-sm font-bold ${c.text}`}>
                            {e.courseCode ? <span className="font-mono">{e.courseCode}</span> : null}{" "}
                            {e.courseName}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                            <Clock className="w-3 h-3" />
                            <span>{e.startTime} – {e.endTime}</span>
                          </div>
                          {e.venue && (
                            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                              <MapPin className="w-3 h-3" />
                              <span>{e.venue}</span>
                            </div>
                          )}
                          {e.teacherName && (
                            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-400">
                              <GraduationCap className="w-3 h-3" />
                              <span>{e.teacherName}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
