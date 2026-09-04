"use client";

import { useEffect, useState, useCallback } from "react";
import { Building2, BookOpen, Plus, Trash2, X, Users, Pencil } from "lucide-react";

interface Department {
  id: string;
  name: string;
  code: string | null;
  headId: string | null;
  description: string | null;
}

interface Program {
  id: string;
  name: string;
  code: string | null;
  departmentId: string | null;
  description: string | null;
  duration: string | null;
  headId: string | null;
}

export default function ProgramsManagerPage() {
  const [user, setUser] = useState<any>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Department modal
  const [deptModal, setDeptModal] = useState(false);
  const [deptName, setDeptName] = useState("");
  const [deptCode, setDeptCode] = useState("");
  const [deptDesc, setDeptDesc] = useState("");
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  // Program modal
  const [progModal, setProgModal] = useState(false);
  const [progName, setProgName] = useState("");
  const [progCode, setProgCode] = useState("");
  const [progDeptId, setProgDeptId] = useState("");
  const [progDuration, setProgDuration] = useState("");
  const [progDesc, setProgDesc] = useState("");

  const [headDrafts, setHeadDrafts] = useState<Record<string, string>>({});
  const [savingHead, setSavingHead] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem("judmi_user") || "null")); } catch {}
  }, []);

  const fetchAll = useCallback(async () => {
    const [dRes, pRes, oRes] = await Promise.all([
      fetch("/api/org/departments"),
      fetch("/api/org/programs"),
      fetch("/api/org"),
    ]);
    const dData = await dRes.json();
    const pData = await pRes.json();
    const oData = await oRes.json();
    setDepartments(dData.departments || []);
    setPrograms(pData.programs || []);
    const org = oData.organization || {};
    setTeachers(org.teachers || []);
  }, []);

  useEffect(() => {
    if (!user?.orgId) { setLoading(false); return; }
    fetchAll().finally(() => setLoading(false));
  }, [user?.orgId, fetchAll]);

  const isAdmin = user?.role === "admin" || user?.role === "org_admin";

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim()) return;
    await fetch("/api/org/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: deptName, code: deptCode }),
    });
    await fetchAll();
    setDeptModal(false);
    setDeptName(""); setDeptCode(""); setDeptDesc("");
  };

  const handleUpdateDeptHead = async (deptId: string) => {
    setSavingHead((p) => ({ ...p, [deptId]: true }));
    try {
      await fetch(`/api/org/departments?id=${deptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headId: headDrafts[deptId] || null }),
      });
      await fetchAll();
    } finally {
      setSavingHead((p) => ({ ...p, [deptId]: false }));
    }
  };

  const handleDeleteDept = async (id: string) => {
    if (!confirm("Delete this department? Its linked courses and programs will keep but lose the department link.")) return;
    await fetch(`/api/org/departments?id=${id}`, { method: "DELETE" });
    await fetchAll();
  };

  const handleCreateProg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progName.trim()) return;
    await fetch("/api/org/programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: progName, code: progCode, departmentId: progDeptId || null, duration: progDuration || null, description: progDesc || null }),
    });
    await fetchAll();
    setProgModal(false);
    setProgName(""); setProgCode(""); setProgDeptId(""); setProgDuration(""); setProgDesc("");
  };

  const handleDeleteProg = async (id: string) => {
    if (!confirm("Delete this program?")) return;
    await fetch(`/api/org/programs?id=${id}`, { method: "DELETE" });
    await fetchAll();
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-5 py-16 flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center animate-pulse">
          <Building2 className="w-6 h-6" />
        </div>
        <p className="text-sm text-slate-500 font-semibold">Loading school structure…</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-8 animate-fade-in">
      <div>
        <span className="inline-block text-[12px] sm:text-sm font-bold uppercase tracking-[0.22em] text-amber-600">Staff Portal</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2">
          <Building2 className="w-7 h-7 text-navy-700" /> Departments & Programs
        </h1>
      </div>

      {/* Departments */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-navy-700" /> Departments
          </h2>
          {isAdmin && (
            <button type="button" onClick={() => { setEditingDept(null); setDeptModal(true); }} className="btn-primary text-xs px-3 py-2 rounded-xl flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> New Department
            </button>
          )}
        </div>

        {departments.length === 0 ? (
          <div className="surface-elevated rounded-2xl p-8 text-center space-y-2">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-500">No departments yet</p>
            <p className="text-xs text-slate-400">Create departments to organize your school and assign heads of department.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {departments.map((d) => (
              <div key={d.id} className="surface-elevated rounded-2xl p-4 animate-slide-up">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-900">{d.name}</div>
                    {d.code && <div className="text-[10px] font-bold text-navy-600 uppercase mt-0.5">{d.code}</div>}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1.5">
                      {editingDept?.id === d.id ? (
                        <button type="button" onClick={() => setEditingDept(null)} className="text-slate-400 hover:text-slate-600 text-xs font-bold">Close</button>
                      ) : (
                        <button type="button" onClick={() => { setEditingDept(d); setDeptName(d.name); setDeptCode(d.code || ""); setDeptDesc(d.description || ""); setDeptModal(true); }} className="text-slate-400 hover:text-navy-700"><Pencil className="w-4 h-4" /></button>
                      )}
                      <button type="button" onClick={() => handleDeleteDept(d.id)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
                {d.description && <p className="mt-2 text-xs text-slate-500">{d.description}</p>}
                {isAdmin && (
                  <div className="mt-3 flex gap-2 items-center">
                    <select
                      value={headDrafts[d.id] ?? d.headId ?? ""}
                      onChange={(e) => setHeadDrafts((p) => ({ ...p, [d.id]: e.target.value }))}
                      className="input-field py-1.5 text-xs flex-1"
                    >
                      <option value="">— No head assigned —</option>
                      {teachers.map((t) => <option key={t.id} value={t.id}>{t.name || t.email}</option>)}
                    </select>
                    <button
                      type="button"
                      disabled={savingHead[d.id]}
                      onClick={() => handleUpdateDeptHead(d.id)}
                      className="btn-primary text-[10px] px-2.5 py-1.5 rounded-lg disabled:opacity-50 shrink-0"
                    >
                      {savingHead[d.id] ? "…" : "Set Head"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Programs */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-navy-700" /> Programs
          </h2>
          {isAdmin && (
            <button type="button" onClick={() => setProgModal(true)} className="btn-primary text-xs px-3 py-2 rounded-xl flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> New Program
            </button>
          )}
        </div>

        {programs.length === 0 ? (
          <div className="surface-elevated rounded-2xl p-8 text-center space-y-2">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-500">No programs yet</p>
            <p className="text-xs text-slate-400">Programs define the qualifications your school offers (e.g. BSc Computer Science).</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {programs.map((p) => {
              const dept = departments.find((d) => d.id === p.departmentId);
              return (
                <div key={p.id} className="surface-elevated rounded-2xl p-4 animate-slide-up">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900">{p.name}</div>
                      {p.code && <div className="text-[10px] font-bold text-navy-600 uppercase mt-0.5">{p.code}</div>}
                    </div>
                    {isAdmin && (
                      <button type="button" onClick={() => handleDeleteProg(p.id)} className="text-slate-300 hover:text-rose-500 shrink-0"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                  {p.description && <p className="mt-2 text-xs text-slate-500 line-clamp-2">{p.description}</p>}
                  <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400 font-semibold">
                    {dept && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {dept.name}</span>}
                    {p.duration && <span>⏱ {p.duration}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Department Modal */}
      {deptModal && (
        <div className="modal-overlay" onClick={() => setDeptModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900">{editingDept ? "Edit Department" : "New Department"}</h2>
              <button type="button" onClick={() => setDeptModal(false)} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (editingDept) {
                await fetch(`/api/org/departments?id=${editingDept.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name: deptName, code: deptCode, description: deptDesc }),
                });
              } else {
                await handleCreateDept(e);
              }
              await fetchAll();
              setDeptModal(false);
            }} className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Department Name <span className="text-rose-500">*</span></label>
                <input type="text" required value={deptName} onChange={(e) => setDeptName(e.target.value)} placeholder="e.g. Computer Science" className="input-field py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Code</label>
                <input type="text" value={deptCode} onChange={(e) => setDeptCode(e.target.value)} placeholder="e.g. CSC" className="input-field py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea value={deptDesc} onChange={(e) => setDeptDesc(e.target.value)} rows={2} className="input-field py-2.5 text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setDeptModal(false)} className="btn-outline text-xs flex-1">Cancel</button>
                <button type="submit" disabled={!deptName.trim()} className="btn-primary text-xs flex-1 disabled:opacity-50">
                  {editingDept ? "Save Changes" : "Create Department"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Program Modal */}
      {progModal && (
        <div className="modal-overlay" onClick={() => setProgModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900">New Program</h2>
              <button type="button" onClick={() => setProgModal(false)} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateProg} className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Program Name <span className="text-rose-500">*</span></label>
                <input type="text" required value={progName} onChange={(e) => setProgName(e.target.value)} placeholder="e.g. BSc Computer Science" className="input-field py-2.5 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Code</label>
                  <input type="text" value={progCode} onChange={(e) => setProgCode(e.target.value)} placeholder="e.g. BSC-CSC" className="input-field py-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                  <select value={progDeptId} onChange={(e) => setProgDeptId(e.target.value)} className="input-field py-2.5 text-sm">
                    <option value="">None</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Duration</label>
                <input type="text" value={progDuration} onChange={(e) => setProgDuration(e.target.value)} placeholder="e.g. 4 years" className="input-field py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea value={progDesc} onChange={(e) => setProgDesc(e.target.value)} rows={2} className="input-field py-2.5 text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setProgModal(false)} className="btn-outline text-xs flex-1">Cancel</button>
                <button type="submit" disabled={!progName.trim()} className="btn-primary text-xs flex-1 disabled:opacity-50">Create Program</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}