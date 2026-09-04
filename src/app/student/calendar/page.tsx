"use client";

import { useEffect, useState, useCallback } from "react";
import { CalendarDays } from "lucide-react";

interface Event { id: string; title: string; description: string | null; date: string; startTime: string | null; endTime: string | null; type: string; venue: string | null; audience: string; }
interface Term { id: string; name: string; startDate: string | null; endDate: string | null; isActive: number; }

const TYPE_META: Record<string, { color: string; dot: string }> = {
  event: { color: "text-navy-700 bg-navy-50 border-navy-100", dot: "bg-navy-500" },
  holiday: { color: "text-emerald-600 bg-emerald-50 border-emerald-100", dot: "bg-emerald-500" },
  deadline: { color: "text-rose-600 bg-rose-50 border-rose-100", dot: "bg-rose-500" },
  exam: { color: "text-amber-600 bg-amber-50 border-amber-100", dot: "bg-amber-500" },
  term_start: { color: "text-blue-600 bg-blue-50 border-blue-100", dot: "bg-blue-500" },
  term_end: { color: "text-purple-600 bg-purple-50 border-purple-100", dot: "bg-purple-500" },
};

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric", weekday: "short" });
}

export default function StudentCalendar() {
  const [user, setUser] = useState<any>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [viewYear, setViewYear] = useState<number>(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => new Date().getMonth());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem("judmi_user") || "null")); } catch {}
  }, []);

  const fetchAll = useCallback(async () => {
    const res = await fetch("/api/org/calendar");
    const d = await res.json();
    setEvents(d.events || []);
    setTerms(d.terms || []);
  }, []);

  useEffect(() => {
    if (!user?.orgId) { setLoading(false); return; }
    fetchAll().finally(() => setLoading(false));
  }, [user?.orgId, fetchAll]);

  // Only show events the student can see
  const visible = events.filter((ev) => ev.audience === "all" || ev.audience === "students");

  const monthEvents = visible.filter((ev) => {
    const d = new Date(ev.date + "T00:00:00");
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
  });
  const monthMap: Record<number, Event[]> = {};
  monthEvents.forEach((ev) => {
    const d = new Date(ev.date + "T00:00:00");
    (monthMap[d.getDate()] = monthMap[d.getDate()] || []).push(ev);
  });

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const today = new Date();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const activeTerm = terms.find((t) => t.isActive === 1);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-5 py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center animate-pulse mx-auto">
          <CalendarDays className="w-6 h-6" />
        </div>
        <p className="text-sm text-slate-500 font-semibold mt-3">Loading calendar…</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in">
      <div>
        <span className="inline-block text-[12px] sm:text-sm font-bold uppercase tracking-[0.22em] text-amber-600">Student Portal</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2">
          <CalendarDays className="w-7 h-7 text-navy-700" /> Academic Calendar
        </h1>
        {activeTerm && <p className="text-[11px] font-bold text-emerald-600 mt-1">Active term: {activeTerm.name}</p>}
      </div>

      {/* Terms */}
      {terms.length > 0 && (
        <section>
          <h2 className="text-sm font-extrabold text-slate-900 mb-3">Terms & Sessions</h2>
          <div className="flex flex-wrap gap-2">
            {terms.map((t) => (
              <div key={t.id} className={`surface-elevated rounded-xl px-3 py-2 text-xs font-bold ${t.isActive === 1 ? "text-emerald-700 bg-emerald-50" : "text-slate-600"}`}>
                {t.name} {t.isActive === 1 && "· Active"}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Month grid */}
      <section className="surface-elevated rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-extrabold text-slate-900">{monthNames[viewMonth]} {viewYear}</h2>
          <div className="flex gap-2">
            <button type="button" onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); } else setViewMonth(viewMonth - 1); }} className="btn-outline text-xs px-2.5 py-1.5 rounded-lg">‹</button>
            <button type="button" onClick={() => { const now = new Date(); setViewMonth(now.getMonth()); setViewYear(now.getFullYear()); }} className="btn-outline text-xs px-2.5 py-1.5 rounded-lg">Today</button>
            <button type="button" onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); } else setViewMonth(viewMonth + 1); }} className="btn-outline text-xs px-2.5 py-1.5 rounded-lg">›</button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase mb-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={"e" + i} className="aspect-square rounded-lg" />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const evs = monthMap[day] || [];
            const isToday = today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
            return (
              <div key={day} className={`aspect-square rounded-lg p-1 border ${isToday ? "bg-navy-900 text-white border-navy-900" : "bg-slate-50 border-slate-100"} relative overflow-hidden`}>
                <div className="text-[11px] font-extrabold">{day}</div>
                <div className="mt-1 space-y-0.5">
                  {evs.slice(0, 2).map((ev) => (
                    <div key={ev.id} className="flex items-center gap-1 truncate">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${TYPE_META[ev.type]?.dot || "bg-navy-500"}`} />
                      <span className="text-[9px] font-semibold truncate leading-tight">{ev.title}</span>
                    </div>
                  ))}
                  {evs.length > 2 && <div className="text-[9px] font-bold text-slate-400">+{evs.length - 2} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Upcoming events */}
      <section>
        <h2 className="text-sm font-extrabold text-slate-900 mb-3">Upcoming Events</h2>
        {visible.length === 0 ? (
          <div className="surface-elevated rounded-2xl p-6 text-center">
            <p className="text-xs text-slate-400">No events have been published yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {[...visible].sort((a, b) => a.date.localeCompare(b.date)).map((ev) => {
              const meta = TYPE_META[ev.type] || TYPE_META.event;
              return (
                <div key={ev.id} className="surface-elevated rounded-2xl px-4 py-3 flex items-start gap-3">
                  <span className={`text-[9px] font-extrabold uppercase px-2 py-1 rounded-lg border shrink-0 mt-0.5 ${meta.color}`}>{ev.type}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-900">{ev.title}</div>
                    <div className="text-[11px] text-slate-400 font-semibold mt-0.5">
                      {fmt(ev.date)}{ev.startTime ? ` · ${ev.startTime}${ev.endTime ? `–${ev.endTime}` : ""}` : ""}{ev.venue ? ` · ${ev.venue}` : ""}
                    </div>
                    {ev.description && <div className="text-xs text-slate-500 mt-1 line-clamp-2">{ev.description}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
