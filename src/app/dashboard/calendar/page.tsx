"use client";

import { useEffect, useState, useCallback } from "react";
import { CalendarDays, Plus, Trash2, X, Star, GraduationCap, CalendarPlus } from "lucide-react";

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

export default function CalendarPage() {
  const [user, setUser] = useState<any>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [viewYear, setViewYear] = useState<number>(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => new Date().getMonth());
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"event" | "term" | null>(null);
  const [saving, setSaving] = useState(false);

  const [eTitle, setETitle] = useState("");
  const [eDesc, setEDesc] = useState("");
  const [eDate, setEDate] = useState("");
  const [eStart, setEStart] = useState("");
  const [eEnd, setEEnd] = useState("");
  const [eType, setEType] = useState("event");
  const [eVenue, setEVenue] = useState("");
  const [eAudience, setEAudience] = useState("all");

  const [tName, setTName] = useState("");
  const [tStart, setTStart] = useState("");
  const [tEnd, setTEnd] = useState("");
  const [tActive, setTActive] = useState(false);

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem("judmi_user") || "null")); } catch {}
  }, []);

  const isAdmin = user?.role === "admin" || user?.role === "org_admin";

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

  const handleEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/org/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "event", title: eTitle, description: eDesc, date: eDate, startTime: eStart || null, endTime: eEnd || null, type: eType, venue: eVenue || null, audience: eAudience }),
      });
      setModal(null);
      setETitle(""); setEDesc(""); setEDate(""); setEStart(""); setEEnd(""); setEType("event"); setEVenue(""); setEAudience("all");
      await fetchAll();
    } finally { setSaving(false); }
  };

  const handleTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/org/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "term", name: tName, startDate: tStart || null, endDate: tEnd || null, setActive: tActive }),
      });
      setModal(null);
      setTName(""); setTStart(""); setTEnd(""); setTActive(false);
      if (tActive) setTerms([]);
      await fetchAll();
    } finally { setSaving(false); }
  };

  const handleSetActive = async (id: string) => {
    await fetch("/api/org/calendar", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_active_term", id }),
    });
    await fetchAll();
  };

  const handleDelete = async (id: string, kind: string) => {
    if (!confirm("Delete this " + kind + "?")) return;
    await fetch("/api/org/calendar", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, kind }),
    });
    await fetchAll();
  };

  // Build month grid
  const monthEvents = events.filter((ev) => {
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <span className="inline-block text-[12px] sm:text-sm font-bold uppercase tracking-[0.22em] text-amber-600">Staff Portal</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-navy-700" /> Academic Calendar
          </h1>
          {activeTerm && (
            <div className="mt-1 text-[11px] font-bold text-emerald-600 flex items-center gap-1">
              <Star className="w-3 h-3" /> Active term: {activeTerm.name}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setModal("event")} className="btn-primary text-xs px-3 py-2.5 rounded-xl flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add Event
          </button>
          <button type="button" onClick={() => setModal("term")} className="btn-outline text-xs px-3 py-2.5 rounded-xl flex items-center gap-1.5">
            <CalendarPlus className="w-4 h-4" /> New Term
          </button>
        </div>
      </div>

      {/* Terms */}
      {terms.length > 0 && (
        <section>
          <h2 className="text-sm font-extrabold text-slate-900 mb-3">Terms & Sessions</h2>
          <div className="space-y-2">
            {terms.map((t) => (
              <div key={t.id} className="surface-elevated rounded-2xl px-4 py-3 flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-navy-50 text-navy-700 flex items-center justify-center shrink-0"><GraduationCap className="w-4 h-4" /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    {t.name}
                    {t.isActive === 1 && <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg uppercase">Active</span>}
                  </div>
                  <div className="text-[11px] text-slate-400 font-semibold">{t.startDate ? `From ${fmt(t.startDate)}` : "No start date"}{t.endDate ? ` · to ${fmt(t.endDate)}` : ""}</div>
                </div>
                {isAdmin && t.isActive !== 1 && (
                  <button type="button" onClick={() => handleSetActive(t.id)} className="btn-outline text-[10px] px-2.5 py-1.5 rounded-lg">Set Active</button>
                )}
                {isAdmin && (
                  <button type="button" onClick={() => handleDelete(t.id, "term")} className="text-slate-300 hover:text-rose-500 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                )}
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

      {/* Upcoming events list */}
      <section>
        <h2 className="text-sm font-extrabold text-slate-900 mb-3">Upcoming Events</h2>
        {events.length === 0 ? (
          <div className="surface-elevated rounded-2xl p-6 text-center">
            <p className="text-xs text-slate-400">No events yet. Add exams, holidays, and deadlines here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {[...events].sort((a, b) => a.date.localeCompare(b.date)).map((ev) => {
              const meta = TYPE_META[ev.type] || TYPE_META.event;
              return (
                <div key={ev.id} className="surface-elevated rounded-2xl px-4 py-3 flex items-start gap-3">
                  <span className={`text-[9px] font-extrabold uppercase px-2 py-1 rounded-lg border shrink-0 mt-0.5 ${meta.color}`}>{ev.type}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-900">{ev.title}</div>
                    <div className="text-[11px] text-slate-400 font-semibold mt-0.5">
                      {fmt(ev.date)}{ev.startTime ? ` · ${ev.startTime}${ev.endTime ? `–${ev.endTime}` : ""}` : ""}{ev.venue ? ` · ${ev.venue}` : ""}{ev.audience !== "all" ? ` · ${ev.audience}` : ""}
                    </div>
                    {ev.description && <div className="text-xs text-slate-500 mt-1 line-clamp-2">{ev.description}</div>}
                  </div>
                  {isAdmin && <button type="button" onClick={() => handleDelete(ev.id, "event")} className="text-slate-300 hover:text-rose-500 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Event modal */}
      {modal === "event" && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2"><CalendarDays className="w-5 h-5 text-navy-700" /> Add Event</h2>
              <button type="button" onClick={() => setModal(null)} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleEvent} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Title <span className="text-rose-500">*</span></label>
                <input type="text" required value={eTitle} onChange={(e) => setETitle(e.target.value)} className="input-field py-2.5 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date <span className="text-rose-500">*</span></label>
                  <input type="date" required value={eDate} onChange={(e) => setEDate(e.target.value)} className="input-field py-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Type</label>
                  <select value={eType} onChange={(e) => setEType(e.target.value)} className="input-field py-2.5 text-sm">
                    <option value="event">Event</option>
                    <option value="holiday">Holiday</option>
                    <option value="deadline">Deadline</option>
                    <option value="exam">Exam</option>
                    <option value="term_start">Term Start</option>
                    <option value="term_end">Term End</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Start Time</label>
                  <input type="time" value={eStart} onChange={(e) => setEStart(e.target.value)} className="input-field py-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">End Time</label>
                  <input type="time" value={eEnd} onChange={(e) => setEEnd(e.target.value)} className="input-field py-2.5 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Venue</label>
                  <input type="text" value={eVenue} onChange={(e) => setEVenue(e.target.value)} className="input-field py-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Audience</label>
                  <select value={eAudience} onChange={(e) => setEAudience(e.target.value)} className="input-field py-2.5 text-sm">
                    <option value="all">Everyone</option>
                    <option value="students">Students</option>
                    <option value="teachers">Teachers</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea value={eDesc} onChange={(e) => setEDesc(e.target.value)} rows={2} className="input-field py-2.5 text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)} className="btn-outline text-xs flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary text-xs flex-1">{saving ? "Saving…" : "Add Event"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Term modal */}
      {modal === "term" && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2"><CalendarPlus className="w-5 h-5 text-navy-700" /> New Term / Session</h2>
              <button type="button" onClick={() => setModal(null)} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleTerm} className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Name <span className="text-rose-500">*</span></label>
                <input type="text" required value={tName} onChange={(e) => setTName(e.target.value)} placeholder="e.g. Term 1 · 2025-2026" className="input-field py-2.5 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Start Date</label>
                  <input type="date" value={tStart} onChange={(e) => setTStart(e.target.value)} className="input-field py-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">End Date</label>
                  <input type="date" value={tEnd} onChange={(e) => setTEnd(e.target.value)} className="input-field py-2.5 text-sm" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <input type="checkbox" checked={tActive} onChange={(e) => setTActive(e.target.checked)} className="w-4 h-4" />
                Set as the active term now
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)} className="btn-outline text-xs flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary text-xs flex-1">{saving ? "Saving…" : "Create Term"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
