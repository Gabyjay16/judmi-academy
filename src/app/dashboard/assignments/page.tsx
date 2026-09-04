"use client";

import { useEffect, useState, useCallback } from "react";
import { ClipboardList, Plus, Trash2, X, Pin, CalendarDays, BookOpen, Users, CheckCircle2, ArrowLeft, Send } from "lucide-react";

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  courseName: string | null;
  dueDate: string | null;
  maxScore: number;
  pinned: number;
  createdAt: string;
  submissionCount?: number;
}

interface Submission {
  id: string;
  studentName: string | null;
  content: string | null;
  score: number | null;
  feedback: string | null;
  submittedAt: string;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}

export default function AssignmentsManagerPage() {
  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseId, setCourseId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  const [viewing, setViewing] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [gradeDrafts, setGradeDrafts] = useState<Record<string, { score: string; feedback: string }>>({});
  const [loadingGrade, setLoadingGrade] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem("judmi_user") || "null")); } catch {}
  }, []);

  const fetchAll = useCallback(async () => {
    const [aRes, cRes] = await Promise.all([fetch("/api/org/assignments"), fetch("/api/org/timetable/courses")]);
    const aData = await aRes.json();
    const cData = await cRes.json();
    setItems(aData.assignments || []);
    setCourses(cData.courses || []);
  }, []);

  useEffect(() => {
    if (!user?.orgId) { setLoading(false); return; }
    fetchAll().finally(() => setLoading(false));
  }, [user?.orgId, fetchAll]);

  const isAdmin = user?.role === "admin" || user?.role === "org_admin";

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const course = courses.find((c) => c.id === courseId);
      await fetch("/api/org/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          courseId: courseId || null,
          courseName: course?.name || null,
          dueDate: dueDate || null,
          maxScore: Number(maxScore) || 100,
          pinned,
        }),
      });
      await fetchAll();
      setShowModal(false);
      setTitle(""); setDescription(""); setCourseId(""); setDueDate(""); setMaxScore("100"); setPinned(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this assignment and all its submissions?")) return;
    await fetch("/api/org/assignments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await fetchAll();
  };

  const openAssignment = async (a: Assignment) => {
    setViewing(a);
    const res = await fetch(`/api/org/assignments/${a.id}/grade`);
    const data = await res.json();
    setSubmissions(data.submissions || []);
    const drafts: Record<string, { score: string; feedback: string }> = {};
    for (const s of data.submissions || []) drafts[s.id] = { score: s.score != null ? String(s.score) : "", feedback: s.feedback || "" };
    setGradeDrafts(drafts);
  };

  const saveGrade = async (submissionId: string) => {
    if (!viewing) return;
    setLoadingGrade((p) => ({ ...p, [submissionId]: true }));
    try {
      const d = gradeDrafts[submissionId] || { score: "", feedback: "" };
      await fetch(`/api/org/assignments/${viewing.id}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, score: d.score, feedback: d.feedback }),
      });
      await openAssignment(viewing);
    } finally {
      setLoadingGrade((p) => ({ ...p, [submissionId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-16 flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center animate-pulse">
          <ClipboardList className="w-6 h-6" />
        </div>
        <p className="text-sm text-slate-500 font-semibold">Loading assignments…</p>
      </div>
    );
  }

  if (viewing) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5 animate-fade-in">
        <button type="button" onClick={() => setViewing(null)} className="inline-flex items-center gap-1.5 text-xs font-bold text-navy-700 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to assignments
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">{viewing.title}</h1>
          <div className="text-[12px] text-slate-400 font-semibold mt-1">
            {viewing.courseName || "General"} · Max {viewing.maxScore} pts · {submissions.length} submission{submissions.length === 1 ? "" : "s"}
          </div>
          {viewing.description && <p className="mt-3 text-sm text-slate-600 whitespace-pre-wrap">{viewing.description}</p>}
        </div>

        {submissions.length === 0 ? (
          <div className="surface-elevated rounded-2xl p-8 text-center space-y-2">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-500">No submissions yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((s) => {
              const d = gradeDrafts[s.id] || { score: "", feedback: "" };
              return (
                <div key={s.id} className="surface-elevated rounded-2xl p-5 animate-slide-up">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-full bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center text-xs font-extrabold">
                        {(s.studentName || "?").charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <div className="text-sm font-bold text-slate-900">{s.studentName || "Unknown student"}</div>
                        <div className="text-[11px] text-slate-400 font-semibold">Submitted {formatDate(s.submittedAt)}</div>
                      </div>
                    </div>
                    {s.score != null ? (
                      <span className="text-xs font-extrabold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {s.score}/{viewing.maxScore}
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-amber-600">Ungraded</span>
                    )}
                  </div>

                  <div className="mt-3 bg-slate-50 rounded-xl p-3 text-[13px] text-slate-700 whitespace-pre-wrap">{s.content}</div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Score (max {viewing.maxScore})</label>
                      <input
                        type="number"
                        min={0}
                        max={viewing.maxScore}
                        value={d.score}
                        onChange={(e) => setGradeDrafts((p) => ({ ...p, [s.id]: { ...p[s.id], score: e.target.value } }))}
                        className="input-field py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Feedback</label>
                      <input
                        type="text"
                        value={d.feedback}
                        onChange={(e) => setGradeDrafts((p) => ({ ...p, [s.id]: { ...p[s.id], feedback: e.target.value } }))}
                        placeholder="Feedback…"
                        className="input-field py-2 text-sm"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!!loadingGrade[s.id]}
                    onClick={() => saveGrade(s.id)}
                    className="mt-3 btn-primary text-xs py-2 rounded-xl w-full sm:w-auto px-6 flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" /> {loadingGrade[s.id] ? "Saving…" : "Save Grade"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <span className="inline-block text-[12px] sm:text-sm font-bold uppercase tracking-[0.22em] text-amber-600">Staff Portal</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-navy-700" /> Assignments & Grading
          </h1>
        </div>
        <button type="button" onClick={() => setShowModal(true)} className="btn-primary text-xs px-3 py-2.5 rounded-xl flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> New Assignment
        </button>
      </div>

      {items.length === 0 ? (
        <div className="surface-elevated rounded-2xl p-8 text-center space-y-3">
          <ClipboardList className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-500">No assignments yet</p>
          <p className="text-xs text-slate-400">Create your first assignment to distribute work to students.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((a) => (
            <div key={a.id} className={`surface-elevated rounded-2xl overflow-hidden animate-slide-up ${a.pinned ? "ring-2 ring-amber-300" : ""}`}>
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${a.pinned ? "bg-amber-50 text-amber-600" : "bg-navy-50 text-navy-700"}`}>
                    {a.pinned ? <Pin className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-900">{a.title}</div>
                    <div className="text-[11px] text-slate-400 font-semibold mt-0.5">
                      {a.courseName || "General"} · {a.maxScore} pts
                    </div>
                  </div>
                  {isAdmin && (
                    <button type="button" onClick={() => handleDelete(a.id)} className="text-slate-300 hover:text-rose-500 transition-colors shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {a.description && <p className="mt-2.5 text-xs text-slate-500 line-clamp-2">{a.description}</p>}
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 font-semibold">
                    {a.dueDate && <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {formatDate(a.dueDate)}</span>}
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {a.submissionCount ?? 0}</span>
                  </div>
                  <button type="button" onClick={() => openAssignment(a)} className="text-[11px] font-bold text-navy-700 hover:underline">
                    Grade →
                  </button>
                </div>
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
                <ClipboardList className="w-5 h-5 text-navy-700" /> New Assignment
              </h2>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-rose-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Title <span className="text-rose-500">*</span></label>
                <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Chapter 4 homework" className="input-field py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Instructions</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Describe the assignment…" className="input-field py-2.5 text-sm" />
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Due Date (optional)</label>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input-field py-2.5 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Maximum Score</label>
                <input type="number" min={1} value={maxScore} onChange={(e) => setMaxScore(e.target.value)} className="input-field py-2.5 text-sm" />
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="w-4 h-4 accent-navy-900" />
                Pin to top
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline text-xs flex-1">Cancel</button>
                <button type="submit" disabled={saving || !title.trim()} className="btn-primary text-xs flex-1 disabled:opacity-50">
                  {saving ? "Posting…" : "Create Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}