"use client";

import { useEffect, useState } from "react";
import { HeartHandshake, GraduationCap, ClipboardCheck, Wallet, ShieldAlert, Award, Printer, Users } from "lucide-react";

interface ChildSummary {
  linkId: string;
  relationship: string;
  student: { id: string; name: string; studentId: string | null; year: string | null; departmentId: string | null; email: string; };
  terms: string[];
  termSummaries: { term: string; avg: number | null; count: number }[];
  attendancePct: number | null;
  conduct: { incidents: number; rewards: number };
  fees: { totalInvoiced: number; totalPaid: number; balanceOutstanding: number };
  gradeCounts: Record<string, number>;
}

export default function ParentDashboard() {
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem("judmi_user") || "null")); } catch {}
  }, []);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    fetch("/api/parent/children")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-5 py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center animate-pulse mx-auto">
          <HeartHandshake className="w-6 h-6" />
        </div>
        <p className="text-sm text-slate-500 font-semibold mt-3">Loading your children's progress…</p>
      </div>
    );
  }

  const children: ChildSummary[] = data?.children || [];

  if (children.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-16 text-center surface-elevated rounded-2xl">
        <HeartHandshake className="w-10 h-10 text-navy-200 mx-auto mb-3" />
        <h1 className="text-lg font-extrabold text-slate-900">Parent Portal</h1>
        <p className="text-sm text-slate-500 font-semibold mt-1">No children are linked to your account yet. Please contact the school administrator.</p>
      </div>
    );
  }

  const handlePrint = (child: ChildSummary) => {
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    const s = child.student;
    const termRows = child.termSummaries.map((t) => `
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:6px 10px;font-weight:700;">${t.term}</td>
        <td style="padding:6px 10px;text-align:center;">${t.count}</td>
        <td style="padding:6px 10px;text-align:center;font-weight:800;">${t.avg ?? "—"}</td>
      </tr>`).join("");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Progress - ${s.name}</title>
    <style>@page{margin:18mm;}body{font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;margin:0;padding:0;}.sheet{max-width:720px;margin:0 auto;}.head{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #1a2c47;padding-bottom:12px;}.brand{font-size:20px;font-weight:900;color:#1a2c47;}.doc{font-size:11px;color:#64748b;}.title{text-align:center;margin:16px 0;}.title h1{margin:0;font-size:20px;}.title p{margin:4px 0 0;font-size:11px;color:#64748b;}table{width:100%;border-collapse:collapse;font-size:12px;}th{background:#1a2c47;color:#fff;padding:7px 10px;text-align:left;}td{padding:6px 10px;}.foot{margin-top:22px;border-top:1px solid #e2e8f0;padding-top:10px;font-size:10px;color:#94a3b8;text-align:center;}</style></head><body>
    <div class="sheet">
      <div class="head"><div class="brand">${data?.orgName || "Judmi Academy"}</div><div class="doc">PARENT PROGRESS REPORT<br/>Generated ${new Date().toLocaleDateString()}</div></div>
      <div class="title"><h1>${s.name}</h1><p>${s.studentId ? "Student ID: " + s.studentId + " · " : ""}${s.year ? s.year + " · " : ""}${s.email}</p></div>
      <table style="margin-bottom:8px;">
        <tr style="border-bottom:1px solid #e2e8f0;"><td style="font-weight:700;">Attendance</td><td style="text-align:right;font-weight:800;">${child.attendancePct == null ? "—" : child.attendancePct + "%"}</td></tr>
        <tr style="border-bottom:1px solid #e2e8f0;"><td style="font-weight:700;">Conduct incidents</td><td style="text-align:right;font-weight:800;">${child.conduct.incidents} (${child.conduct.rewards} rewards)</td></tr>
        <tr style="border-bottom:1px solid #e2e8f0;"><td style="font-weight:700;">Fees outstanding</td><td style="text-align:right;font-weight:800;color:${child.fees.balanceOutstanding > 0 ? "#e11d48" : "#059669"};">${(child.fees.balanceOutstanding).toLocaleString()} FCFA</td></tr>
      </table>
      <h3 style="font-size:13px;font-weight:800;color:#1a2c47;border-bottom:2px solid #1a2c47;padding-bottom:4px;margin:14px 0 6px;">Term Averages</h3>
      <table><thead><tr><th>Term</th><th style="text-align:center;">Subjects</th><th style="text-align:center;">Average</th></tr></thead><tbody>${termRows || '<tr><td colspan="3" style="text-align:center;color:#64748b;">No published results.</td></tr>'}</tbody></table>
      <div class="foot">Prepared for the parent/guardian of ${s.name}.</div>
    </div></body></html>`);
    w.document.close();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in">
      <div>
        <span className="inline-block text-[12px] sm:text-sm font-bold uppercase tracking-[0.22em] text-amber-600">Parent Portal</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2">
          <HeartHandshake className="w-7 h-7 text-navy-700" /> My Children's Progress
        </h1>
        <p className="text-xs text-slate-400 font-semibold mt-0.5">{data?.orgName || "Judmi Academy"} — guardian dashboard</p>
      </div>

      {children.map((child) => {
        const s = child.student;
        const outstanding = child.fees.balanceOutstanding;
        const latest = child.termSummaries[child.termSummaries.length - 1];
        return (
          <div key={child.linkId} className="surface-elevated rounded-2xl overflow-hidden">
            <div className="bg-navy-900 text-white px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-500 text-navy-900 flex items-center justify-center text-lg font-black shrink-0">
                  {s.name.charAt(0)}
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-400">{child.relationship}</div>
                  <h2 className="text-lg font-extrabold">{s.name}</h2>
                  <p className="text-[11px] text-slate-300 font-semibold">{s.studentId ? "ID: " + s.studentId + " · " : ""}{s.year ? s.year : ""}</p>
                </div>
              </div>
              <button onClick={() => handlePrint(child)} className="bg-white text-navy-900 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 hover:bg-slate-200">
                <Printer className="w-4 h-4" /> Progress Report
              </button>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 border-b border-slate-100">
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
                <div className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 uppercase"><ClipboardCheck className="w-3 h-3" /> Attendance</div>
                <div className="text-lg font-extrabold text-emerald-700">{child.attendancePct == null ? "—" : child.attendancePct + "%"}</div>
              </div>
              <div className="rounded-xl bg-navy-50 border border-navy-100 p-3">
                <div className="flex items-center gap-1 text-[10px] font-extrabold text-navy-700 uppercase"><GraduationCap className="w-3 h-3" /> Latest Avg</div>
                <div className="text-lg font-extrabold text-navy-800">{latest?.avg ?? "—"}</div>
              </div>
              <div className="rounded-xl bg-rose-50 border border-rose-100 p-3">
                <div className="flex items-center gap-1 text-[10px] font-extrabold text-rose-600 uppercase"><Wallet className="w-3 h-3" /> Fees Due</div>
                <div className="text-lg font-extrabold" style={{ color: outstanding > 0 ? "#e11d48" : "#059669" }}>{outstanding.toLocaleString()} FCFA</div>
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
                <div className="flex items-center gap-1 text-[10px] font-extrabold text-amber-600 uppercase"><ShieldAlert className="w-3 h-3" /> Conduct</div>
                <div className="text-lg font-extrabold text-amber-700">{child.conduct.incidents} inc. / {child.conduct.rewards} rw.</div>
              </div>
            </div>

            {/* Term averages table */}
            <div className="p-5">
              <h3 className="text-sm font-extrabold text-slate-900 mb-3">Term Averages</h3>
              {child.termSummaries.length === 0 ? (
                <p className="text-xs text-slate-400 font-semibold">No published results yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-extrabold uppercase text-slate-400">
                        <th className="px-3 py-2.5 rounded-l-lg">Term</th>
                        <th className="px-3 py-2.5 text-center">Subjects</th>
                        <th className="px-3 py-2.5 text-center rounded-r-lg">Average</th>
                      </tr>
                    </thead>
                    <tbody>
                      {child.termSummaries.map((t) => (
                        <tr key={t.term} className="border-b border-slate-100 text-sm">
                          <td className="px-3 py-2.5 font-bold text-slate-900">{t.term}</td>
                          <td className="px-3 py-2.5 text-center text-slate-500">{t.count}</td>
                          <td className="px-3 py-2.5 text-center font-extrabold text-navy-700">{t.avg ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {Object.keys(child.gradeCounts).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(child.gradeCounts).map(([g, c]) => (
                    <span key={g} className="text-[11px] font-bold bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-slate-600">{g}: {c}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}

      <p className="text-center text-[11px] text-slate-400 font-semibold flex items-center justify-center gap-1">
        <Users className="w-3.5 h-3.5" /> For assistance, contact your school administrator.
      </p>
    </div>
  );
}
