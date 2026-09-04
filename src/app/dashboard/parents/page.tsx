"use client";

import { useEffect, useState, useCallback } from "react";
import { HeartHandshake, Plus, Trash2, X, KeyRound, Unlink, Users } from "lucide-react";

interface ParentRow { id: string; name: string; email: string; createdAt: string; children: { id: string; name: string; relationship: string }[]; }
interface Student { id: string; name: string; studentId: string; }

export default function ParentsPage() {
  const [user, setUser] = useState<any>(null);
  const [parents, setParents] = useState<ParentRow[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"create" | "link" | null>(null);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ name: string; email: string; password: string; generated: boolean } | null>(null);

  // create form
  const [pName, setPName] = useState("");
  const [pEmail, setPEmail] = useState("");
  const [pPassword, setPPassword] = useState("");
  const [pStudentId, setPStudentId] = useState("");
  const [pRel, setPRel] = useState("guardian");

  // link form
  const [linkParentId, setLinkParentId] = useState("");
  const [linkStudentId, setLinkStudentId] = useState("");
  const [linkRel, setLinkRel] = useState("guardian");

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem("judmi_user") || "null")); } catch {}
  }, []);

  const isAdmin = user?.role === "admin" || user?.role === "org_admin";

  const fetchAll = useCallback(async () => {
    const res = await fetch("/api/org/parents");
    const d = await res.json();
    setParents(d.parents || []);
    setStudents(d.students || []);
  }, []);

  useEffect(() => {
    if (!user?.orgId) { setLoading(false); return; }
    fetchAll().finally(() => setLoading(false));
  }, [user?.orgId, fetchAll]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setCreated(null);
    try {
      const res = await fetch("/api/org/parents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", name: pName, email: pEmail, password: pPassword, studentId: pStudentId || undefined, relationship: pRel }),
      });
      const d = await res.json();
      if (!res.ok) { alert(d.error || "Failed to create parent"); }
      else {
        setCreated({ name: pName, email: pEmail.trim().toLowerCase(), password: d.generatedPassword, generated: d.generated });
        setPName(""); setPEmail(""); setPPassword(""); setPStudentId(""); setPRel("guardian");
        await fetchAll();
      }
    } finally { setSaving(false); }
  };

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/org/parents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "link", parentId: linkParentId, studentId: linkStudentId, relationship: linkRel }),
      });
      const d = await res.json();
      if (!res.ok) alert(d.error || "Failed to link");
      else { setModal(null); setLinkParentId(""); setLinkStudentId(""); setLinkRel("guardian"); await fetchAll(); }
    } finally { setSaving(false); }
  };

  const handleUnlink = async (parentId: string, studentId: string) => {
    if (!confirm("Unlink this child from the parent?")) return;
    await fetch("/api/org/parents", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId, studentId }),
    });
    await fetchAll();
  };

  const handleDeleteParent = async (id: string) => {
    if (!confirm("Delete this parent account and all links?")) return;
    await fetch("/api/org/parents", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await fetchAll();
  };

  if (!isAdmin) {
    return <div className="max-w-2xl mx-auto px-5 py-16 text-center surface-elevated rounded-2xl"><p className="text-sm text-slate-500 font-semibold">Only administrators can manage parent accounts.</p></div>;
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center animate-pulse mx-auto"><HeartHandshake className="w-6 h-6" /></div>
        <p className="text-sm text-slate-500 font-semibold mt-3">Loading…</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <span className="inline-block text-[12px] sm:text-sm font-bold uppercase tracking-[0.22em] text-amber-600">Staff Portal</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2">
            <HeartHandshake className="w-7 h-7 text-navy-700" /> Parent / Guardian Portal
          </h1>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Create parent accounts and link them to students.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setModal("link")} className="btn-outline text-xs px-3 py-2.5 rounded-xl flex items-center gap-1.5">
            <Users className="w-4 h-4" /> Link Parent
          </button>
          <button type="button" onClick={() => setModal("create")} className="btn-primary text-xs px-3 py-2.5 rounded-xl flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> New Parent
          </button>
        </div>
      </div>

      {created && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
          <div className="font-bold text-emerald-700 mb-1 flex items-center gap-1.5"><KeyRound className="w-4 h-4" /> Parent account created</div>
          <p className="text-slate-600 text-xs">
            Share these login credentials with <span className="font-bold">{created.name}</span>:
          </p>
          <div className="mt-2 rounded-xl bg-white border border-emerald-200 px-3 py-2 font-mono text-xs text-slate-700">
            Email: <span className="font-bold">{created.email}</span>
            <br />
            Password: <span className="font-bold">{created.password}</span>
          </div>
          <button type="button" onClick={() => setCreated(null)} className="mt-2 text-[11px] font-bold text-emerald-700 hover:underline">Dismiss</button>
        </div>
      )}

      <section>
        <h2 className="text-sm font-extrabold text-slate-900 mb-3">Parent Accounts ({parents.length})</h2>
        {parents.length === 0 ? (
          <div className="surface-elevated rounded-2xl p-8 text-center">
            <Users className="w-9 h-9 text-navy-200 mx-auto mb-2" />
            <p className="text-sm text-slate-500 font-semibold">No parent accounts yet. Create one to begin.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {parents.map((p) => (
              <div key={p.id} className="surface-elevated rounded-2xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-navy-50 text-navy-700 flex items-center justify-center font-black shrink-0">{p.name.charAt(0)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-900">{p.name}</div>
                    <div className="text-[11px] text-slate-400 font-semibold truncate">{p.email}</div>
                  </div>
                  <button type="button" onClick={() => handleDeleteParent(p.id)} className="text-slate-300 hover:text-rose-500 shrink-0"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="mt-3">
                  <div className="text-[10px] font-extrabold uppercase text-slate-400 mb-1.5">Linked Students</div>
                  {p.children.length === 0 ? (
                    <p className="text-[11px] text-slate-400 font-semibold">No students linked yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {p.children.map((c) => (
                        <span key={c.id} className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700">
                          {c.name} <span className="text-slate-400 font-normal">({c.relationship})</span>
                          <button type="button" onClick={() => handleUnlink(p.id, c.id)} className="text-slate-300 hover:text-rose-500"><Unlink className="w-3 h-3" /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Create modal */}
      {modal === "create" && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2"><HeartHandshake className="w-5 h-5 text-navy-700" /> New Parent</h2>
              <button type="button" onClick={() => setModal(null)} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Parent Name <span className="text-rose-500">*</span></label>
                <input type="text" required value={pName} onChange={(e) => setPName(e.target.value)} className="input-field py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email <span className="text-rose-500">*</span></label>
                <input type="email" required value={pEmail} onChange={(e) => setPEmail(e.target.value)} className="input-field py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password (optional)</label>
                <input type="text" value={pPassword} onChange={(e) => setPPassword(e.target.value)} placeholder="Leave blank to auto-generate" className="input-field py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Link to Student</label>
                <select value={pStudentId} onChange={(e) => setPStudentId(e.target.value)} className="input-field py-2.5 text-sm">
                  <option value="">— Later —</option>
                  {students.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.studentId || s.id.slice(0,6)})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Relationship</label>
                <select value={pRel} onChange={(e) => setPRel(e.target.value)} className="input-field py-2.5 text-sm">
                  <option value="guardian">Guardian</option>
                  <option value="father">Father</option>
                  <option value="mother">Mother</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)} className="btn-outline text-xs flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary text-xs flex-1">{saving ? "Creating…" : "Create Parent"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link modal */}
      {modal === "link" && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2"><Users className="w-5 h-5 text-navy-700" /> Link Parent to Student</h2>
              <button type="button" onClick={() => setModal(null)} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleLink} className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Parent <span className="text-rose-500">*</span></label>
                <select required value={linkParentId} onChange={(e) => setLinkParentId(e.target.value)} className="input-field py-2.5 text-sm">
                  <option value="">Select parent…</option>
                  {parents.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.email})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Student <span className="text-rose-500">*</span></label>
                <select required value={linkStudentId} onChange={(e) => setLinkStudentId(e.target.value)} className="input-field py-2.5 text-sm">
                  <option value="">Select student…</option>
                  {students.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.studentId || s.id.slice(0,6)})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Relationship</label>
                <select value={linkRel} onChange={(e) => setLinkRel(e.target.value)} className="input-field py-2.5 text-sm">
                  <option value="guardian">Guardian</option>
                  <option value="father">Father</option>
                  <option value="mother">Mother</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)} className="btn-outline text-xs flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary text-xs flex-1">{saving ? "Linking…" : "Link"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
