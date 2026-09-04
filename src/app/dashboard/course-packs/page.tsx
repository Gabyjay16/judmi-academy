"use client";

import { useEffect, useState, useCallback } from "react";
import { BookOpen, Plus, Trash2, Layers, GraduationCap } from "lucide-react";

interface Department { id: string; name: string; code: string | null; }
interface Course { id: string; name: string; code: string | null; departmentId: string | null; year: string | null; }

const YEARS = ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7"];

export default function CoursePacksPage() {
  const [user, setUser] = useState<any>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deptId, setDeptId] = useState("");
  const [year, setYear] = useState("Year 1");
  const [cName, setCName] = useState("");
  const [cCode, setCCode] = useState("");

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem("judmi_user") || "null")); } catch {}
  }, []);

  const isAdmin = user?.role === "admin" || user?.role === "org_admin" || user?.role === "teacher";

  const fetchAll = useCallback(async () => {
    const res = await fetch("/api/org/course-packs");
    const d = await res.json();
    setDepartments(d.departments || []);
    setCourses(d.courses || []);
    if ((!deptId || deptId === "") && (d.departments || []).length > 0) {
      setDeptId(d.departments[0].id);
    }
  }, [deptId]);

  useEffect(() => {
    if (!user?.orgId) { setLoading(false); return; }
    fetchAll().finally(() => setLoading(false));
  }, [user?.orgId, fetchAll]);

  const packCourses = courses.filter((c) => c.departmentId === deptId && c.year === year);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptId) { alert("Select a department first."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/org/course-packs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cName, code: cCode, departmentId: deptId, year }),
      });
      const d = await res.json();
      if (!res.ok) alert(d.error || "Failed to add course");
      else { setCName(""); setCCode(""); await fetchAll(); }
    } finally { setSaving(false); }
  };

  const handleRemove = async (id: string) => {
    if (!confirm("Remove this course from the pack? This will also remove it from any student enrollments it is linked to.")) return;
    await fetch("/api/org/course-packs", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await fetchAll();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="inline-block text-[12px] sm:text-sm font-bold uppercase tracking-[0.22em] text-amber-600">Academic Setup</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2">
            <Layers className="w-7 h-7 text-navy-700" /> Course Packs
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Define each department&apos;s courses for Year 1–7. Students automatically get their department&apos;s pack when they register.
          </p>
        </div>
      </div>

      {!isAdmin && (
        <div className="surface-elevated rounded-2xl p-6 text-sm text-slate-600">
          Only administrators can manage course packs. Contact your administrator.
        </div>
      )}

      {isAdmin && loading && (
        <div className="text-sm text-slate-500">Loading course packs…</div>
      )}

      {isAdmin && !loading && (
        <>
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            {/* Pack definition form */}
            <div className="surface-elevated rounded-2xl p-5 h-fit">
              <h2 className="text-sm font-extrabold text-slate-900 mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add course to pack
              </h2>
              <form onSubmit={handleAdd} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Department</label>
                  <select value={deptId} onChange={(e) => setDeptId(e.target.value)} className="input-field">
                    <option value="">Select department…</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}{d.code ? ` (${d.code})` : ""}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Year</label>
                  <select value={year} onChange={(e) => setYear(e.target.value)} className="input-field">
                    {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Course Name</label>
                  <input value={cName} onChange={(e) => setCName(e.target.value)} className="input-field" placeholder="e.g. Computer Programming" required />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Course Code</label>
                  <input value={cCode} onChange={(e) => setCCode(e.target.value)} className="input-field" placeholder="e.g. CSC 111" />
                </div>
                <button type="submit" disabled={saving} className="btn-primary w-full text-sm py-2.5 rounded-xl flex items-center justify-center gap-1.5">
                  <Plus className="w-4 h-4" /> {saving ? "Adding…" : "Add to pack"}
                </button>
              </form>
            </div>

            {/* Current pack for selected dept + year */}
            <div className="surface-elevated rounded-2xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  {packCourses.length} course{packCourses.length === 1 ? "" : "s"} in this pack
                </h2>
                <span className="text-xs font-bold text-navy-700 bg-navy-50 border border-navy-100 px-2.5 py-1 rounded-lg">
                  {departments.find((d) => d.id === deptId)?.name || "Select a department"} · {year}
                </span>
              </div>

              {packCourses.length === 0 ? (
                <div className="text-sm text-slate-500 py-8 text-center border border-dashed border-slate-200 rounded-xl">
                  No courses yet for {year}. Use the form to add courses to this department&apos;s pack.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {packCourses.map((c) => (
                    <li key={c.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center shrink-0">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-900 truncate">{c.name}</div>
                          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{c.code || "—"}</div>
                        </div>
                      </div>
                      <button type="button" onClick={() => handleRemove(c.id)} className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50" title="Remove">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Pack matrix summary */}
          <div className="surface-elevated rounded-2xl p-5">
            <h2 className="text-sm font-extrabold text-slate-900 mb-4 flex items-center gap-2">
              <GraduationCap className="w-4 h-4" /> Pack summary by department
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wide border-b border-slate-100">
                    <th className="py-2 pr-3">Department</th>
                    {YEARS.map((y) => (
                      <th key={y} className="py-2 px-2 text-center">{y.replace("Year ", "")}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {departments.map((d) => (
                    <tr key={d.id} className="border-b border-slate-50">
                      <td className="py-2 pr-3 font-bold text-slate-800">{d.name}</td>
                      {YEARS.map((y) => {
                        const count = courses.filter((c) => c.departmentId === d.id && c.year === y).length;
                        return (
                          <td key={y} className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => { setDeptId(d.id); setYear(y); }}
                              className={`inline-block min-w-[2rem] px-2 py-1 rounded-lg text-xs font-extrabold ${
                                count > 0 ? "bg-navy-50 text-navy-700 border border-navy-100" : "bg-slate-50 text-slate-300 border border-slate-100"
                              }`}
                            >
                              {count}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-400 mt-3">Click a number to jump to that department &amp; year pack.</p>
          </div>
        </>
      )}
    </div>
  );
}
