"use client";

import { useEffect, useState, useCallback } from "react";
import { GraduationCap, Plus, Trash2, X, BookOpen, Users } from "lucide-react";

interface Result {
  id: string;
  studentId: string;
  studentName: string | null;
  courseName: string | null;
  term: string;
  examScore: number | null;
  assignmentScore: number | null;
  total: number | null;
  grade: string | null;
  remarks: string | null;
  published: number;
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

export default function ResultsManagerPage() {
  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<Result[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [term, setTerm] = useState("");
  const [examScore, setExamScore] = useState("");
  const [assignmentScore, setAssignmentScore] = useState("");
  const [remarks, setRemarks] = useState("");
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem("judmi_user") || "null")); } catch {}
  }, []);

  const fetchAll = useCallback(async () => {
    const [rRes, sRes, cRes] = await Promise.all([
      fetch("/api/org/results"),
      fetch("/api/org/students"),
      fetch("/api/org/timetable/courses"),
    ]);
    const rData = await rRes.json();
    const sData = await sRes.json();
    const cData = await cRes.json();
    setItems(rData.results || []);
    setStudents(sData.students || []);
    setCourses(cData.courses || []);
  }, []);

  useEffect(() => {
    if (!user?.orgId) { setLoading(false); return; }
    fetchAll().finally(() => setLoading(false));
  }, [user?.orgId, fetchAll]);

  const isAdmin = user?.role === "admin" || user?.role === "org_admin";

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !term.trim()) return;
    setSaving(true);
    try {
      const student = students.find((s) => s.id === studentId);
      const course = courses.find((c) => c.id === courseId);
      await fetch("/api/org/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          studentName: student?.name || student?.email || null,
          courseId: courseId || null,
          courseName: course?.name || null,
          term,
          examScore,
          assignmentScore,
          remarks,
          published,
        }),
      });
      await fetchAll();
      setShowModal(false);
      setStudentId(""); setCourseId(""); setTerm(""); setExamScore(""); setAssignmentScore(""); setRemarks(""); setPublished(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this result record?")) return;
    await fetch("/api/org/results", {
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
          <GraduationCap className="w-6 h-6" />
        </div>
        <p className="text-sm text-slate-500 font-semibold">Loading results…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <span className="inline-block text-[12px] sm:text-sm font-bold uppercase tracking-[0.22em] text-amber-600">Staff Portal</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-navy-700" /> Results & Transcripts
          </h1>
        </div>
        <button type="button" onClick={() => setShowModal(true)} className="btn-primary text-xs px-3 py-2.5 rounded-xl flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add Result
        </button>
      </div>

      {students.length === 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-800 font-semibold">
          No students found. Students will appear here once they link their school account.
        </div>
      )}

      {items.length === 0 ? (
        <div className="surface-elevated rounded-2xl p-8 text-center space-y-3">
          <GraduationCap className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-500">No results yet</p>
          <p className="text-xs text-slate-400">Add exam & assignment scores to build student transcripts. Automatically computes totals and letter grades (60% exam + 40% assignment).</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <div key={r.id} className={`surface-elevated rounded-2xl px-4 py-3.5 flex items-center gap-3 animate-slide-up ${!r.published ? "opacity-70" : ""}`}>
              <span className="w-9 h-9 rounded-full bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center text-xs font-extrabold shrink-0">
                {(r.studentName || "?").charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-900">{r.studentName || "Unknown"}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{r.term}</span>
                </div>
                <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-2 mt-0.5">
                  <BookOpen className="w-3 h-3" /> {r.courseName || "General"}
                  {!r.published && <span className="text-amber-600">· Draft</span>}
                </div>
              </div>
              <div className="hidden sm:flex gap-3 text-xs text-slate-500 font-semibold shrink-0">
                <span>Exam <span className="text-slate-800">{r.examScore ?? "—"}</span></span>
                <span>Ass <span className="text-slate-800">{r.assignmentScore ?? "—"}</span></span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {r.grade && <span className={`px-2 py-0.5 rounded-lg text-xs font-extrabold ${gradeColor(r.grade)}`}>{r.grade}</span>}
                <div className="hidden bg-navy-900 text-amber-500 sm:flex w-9 h-9 rounded-xl items-center justify-center text-sm font-extrabold">{r.total ?? "—"}</div>
                {isAdmin && (
                  <button type="button" onClick={() => handleDelete(r.id)} className="text-slate-300 hover:text-rose-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
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
                <GraduationCap className="w-5 h-5 text-navy-700" /> Add Result
              </h2>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-rose-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Student <span className="text-rose-500">*</span></label>
                <select required value={studentId} onChange={(e) => setStudentId(e.target.value)} className="input-field py-2.5 text-sm">
                  <option value="">Select student…</option>
                  {students.map((s) => <option key={s.id} value={s.id}>{s.name || s.email} {s.year ? `· ${s.year}` : ""}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Term <span className="text-rose-500">*</span></label>
                  <input type="text" required value={term} onChange={(e) => setTerm(e.target.value)} placeholder="e.g. Term 1" className="input-field py-2.5 text-sm" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Course</label>
                  <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="input-field py-2.5 text-sm">
                    <option value="">General</option>
                    {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Exam Score (0-100)</label>
                  <input type="number" min={0} max={100} value={examScore} onChange={(e) => setExamScore(e.target.value)} className="input-field py-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assignment Score (0-100)</label>
                  <input type="number" min={0} max={100} value={assignmentScore} onChange={(e) => setAssignmentScore(e.target.value)} className="input-field py-2.5 text-sm" />
                </div>
              </div>
              <div className="text-[11px] text-slate-400 font-semibold">Total = 60% exam + 40% assignment (if both given). Letter grade auto-computed.</div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Remarks (optional)</label>
                <input type="text" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g. Good performance" className="input-field py-2.5 text-sm" />
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="w-4 h-4 accent-navy-900" />
                Publish to student (draft results are hidden from students)
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline text-xs flex-1">Cancel</button>
                <button type="submit" disabled={saving || !studentId || !term.trim()} className="btn-primary text-xs flex-1 disabled:opacity-50">
                  {saving ? "Saving…" : "Save Result"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}