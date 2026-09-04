"use client";

import { useEffect, useState, useCallback } from "react";
import { CalendarCheck, Plus, Trash2, X, BookOpen } from "lucide-react";

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
  createdBy: string | null;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric", weekday: "short" });
}

export default function ExamsManagerPage() {
  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<Exam[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseId, setCourseId] = useState("");
  const [examDate, setExamDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("11:00");
  const [venue, setVenue] = useState("");
  const [duration, setDuration] = useState("120");
  const [totalMarks, setTotalMarks] = useState("100");
  const [instructions, setInstructions] = useState("");

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem("judmi_user") || "null")); } catch {}
  }, []);

  const fetchAll = useCallback(async () => {
    const [eRes, cRes] = await Promise.all([fetch("/api/org/exams"), fetch("/api/org/timetable/courses")]);
    const eData = await eRes.json();
    const cData = await cRes.json();
    setItems(eData.exams || []);
    setCourses(cData.courses || []);
  }, []);

  useEffect(() => {
    if (!user?.orgId) { setLoading(false); return; }
    fetchAll().finally(() => setLoading(false));
  }, [user?.orgId, fetchAll]);

  const isAdmin = user?.role === "admin" || user?.role === "org_admin";

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !examDate || !startTime || !endTime) return;
    setSaving(true);
    try {
      const course = courses.find((c) => c.id === courseId);
      await fetch("/api/org/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: courseId || null,
          courseName: course?.name || null,
          title,
          description,
          examDate,
          startTime,
          endTime,
          venue: venue || null,
          duration: Number(duration) || null,
          totalMarks: Number(totalMarks) || 100,
          instructions: instructions || null,
        }),
      });
      await fetchAll();
      setShowModal(false);
      setTitle(""); setDescription(""); setCourseId(""); setExamDate(""); setStartTime("09:00"); setEndTime("11:00"); setVenue(""); setDuration("120"); setTotalMarks("100"); setInstructions("");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this exam?")) return;
    await fetch("/api/org/exams", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await fetchAll();
  };

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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <span className="inline-block text-[12px] sm:text-sm font-bold uppercase tracking-[0.22em] text-amber-600">Staff Portal</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2">
            <CalendarCheck className="w-7 h-7 text-navy-700" /> Exam Scheduler
          </h1>
        </div>
        <button type="button" onClick={() => setShowModal(true)} className="btn-primary text-xs px-3 py-2.5 rounded-xl flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Schedule Exam
        </button>
      </div>

      {items.length === 0 ? (
        <div className="surface-elevated rounded-2xl p-8 text-center space-y-3">
          <CalendarCheck className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-500">No exams scheduled yet</p>
          <p className="text-xs text-slate-400">Schedule your first exam so students can prepare.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((e) => (
            <div key={e.id} className="surface-elevated rounded-2xl px-5 py-4 animate-slide-up">
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-900">{e.title}</div>
                  <div className="text-[11px] text-slate-400 font-semibold mt-0.5">
                    {e.courseName || "General"} · {e.totalMarks} marks
                  </div>
                </div>
                {isAdmin && (
                  <button type="button" onClick={() => handleDelete(e.id)} className="text-slate-300 hover:text-rose-500 transition-colors shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {e.description && <p className="mt-2 text-xs text-slate-500 line-clamp-2">{e.description}</p>}
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400 font-semibold">
                <span>📅 {formatDate(e.examDate)}</span>
                <span>🕐 {e.startTime} – {e.endTime}</span>
                {e.venue && <span>📍 {e.venue}</span>}
                {e.duration && <span>⏱ {e.duration} min</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-navy-700" /> Schedule Exam
              </h2>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-rose-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Title <span className="text-rose-500">*</span></label>
                <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. End of Semester Exam" className="input-field py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Brief description…" className="input-field py-2.5 text-sm" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Course</label>
                  <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="input-field py-2.5 text-sm">
                    <option value="">General</option>
                    {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date <span className="text-rose-500">*</span></label>
                  <input type="date" required value={examDate} onChange={(e) => setExamDate(e.target.value)} className="input-field py-2.5 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Start Time <span className="text-rose-500">*</span></label>
                  <input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input-field py-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">End Time <span className="text-rose-500">*</span></label>
                  <input type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} className="input-field py-2.5 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Venue</label>
                  <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. Hall A" className="input-field py-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Duration (min)</label>
                  <input type="number" min={1} value={duration} onChange={(e) => setDuration(e.target.value)} className="input-field py-2.5 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Total Marks</label>
                <input type="number" min={1} value={totalMarks} onChange={(e) => setTotalMarks(e.target.value)} className="input-field py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Exam Instructions</label>
                <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} placeholder="Bring calculator, ID card, etc." className="input-field py-2.5 text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline text-xs flex-1">Cancel</button>
                <button type="submit" disabled={saving || !title.trim() || !examDate || !startTime || !endTime} className="btn-primary text-xs flex-1 disabled:opacity-50">
                  {saving ? "Scheduling…" : "Schedule Exam"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}