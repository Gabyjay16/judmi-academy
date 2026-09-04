"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, ShieldCheck, Lock, Users, X } from "lucide-react";

interface StudentRow { id: string; name: string; email: string; studentId: string | null; year: string | null; departmentId: string | null; resultsApproved: number; }

export default function ResultsApprovalPage() {
  const [user, setUser] = useState<any>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [balanceByStudent, setBalanceByStudent] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem("judmi_user") || "null")); } catch {}
  }, []);

  const isAdmin = user?.role === "admin" || user?.role === "org_admin";

  const fetchAll = useCallback(async () => {
    const res = await fetch("/api/org/results-approval");
    const d = await res.json();
    setStudents(d.students || []);
    setBalanceByStudent(d.balanceByStudent || {});
  }, []);

  useEffect(() => {
    if (!user?.orgId) { setLoading(false); return; }
    fetchAll().finally(() => setLoading(false));
  }, [user?.orgId, fetchAll]);

  const toggle = async (s: StudentRow, approve: boolean) => {
    setUpdating(s.id);
    try {
      const res = await fetch("/api/org/results-approval", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: s.id, approved: approve }),
      });
      if (res.ok) await fetchAll();
      else { const d = await res.json(); alert(d.error || "Failed to update"); }
    } finally { setUpdating(null); }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fade-in">
      <div>
        <span className="inline-block text-[12px] sm:text-sm font-bold uppercase tracking-[0.22em] text-amber-600">Academic Setup</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-navy-700" /> Results Approval
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Students can only see results once their fees are fully paid. Use this page to manually approve access (grant release) for a student.
        </p>
      </div>

      {!isAdmin && (
        <div className="surface-elevated rounded-2xl p-6 text-sm text-slate-600">
          Only administrators can manage results approval.
        </div>
      )}

      {isAdmin && loading && <div className="text-sm text-slate-500">Loading students…</div>}

      {isAdmin && !loading && (
        <div className="surface-elevated rounded-2xl p-5 overflow-x-auto">
          {students.length === 0 ? (
            <div className="text-sm text-slate-500 py-8 text-center border border-dashed border-slate-200 rounded-xl">
              No students found. Add students to your school first.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wide border-b border-slate-100">
                  <th className="py-2 pr-3">Student</th>
                  <th className="py-2 px-2">Level</th>
                  <th className="py-2 px-2 text-center">Balance</th>
                  <th className="py-2 px-2 text-center">Access</th>
                  <th className="py-2 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const balance = balanceByStudent[s.id] || 0;
                  const granted = !!s.resultsApproved;
                  const autoAccess = balance <= 0;
                  const canAccess = granted || autoAccess;
                  return (
                    <tr key={s.id} className="border-b border-slate-50">
                      <td className="py-2.5 pr-3">
                        <div className="font-bold text-slate-900">{s.name}</div>
                        <div className="text-[11px] text-slate-400">{s.email}{s.studentId ? ` · ${s.studentId}` : ""}</div>
                      </td>
                      <td className="py-2.5 px-2 text-slate-600">{s.year || "—"}</td>
                      <td className={`py-2.5 px-2 text-center font-bold ${balance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                        {balance > 0 ? `$${(balance / 100).toFixed(2)}` : "Paid"}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {canAccess ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <CheckCircle2 className="w-3.5 h-3.5" /> {granted ? "Approved" : "Auto (paid)"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-extrabold bg-rose-50 text-rose-700 border border-rose-100">
                            <Lock className="w-3.5 h-3.5" /> Locked
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        {updating === s.id ? (
                          <button type="button" disabled className="btn-outline text-xs py-1.5 px-3 rounded-xl opacity-50">…</button>
                        ) : granted ? (
                          <button type="button" onClick={() => toggle(s, false)} className="btn-outline text-xs py-1.5 px-3 rounded-xl flex items-center gap-1.5 ml-auto">
                            <X className="w-3.5 h-3.5" /> Revoke
                          </button>
                        ) : (
                          <button type="button" onClick={() => toggle(s, true)} className="btn-primary text-xs py-1.5 px-3 rounded-xl flex items-center gap-1.5 ml-auto">
                            <ShieldCheck className="w-3.5 h-3.5" /> Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="surface-elevated rounded-2xl p-5 text-sm flex items-start gap-3">
        <Users className="w-5 h-5 text-navy-700 mt-0.5 shrink-0" />
        <p className="text-slate-600">
          <span className="font-bold text-slate-800">How it works:</span> A student&apos;s results unlock automatically once all invoices are marked paid or waived. The manual{" "}
          <span className="font-bold">Approve</span> action releases results even if fees remain outstanding (e.g. approved scholarships).
        </p>
      </div>
    </div>
  );
}
