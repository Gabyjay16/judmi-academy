"use client";

import { useEffect, useState, useCallback } from "react";
import { Users2, Plus, Trash2, X, BookOpen, ClipboardList } from "lucide-react";

interface Enrollment { id: string; studentId: string; courseId: string; courseName: string | null; year: string | null; enrolledAt: string; }
interface Course { id: string; name: string; code: string | null; teacherId: string | null; year: string | null; }
interface Student { id: string; name: string; email: string; studentId: string | null; year: string | null; }

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

export default function EnrollmentsPage() {
  const [user, setUser] = useState<any>(null);
  const [rows, setRows] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selStudent, setSelStudent] = useState("");
  const [selCourse, setSelCourse] = useState("");
  const [filterStudent, setFilterStudent] = useState("");

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem("judmi_user") || "null")); } catch {}
  }, []);

  const fetchAll = useCallback(async () => {
    const q = filterStudent ? `?studentId=${filterStudent}` : "";
    const res = await fetch("/api/org/enrollments" + q);
    const d = await res.json();
    setRows(d.enrollments || []);
    if (d.courses) setCourses(d.courses);
    if (d.students) setStudents(d.students);
  }, [filterStudent]);

  useEffect(() => {
    if (!user?.orgId) { setLoading(false); return; }
    fetchAll().finally(() => setLoading(false));
  }, [user?.orgId, fetchAll]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/org/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: selStudent, courseId: selCourse }),
      });
      setModal(false);
      setSelStudent(""); setSelCourse("");
      await fetchAll();
    } finally { setSaving(false); }
  };

  const handleRemove = async (id: string) => {
    if (!confirm("Remove this enrollment?")) return;
    await fetch("/api/org/enrollments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await fetchAll();
  };

  const studentLookup = (id: string) => students.find((s) => s.id === id);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center animate-pulse mx-auto">
          <Users2 className="w-6 h-6" />
        </div>
        <p className="text-sm text-slate-500 font-semibold mt-3">Loading enrollments…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <span className="inline-block text-[12px] sm:text-sm font-bold uppercase tracking-[0.22em] text-amber-600">Staff Portal</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2">
            <Users2 className="w-7 h-7 text-navy-700" /> Enrollment Management
          </h1>
        </div>
        <button type="button" onClick={() => setModal(true)} className="btn-primary text-xs px-3 py-2.5 rounded-xl flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Enroll Student
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="surface-elevated rounded-2xl p-5">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Total Enrollments</div>
          <div className="text-xl font-extrabold text-navy-700 mt-1">{rows.length}</div>
        </div>
        <div className="surface-elevated rounded-2xl p-5">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Students</div>
          <div className="text-xl font-extrabold text-navy-700 mt-1">{students.length}</div>
        </div>
        <div className="surface-elevated rounded-2xl p-5">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Courses</div>
          <div className="text-xl font-extrabold text-navy-700 mt-1">{courses.length}</div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">Filter by student</label>
        <select value={filterStudent} onChange={(e) => setFilterStudent(e.target.value)} className="input-field py-2.5 text-sm max-w-md">
          <option value="">All students</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {rows.length === 0 ? (
        <div className="surface-elevated rounded-2xl p-8 text-center space-y-2">
          <ClipboardList className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-500">No enrollments yet</p>
          <p className="text-xs text-slate-400">Enroll students into courses so they appear in their portal.</p>
        </div>
      ) : (
        <div className="surface-elevated rounded-2xl overflow-hidden">
          {rows.map((r) => {
            const st = studentLookup(r.studentId);
            return (
              <div key={r.id} className="px-4 py-3 border-b border-slate-50 flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-navy-50 text-navy-700 flex items-center justify-center shrink-0"><BookOpen className="w-4 h-4" /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-900">{st?.name || "Student"}{st?.studentId ? ` (${st.studentId})` : ""}</div>
                  <div className="text-[11px] text-slate-400 font-semibold">{r.courseName || r.courseId}{r.year ? ` · ${r.year}` : ""} · enrolled {fmt(r.enrolledAt)}</div>
                </div>
                <button type="button" onClick={() => handleRemove(r.id)} className="text-slate-300 hover:text-rose-500 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2"><Users2 className="w-5 h-5 text-navy-700" /> Enroll Student</h2>
              <button type="button" onClick={() => setModal(false)} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAdd} className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Student <span className="text-rose-500">*</span></label>
                <select required value={selStudent} onChange={(e) => setSelStudent(e.target.value)} className="input-field py-2.5 text-sm">
                  <option value="">Select student…</option>
                  {students.map((s) => <option key={s.id} value={s.id}>{s.name} {s.studentId ? `(${s.studentId})` : ""}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Course <span className="text-rose-500">*</span></label>
                <select required value={selCourse} onChange={(e) => setSelCourse(e.target.value)} className="input-field py-2.5 text-sm">
                  <option value="">Select course…</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.name}{c.code ? ` (${c.code})` : ""}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="btn-outline text-xs flex-1">Cancel</button>
                <button type="submit" disabled={saving || !selStudent || !selCourse} className="btn-primary text-xs flex-1">{saving ? "Enrolling…" : "Enroll"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
