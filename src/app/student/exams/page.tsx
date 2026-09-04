"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, MapPin, Clock, BookOpen, AlertCircle, Timer } from "lucide-react";

interface Exam {
  id: string;
  courseName: string | null;
  title: string;
  description: string | null;
  examDate: string;
  startTime: string;
  endTime: string;
  venue: string | null;
  duration: number | null;
  totalMarks: number;
  instructions: string | null;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric", weekday: "short" });
}

function isUpcoming(dateStr: string) {
  return new Date(dateStr) >= new Date(new Date().toDateString());
}

export default function StudentExamsPage() {
  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem("judmi_user") || "null")); } catch {}
  }, []);

  useEffect(() => {
    if (!user?.orgId) { setLoading(false); return; }
    fetch("/api/org/exams")
      .then((r) => r.json())
      .then((data) => setItems(data.exams || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.orgId]);

  const upcoming = items.filter((e) => isUpcoming(e.examDate));
  const past = items.filter((e) => !isUpcoming(e.examDate));

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-16 flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center animate-pulse">
          <CalendarCheck className="w-6 h-6" />
        </div>
        <p className="text-sm text-slate-500 font-semibold">Loading exams…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-16 text-center space-y-4 animate-fade-in">
        <div className="w-16 h-16 rounded-3xl bg-navy-900 text-amber-500 flex items-center justify-center mx-auto">
          <CalendarCheck className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900">Exam Schedule</h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          {user?.orgId ? "No exams scheduled yet. Your teachers will post exams here." : "Link your school account to see exams."}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in">
      <div>
        <span className="inline-block text-[12px] sm:text-sm font-bold uppercase tracking-[0.22em] text-amber-600">{user?.year || "Student"}</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2">
          <CalendarCheck className="w-7 h-7 text-navy-700" /> Exam Schedule
        </h1>
      </div>

      {upcoming.length > 0 && (
        <section>
          <h2 className="text-sm font-extrabold text-slate-900 mb-3 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Upcoming Exams ({upcoming.length})
          </h2>
          <div className="space-y-3">
            {upcoming.map((e) => (
              <div key={e.id} className="surface-elevated rounded-2xl p-5 animate-slide-up">
                <div className="flex items-start gap-3">
                  <span className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                    <CalendarCheck className="w-5 h-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-extrabold text-slate-900">{e.title}</h3>
                    <div className="text-[11px] text-slate-400 font-semibold mt-0.5">
                      {e.courseName || "General"} · {e.totalMarks} marks
                    </div>
                  </div>
                </div>
                {e.description && <p className="mt-3 text-sm text-slate-600 whitespace-pre-wrap">{e.description}</p>}
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-navy-50 rounded-xl px-3 py-2 text-center">
                    <div className="text-[10px] font-bold text-navy-600 uppercase">Date</div>
                    <div className="text-xs font-extrabold text-navy-900 mt-0.5">{formatDate(e.examDate)}</div>
                  </div>
                  <div className="bg-navy-50 rounded-xl px-3 py-2 text-center">
                    <div className="text-[10px] font-bold text-navy-600 uppercase">Time</div>
                    <div className="text-xs font-extrabold text-navy-900 mt-0.5">{e.startTime} – {e.endTime}</div>
                  </div>
                  {e.venue && (
                    <div className="bg-amber-50 rounded-xl px-3 py-2 text-center">
                      <div className="text-[10px] font-bold text-amber-600 uppercase">Venue</div>
                      <div className="text-xs font-extrabold text-amber-900 mt-0.5">{e.venue}</div>
                    </div>
                  )}
                  {e.duration && (
                    <div className="bg-slate-50 rounded-xl px-3 py-2 text-center">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Duration</div>
                      <div className="text-xs font-extrabold text-slate-900 mt-0.5">{e.duration} min</div>
                    </div>
                  )}
                </div>
                {e.instructions && (
                  <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800 whitespace-pre-wrap">
                    <span className="font-bold">Instructions:</span> {e.instructions}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="text-sm font-extrabold text-slate-400 mb-3">Past Exams ({past.length})</h2>
          <div className="space-y-2">
            {past.map((e) => (
              <div key={e.id} className="surface-elevated rounded-2xl px-5 py-3.5 opacity-60">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center shrink-0">
                    <CalendarCheck className="w-4 h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-700">{e.title}</div>
                    <div className="text-[11px] text-slate-400 font-semibold">{e.courseName || "General"} · {formatDate(e.examDate)} · {e.startTime}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}