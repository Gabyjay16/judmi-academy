"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, Award, PhoneCall, AlertTriangle } from "lucide-react";

interface DiscRecord { id: string; type: string; severity: string | null; title: string; notes: string | null; recordedByName: string | null; createdAt: string; }

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

const TYPE_META: Record<string, { icon: any; color: string; label: string }> = {
  incident: { icon: AlertTriangle, color: "text-rose-500 bg-rose-50 border-rose-100", label: "Incident" },
  reward: { icon: Award, color: "text-emerald-600 bg-emerald-50 border-emerald-100", label: "Reward" },
  contact: { icon: PhoneCall, color: "text-blue-600 bg-blue-50 border-blue-100", label: "Parent Contact" },
};

export default function StudentDisciplinePage() {
  const [user, setUser] = useState<any>(null);
  const [records, setRecords] = useState<DiscRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem("judmi_user") || "null")); } catch {}
  }, []);

  useEffect(() => {
    if (!user?.orgId) { setLoading(false); return; }
    fetch("/api/org/discipline")
      .then((r) => r.json())
      .then((d) => setRecords(d.records || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.orgId]);

  const rewards = records.filter((r) => r.type === "reward");
  const incidents = records.filter((r) => r.type === "incident");
  const contacts = records.filter((r) => r.type === "contact");

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center animate-pulse mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <p className="text-sm text-slate-500 font-semibold mt-3">Loading conduct record…</p>
      </div>
    );
  }

  const all = [...records];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in">
      <div>
        <span className="inline-block text-[12px] sm:text-sm font-bold uppercase tracking-[0.22em] text-amber-600">Student</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2">
          <ShieldAlert className="w-7 h-7 text-navy-700" /> My Conduct Record
        </h1>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="surface-elevated rounded-2xl p-5 text-center">
          <Award className="w-6 h-6 text-emerald-600 mx-auto" />
          <div className="text-xl font-extrabold text-slate-900 mt-1">{rewards.length}</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase">Rewards</div>
        </div>
        <div className="surface-elevated rounded-2xl p-5 text-center">
          <AlertTriangle className="w-6 h-6 text-rose-500 mx-auto" />
          <div className="text-xl font-extrabold text-slate-900 mt-1">{incidents.length}</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase">Incidents</div>
        </div>
        <div className="surface-elevated rounded-2xl p-5 text-center">
          <PhoneCall className="w-6 h-6 text-blue-600 mx-auto" />
          <div className="text-xl font-extrabold text-slate-900 mt-1">{contacts.length}</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase">Contacts</div>
        </div>
      </div>

      {all.length === 0 ? (
        <div className="surface-elevated rounded-2xl p-8 text-center space-y-2">
          <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-500">No conduct records yet</p>
          <p className="text-xs text-slate-400">Your conduct history will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {all.map((r) => {
            const meta = TYPE_META[r.type] || TYPE_META.incident;
            const Icon = meta.icon;
            return (
              <div key={r.id} className="surface-elevated rounded-2xl px-4 py-3.5 flex items-start gap-3">
                <span className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${meta.color}`}><Icon className="w-5 h-5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-900">{r.title}</div>
                  <div className="text-[11px] text-slate-400 font-semibold mt-0.5">{meta.label}{r.severity ? ` · ${r.severity}` : ""} · {fmt(r.createdAt)}</div>
                  {r.notes && <div className="text-xs text-slate-500 mt-1">{r.notes}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
