"use client";

import { useEffect, useState, useCallback } from "react";
import { ClipboardCheck, CheckCircle2, XCircle, Clock, Ban, Save, ChevronDown } from "lucide-react";

interface Course { id: string; name: string; code: string | null; year: string | null; departmentId: string | null }
interface Student { id: string; name: string; email: string; departmentId: string | null; year: string | null }
interface ExistingRecord { studentId: string; status: string }

const STATUS_OPTIONS = [
  { value: "present", label: "Present", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
  { value: "absent", label: "Absent", icon: XCircle, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200" },
  { value: "late", label: "Late", icon: Clock, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  { value: "excused", label: "Excused", icon: Ban, color: "text-slate-500", bg: "bg-slate-50", border: "border-slate-200" },
];

export default function AttendanceMarkPage() {
  const [user, setUser] = useState<any>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem("judmi_user") || "null")); } catch {}
  }, []);

  const fetchCourses = useCallback(async () => {
    const res = await fetch("/api/org/timetable/courses");
    const data = await res.json();
    setCourses(data.courses || []);
  }, []);

  useEffect(() => {
    if (!user?.orgId) { setLoading(false); return; }
    fetchCourses().finally(() => setLoading(false));
  }, [user?.orgId, fetchCourses]);

  // Fetch students for the selected course's department+year.
  useEffect(() => {
    if (!selectedCourse) { setStudents([]); return; }
    const course = courses.find((c) => c.id === selectedCourse);
    if (!course) return;
    const params = new URLSearchParams();
    if (course.departmentId) params.set("departmentId", course.departmentId);
    if (course.year) params.set("year", course.year);
    fetch(`/api/org/students?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setStudents(data.students || []);
      })
      .catch(() => {});
  }, [selectedCourse, courses]);

  // Load existing attendance for this course+date.
  useEffect(() => {
    if (!selectedCourse || !selectedDate) return;
    fetch(`/api/org/attendance?courseId=${selectedCourse}&date=${selectedDate}`)
      .then((r) => r.json())
      .then((data) => {
        const existing: Record<string, string> = {};
        for (const rec of data.records || []) existing[rec.studentId] = rec.status;
        // Default all students to "present" if no prior record, then overlay existing.
        const defaults: Record<string, string> = {};
        for (const s of students) defaults[s.id] = "present";
        setMarks({ ...defaults, ...existing });
      })
      .catch(() => {});
  }, [selectedCourse, selectedDate, students]);

  const setMark = (studentId: string, status: string) => setMarks((prev) => ({ ...prev, [studentId]: status }));

  const handleSave = async () => {
    if (!selectedCourse || !selectedDate) return;
    setSaving(true);
    try {
      await fetch("/api/org/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourse,
          date: selectedDate,
          records: students.map((s) => ({ studentId: s.id, status: marks[s.id] || "present" })),
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5 animate-fade-in">
      <div>
        <span className="inline-block text-[12px] sm:text-sm font-bold uppercase tracking-[0.22em] text-amber-600">Staff Portal</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2">
          <ClipboardCheck className="w-7 h-7 text-navy-700" /> Mark Attendance
        </h1>
      </div>

      {/* Controls */}
      <div className="surface-elevated rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Course <span className="text-rose-500">*</span></label>
            <select value={selectedCourse} onChange={(e) => { setSelectedCourse(e.target.value); setSaved(false); }} className="input-field py-2.5 text-sm">
              <option value="">Select a course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.code ? `${c.code} — ` : ""}{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Date <span className="text-rose-500">*</span></label>
            <input type="date" value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); setSaved(false); }} className="input-field py-2.5 text-sm" />
          </div>
        </div>
      </div>

      {/* Student list */}
      {selectedCourse && students.length === 0 && (
        <div className="surface rounded-2xl p-6 text-center text-sm text-slate-400">No students found for this course.</div>
      )}

      {students.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">{students.length} student{students.length > 1 ? "s" : ""}</p>
            <button type="button" onClick={handleSave} disabled={saving} className="btn-primary text-xs px-4 py-2 rounded-xl flex items-center gap-1.5">
              <Save className="w-4 h-4" /> {saving ? "Saving…" : saved ? "Saved!" : "Save Attendance"}
            </button>
          </div>

          <div className="surface-elevated rounded-2xl overflow-hidden divide-y divide-slate-100">
            {students.map((s) => (
              <div key={s.id} className="px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-navy-100 text-navy-800 flex items-center justify-center text-xs font-bold shrink-0">
                  {s.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-900 truncate">{s.name}</div>
                  <div className="text-[11px] text-slate-400 truncate">{s.email}</div>
                </div>
                <div className="flex gap-1.5">
                  {STATUS_OPTIONS.map((opt) => {
                    const active = (marks[s.id] || "present") === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setMark(s.id, opt.value)}
                        title={opt.label}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border transition-all ${active ? `${opt.bg} ${opt.border} ${opt.color}` : "border-slate-200 text-slate-300 hover:border-slate-300"}`}
                      >
                        <opt.icon className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
