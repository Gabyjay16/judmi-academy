"use client";

import { useEffect, useState, useCallback } from "react";
import { BookOpen, CheckCircle2, Layers, Plus, Trash2, ClipboardList, GraduationCap } from "lucide-react";

interface Course { id: string; name: string; code: string | null; year: string | null; }
interface Enrolled { id: string; courseId: string; courseName: string | null; year: string | null; }

export default function StudentRegistrationPage() {
  const [user, setUser] = useState<any>(null);
  const [student, setStudent] = useState<any>(null);
  const [pack, setPack] = useState<Course[]>([]);
  const [extras, setExtras] = useState<Course[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
  const [enrolled, setEnrolled] = useState<Enrolled[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem("judmi_user") || "null")); } catch {}
  }, []);

  const fetchAll = useCallback(async () => {
    const res = await fetch("/api/student/registration");
    const d = await res.json();
    setStudent(d.student || null);
    setPack(d.pack || []);
    setExtras(d.extras || []);
    setEnrolledIds(d.enrolledIds || []);
    setEnrolled(d.enrolled || []);
  }, []);

  useEffect(() => {
    if (!user?.orgId) { setLoading(false); return; }
    fetchAll().finally(() => setLoading(false));
  }, [user?.orgId, fetchAll]);

  const registerPack = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/student/registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "registerPack" }),
      });
      const d = await res.json();
      if (!res.ok) alert(d.error || "Failed to register");
      else { alert(`Registered ${d.added} new course${d.added === 1 ? "" : "s"}.`); await fetchAll(); }
    } finally { setBusy(false); }
  };

  const addCourse = async (courseId: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/student/registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", courseId }),
      });
      const d = await res.json();
      if (!res.ok) alert(d.error || "Failed to register");
      await fetchAll();
    } finally { setBusy(false); }
  };

  const dropCourse = async (courseId: string) => {
    if (!confirm("Drop this course from your registration?")) return;
    setBusy(true);
    try {
      await fetch("/api/student/registration", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      await fetchAll();
    } finally { setBusy(false); }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-5 py-16 flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center animate-pulse">
          <GraduationCap className="w-6 h-6" />
        </div>
        <p className="text-sm text-slate-500 font-semibold">Loading course registration…</p>
      </div>
    );
  }

  if (!student?.departmentId || !student?.year) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-16 text-center space-y-4 animate-fade-in">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
          <ClipboardList className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900">Course Registration</h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Your department and year haven&apos;t been set yet. Contact your school administrator to assign your department and level so you can register your courses.
        </p>
      </div>
    );
  }

  const packEnrolledCount = pack.filter((c) => enrolledIds.includes(c.id)).length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <span className="inline-block text-[12px] sm:text-sm font-bold uppercase tracking-[0.22em] text-amber-600">Course Registration</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2">
            <Layers className="w-7 h-7 text-navy-700" /> Register Courses
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {student.departmentName} · {student.year}
          </p>
        </div>
        <div className="surface-elevated rounded-2xl px-4 py-3 text-center">
          <div className="text-2xl font-extrabold text-navy-700">{enrolled.length}</div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Registered</div>
        </div>
      </div>

      {/* Department pack */}
      <section className="surface-elevated rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Your {student.year} pack
            <span className="text-[11px] font-bold text-navy-700 bg-navy-50 border border-navy-100 px-2 py-0.5 rounded-lg">
              {packEnrolledCount}/{pack.length} registered
            </span>
          </h2>
          <button
            type="button"
            onClick={registerPack}
            disabled={busy || packEnrolledCount === pack.length}
            className="btn-primary text-xs py-2 px-3 rounded-xl flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> {packEnrolledCount === pack.length ? "All registered" : "Register full pack"}
          </button>
        </div>

        {pack.length === 0 ? (
          <div className="text-sm text-slate-500 py-8 text-center border border-dashed border-slate-200 rounded-xl">
            No courses defined yet for {student.departmentName} · {student.year}. Contact your administrator to set up your course pack.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {pack.map((c) => {
              const enrolledFlag = enrolledIds.includes(c.id);
              return (
                <li key={c.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${enrolledFlag ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-navy-50 text-navy-700 border-navy-100"}`}>
                      {enrolledFlag ? <CheckCircle2 className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 truncate">{c.name}</div>
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{c.code || "—"}</div>
                    </div>
                  </div>
                  {!enrolledFlag && (
                    <button type="button" onClick={() => addCourse(c.id)} disabled={busy} className="btn-outline text-xs py-1.5 px-3 rounded-xl flex items-center gap-1.5 shrink-0">
                      <Plus className="w-3.5 h-3.5" /> Register
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Extra / elective courses */}
      <section className="surface-elevated rounded-2xl p-5">
        <h2 className="text-sm font-extrabold text-slate-900 mb-1 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Other courses you can register
        </h2>
        <p className="text-[11px] text-slate-400 mb-4">Electives and courses outside your department/year pack.</p>
        <ul className="divide-y divide-slate-100">
          {extras.map((c) => {
            const enrolledFlag = enrolledIds.includes(c.id);
            return (
              <li key={c.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">{c.name}</div>
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{c.code || "—"}{c.year ? ` · ${c.year}` : ""}</div>
                  </div>
                </div>
                {enrolledFlag ? (
                  <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 shrink-0"><CheckCircle2 className="w-3.5 h-3.5" /> Registered</span>
                ) : (
                  <button type="button" onClick={() => addCourse(c.id)} disabled={busy} className="btn-outline text-xs py-1.5 px-3 rounded-xl flex items-center gap-1.5 shrink-0">
                    <Plus className="w-3.5 h-3.5" /> Register
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Currently registered */}
      <section className="surface-elevated rounded-2xl p-5">
        <h2 className="text-sm font-extrabold text-slate-900 mb-4 flex items-center gap-2">
          <ClipboardList className="w-4 h-4" /> My registered courses
        </h2>
        {enrolled.length === 0 ? (
          <div className="text-sm text-slate-500 py-6 text-center border border-dashed border-slate-200 rounded-xl">
            You haven&apos;t registered any courses yet.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {enrolled.map((e) => (
              <li key={e.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">{e.courseName || "Course"}</div>
                    {e.year && <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{e.year}</div>}
                  </div>
                </div>
                <button type="button" onClick={() => dropCourse(e.courseId)} disabled={busy} className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0" title="Drop course">
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
