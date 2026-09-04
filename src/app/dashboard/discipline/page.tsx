"use client";

import { useEffect, useState, useCallback } from "react";
import { ShieldAlert, Plus, Trash2, X, Award, PhoneCall, AlertTriangle } from "lucide-react";

interface DiscRecord { id: string; studentName: string | null; type: string; severity: string | null; title: string; notes: string | null; recordedByName: string | null; createdAt: string; }
interface Student { id: string; name: string; studentId: string | null; }

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

const TYPE_META: Record<string, { icon: any; color: string }> = {
  incident: { icon: AlertTriangle, color: "text-rose-500 bg-rose-50 border-rose-100" },
  reward: { icon: Award, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
  contact: { icon: PhoneCall, color: "text-blue-600 bg-blue-50 border-blue-100" },
};

export default function DisciplinePage() {
  const [user, setUser] = useState<any>(null);
  const [records, setRecords] = useState<DiscRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");

  const [rType, setRType] = useState("incident");
  const [rStudent, setRStudent] = useState("");
  const [rSeverity, setRSeverity] = useState("minor");
  const [rTitle, setRTitle] = useState("");
  const [rNotes, setRNotes] = useState("");

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem("judmi_user") || "null")); } catch {}
  }, []);

  const isAdmin = user?.role === "admin" || user?.role === "org_admin";

  const fetchAll = useCallback(async () => {
    const [dRes, sRes] = await Promise.all([fetch("/api/org/discipline"), fetch("/api/org/students")]);
    const dData = await dRes.json();
    const sData = await sRes.json();
    setRecords(dData.records || []);
    setStudents(sData.students || []);
  }, []);

  useEffect(() => {
    if (!user?.orgId) { setLoading(false); return; }
    fetchAll().finally(() => setLoading(false));
  }, [user?.orgId, fetchAll]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const student = students.find((s) => s.id === rStudent);
      await fetch("/api/org/discipline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: rStudent, studentName: student?.name, type: rType, severity: rType === "reward" ? "acknowledgment" : rSeverity, title: rTitle, notes: rNotes }),
      });
      setModal(false);
      setRType("incident"); setRStudent(""); setRSeverity("minor"); setRTitle(""); setRNotes("");
      await fetchAll();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this record?")) return;
    await fetch("/api/org/discipline", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await fetchAll();
  };

  const filtered = filter === "all" ? records : records.filter((r) => r.type === filter);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center animate-pulse mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <p className="text-sm text-slate-500 font-semibold mt-3">Loading records…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <span className="inline-block text-[12px] sm:text-sm font-bold uppercase tracking-[0.22em] text-amber-600">Staff Portal</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-navy-700" /> Conduct & Discipline
          </h1>
        </div>
        <button type="button" onClick={() => setModal(true)} className="btn-primary text-xs px-3 py-2.5 rounded-xl flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> New Record
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="surface-elevated rounded-2xl p-5">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Incidents</div>
          <div className="text-xl font-extrabold text-rose-600 mt-1">{records.filter((r) => r.type === "incident").length}</div>
        </div>
        <div className="surface-elevated rounded-2xl p-5">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Rewards</div>
          <div className="text-xl font-extrabold text-emerald-600 mt-1">{records.filter((r) => r.type === "reward").length}</div>
        </div>
        <div className="surface-elevated rounded-2xl p-5">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Contacts</div>
          <div className="text-xl font-extrabold text-blue-600 mt-1">{records.filter((r) => r.type === "contact").length}</div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all", "incident", "reward", "contact"].map((t) => (
          <button key={t} type="button" onClick={() => setFilter(t)} className={`text-xs px-3 py-1.5 rounded-xl border font-bold capitalize ${filter === t ? "bg-navy-900 text-white border-navy-900" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"}`}>
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="surface-elevated rounded-2xl p-8 text-center space-y-2">
          <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-500">No records</p>
          <p className="text-xs text-slate-400">Log conduct incidents, rewards, or parent/guardian contacts here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const meta = TYPE_META[r.type] || TYPE_META.incident;
            const Icon = meta.icon;
            return (
              <div key={r.id} className="surface-elevated rounded-2xl px-4 py-3.5 flex items-start gap-3">
                <span className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${meta.color}`}><Icon className="w-5 h-5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-900">{r.title}</div>
                  <div className="text-[11px] text-slate-400 font-semibold mt-0.5">{r.studentName || "Student"}{r.severity ? ` · ${r.severity}` : ""} · {fmt(r.createdAt)}</div>
                  {r.notes && <div className="text-xs text-slate-500 mt-1 line-clamp-2">{r.notes}</div>}
                  {r.recordedByName && <div className="text-[10px] text-slate-300 font-semibold mt-1">by {r.recordedByName}</div>}
                </div>
                {isAdmin && (
                  <button type="button" onClick={() => handleDelete(r.id)} className="text-slate-300 hover:text-rose-500 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-navy-700" /> New Record</h2>
              <button type="button" onClick={() => setModal(false)} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { v: "incident", l: "Incident", icon: AlertTriangle },
                    { v: "reward", l: "Reward", icon: Award },
                    { v: "contact", l: "Contact", icon: PhoneCall },
                  ].map((o) => (
                    <button key={o.v} type="button" onClick={() => setRType(o.v)} className={`text-xs px-2 py-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 ${rType === o.v ? "bg-navy-900 text-white border-navy-900" : "bg-white text-slate-500 border-slate-200"}`}>
                      <o.icon className="w-3.5 h-3.5" /> {o.l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Student <span className="text-rose-500">*</span></label>
                <select required value={rStudent} onChange={(e) => setRStudent(e.target.value)} className="input-field py-2.5 text-sm">
                  <option value="">Select student…</option>
                  {students.map((s) => <option key={s.id} value={s.id}>{s.name} {s.studentId ? `(${s.studentId})` : ""}</option>)}
                </select>
              </div>
              {rType !== "reward" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Severity</label>
                  <select value={rSeverity} onChange={(e) => setRSeverity(e.target.value)} className="input-field py-2.5 text-sm">
                    <option value="minor">Minor</option>
                    <option value="major">Major</option>
                    <option value="warning">Warning</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Title <span className="text-rose-500">*</span></label>
                <input type="text" required value={rTitle} onChange={(e) => setRTitle(e.target.value)} placeholder={rType === "contact" ? "e.g. Made contact with guardian re: attendance" : rType === "reward" ? "e.g. Outstanding performance" : "e.g. Late submission / classroom disruption"} className="input-field py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes</label>
                <textarea value={rNotes} onChange={(e) => setRNotes(e.target.value)} rows={3} className="input-field py-2.5 text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="btn-outline text-xs flex-1">Cancel</button>
                <button type="submit" disabled={saving || !rStudent || !rTitle.trim()} className="btn-primary text-xs flex-1">{saving ? "Saving…" : "Save Record"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
