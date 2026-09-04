"use client";

import { useEffect, useState } from "react";
import { BookOpen, Printer, Star, Loader2, Lock } from "lucide-react";

interface CourseRow { id: string; courseName: string; examScore: number | null; assignmentScore: number | null; total: number | null; grade: string | null; remarks: string | null; }
interface TermSummary { term: string; courses: CourseRow[]; avg: number | null; gradeCounts: Record<string, number>; performance: string; }

export default function StudentReportCard() {
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem("judmi_user") || "null")); } catch {}
  }, []);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    fetch("/api/org/report-card")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  const gradeColor = (g: string | null) => {
    switch (g) { case "A": return "#059669"; case "B": return "#0369a1"; case "C": return "#d97706"; case "D": return "#c2410c"; case "F": return "#e11d48"; default: return "#475569"; }
  };

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w || !data) return;
    const s = data.student;
    const termBlocks = data.termSummaries
      .map((ts: TermSummary) => `
        <div style="margin:16px 0;">
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #1a2c47;padding-bottom:4px;margin-bottom:8px;">
            <h3 style="margin:0;font-size:14px;font-weight:800;color:#0f172a;">${ts.term}</h3>
            <span style="font-size:11px;font-weight:700;color:#64748b;">Average: ${ts.avg ?? "—"} · ${ts.performance}</span>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead><tr style="background:#1a2c47;color:#fff;">
              <th style="padding:6px 10px;text-align:left;">Course</th><th style="padding:6px 10px;text-align:center;">Exam</th>
              <th style="padding:6px 10px;text-align:center;">Assign.</th><th style="padding:6px 10px;text-align:center;">Total</th>
              <th style="padding:6px 10px;text-align:center;">Grade</th><th style="padding:6px 10px;text-align:left;">Remarks</th>
            </tr></thead>
            <tbody>${ts.courses.map((r) => `
              <tr style="border-bottom:1px solid #e2e8f0;background:#fff;">
                <td style="padding:6px 10px;font-weight:700;">${r.courseName || "General"}</td>
                <td style="padding:6px 10px;text-align:center;">${r.examScore ?? "—"}</td>
                <td style="padding:6px 10px;text-align:center;">${r.assignmentScore ?? "—"}</td>
                <td style="padding:6px 10px;text-align:center;font-weight:800;">${r.total ?? "—"}</td>
                <td style="padding:6px 10px;text-align:center;color:${gradeColor(r.grade)};font-weight:800;">${r.grade || "—"}</td>
                <td style="padding:6px 10px;color:#64748b;">${r.remarks || ""}</td>
              </tr>`).join("")}
            </tbody>
          </table>
        </div>`).join("");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Report Card - ${s.name}</title>
    <style>@page{margin:18mm;}body{font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;margin:0;padding:0;}.sheet{max-width:780px;margin:0 auto;}.head{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #1a2c47;padding-bottom:12px;}.brand{font-size:20px;font-weight:900;color:#1a2c47;}.doc{font-size:11px;color:#64748b;text-align:right;}.title{text-align:center;margin:16px 0;}.title h1{margin:0;font-size:20px;}.title p{margin:4px 0 0;font-size:11px;color:#64748b;}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0;}.stat{border:1px solid #e2e8f0;border-radius:10px;padding:10px;text-align:center;}.stat .lbl{font-size:9px;font-weight:800;text-transform:uppercase;color:#64748b;}.stat .val{font-size:16px;font-weight:800;color:#1a2c47;margin-top:2px;}.foot{margin-top:22px;border-top:1px solid #e2e8f0;padding-top:10px;font-size:10px;color:#94a3b8;text-align:center;}</style></head><body>
    <div class="sheet">
      <div class="head"><div class="brand">${data.orgName || "Judmi Academy"}</div><div class="doc">STUDENT REPORT CARD<br/>Generated ${new Date().toLocaleDateString()}</div></div>
      <div class="title"><h1>${s.name}</h1><p>${s.studentId ? "Student ID: " + s.studentId + " · " : ""}${s.year ? s.year + " · " : ""}${s.email}</p></div>
      <div class="summary">
        <div class="stat"><div class="lbl">Attendance</div><div class="val">${data.attendancePct == null ? "—" : data.attendancePct + "%"}</div></div>
        <div class="stat"><div class="lbl">Incidents</div><div class="val">${data.conduct.incidents} (${data.conduct.majorIncidents} major)</div></div>
        <div class="stat"><div class="lbl">Rewards</div><div class="val">${data.conduct.rewards}</div></div>
        <div class="stat"><div class="lbl">Conduct</div><div class="val" style="font-size:12px;">${data.conduct.rating}</div></div>
      </div>
      ${termBlocks || '<p style="text-align:center;color:#64748b;margin:30px 0;">No results recorded.</p>'}
      <div class="foot">This report card is generated electronically by ${data.orgName || "Judmi Academy"} for ${s.name}.</div>
    </div></body></html>`);
    w.document.close();
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center animate-pulse mx-auto"><BookOpen className="w-6 h-6" /></div>
        <p className="text-sm text-slate-500 font-semibold mt-3">Loading report card…</p>
      </div>
    );
  }

  if (!data || !data.student) {
    if (data?.error) {
      return (
        <div className="max-w-2xl mx-auto px-5 py-16 text-center surface-elevated rounded-2xl space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto"><Lock className="w-7 h-7" /></div>
          <p className="text-sm font-bold text-slate-800">Report card locked</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">{data.error}</p>
        </div>
      );
    }
    return (
      <div className="max-w-2xl mx-auto px-5 py-16 text-center surface-elevated rounded-2xl">
        <BookOpen className="w-10 h-10 text-navy-200 mx-auto mb-3" />
        <p className="text-sm text-slate-500 font-semibold">No report card available yet.</p>
      </div>
    );
  }

  const s = data.student;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <span className="inline-block text-[12px] sm:text-sm font-bold uppercase tracking-[0.22em] text-amber-600">Student Portal</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-navy-700" /> My Report Card
          </h1>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Combined results, attendance & conduct.</p>
        </div>
        <button onClick={handlePrint} className="btn-primary text-xs px-3 py-2.5 rounded-xl flex items-center gap-1.5">
          <Printer className="w-4 h-4" /> Download / Print
        </button>
      </div>

      <div className="surface-elevated rounded-2xl overflow-hidden">
        <div className="bg-navy-900 text-white px-5 py-4">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400">{data.orgName || "Judmi Academy"}</div>
          <h2 className="text-lg font-extrabold">{s.name}</h2>
          <p className="text-[11px] text-slate-300 font-semibold">{s.studentId ? "ID: " + s.studentId + " · " : ""}{s.year ? s.year + " · " : ""}{s.email}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 border-b border-slate-100">
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
            <div className="text-[10px] font-extrabold text-emerald-600 uppercase">Attendance</div>
            <div className="text-lg font-extrabold text-emerald-700">{data.attendancePct == null ? "—" : data.attendancePct + "%"}</div>
          </div>
          <div className="rounded-xl bg-navy-50 border border-navy-100 p-3">
            <div className="text-[10px] font-extrabold text-navy-700 uppercase">Incidents</div>
            <div className="text-lg font-extrabold text-navy-800">{data.conduct.incidents} ({data.conduct.majorIncidents} major)</div>
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
            <div className="text-[10px] font-extrabold text-amber-600 uppercase">Rewards</div>
            <div className="text-lg font-extrabold text-amber-700">{data.conduct.rewards}</div>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
            <div className="text-[10px] font-extrabold text-slate-500 uppercase">Conduct</div>
            <div className="text-[13px] font-extrabold text-slate-700 leading-tight mt-1">{data.conduct.rating}</div>
          </div>
        </div>

        {data.termSummaries.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400 font-semibold">No results recorded yet.</div>
        ) : (
          <div className="p-5 space-y-6">
            {data.termSummaries.map((ts: TermSummary) => (
              <div key={ts.term}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" /> {ts.term}</h3>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-500">Average: <span className="text-navy-700">{ts.avg ?? "—"}</span></span>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">{ts.performance}</span>
                  </div>
                </div>
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-extrabold uppercase text-slate-400">
                      <th className="px-3 py-2.5 rounded-l-lg">Course</th>
                      <th className="px-3 py-2.5 text-center">Exam</th>
                      <th className="px-3 py-2.5 text-center">Assign.</th>
                      <th className="px-3 py-2.5 text-center">Total</th>
                      <th className="px-3 py-2.5 text-center">Grade</th>
                      <th className="px-3 py-2.5 rounded-r-lg hidden sm:table-cell">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ts.courses.map((r) => (
                      <tr key={r.id} className="border-b border-slate-100 text-sm">
                        <td className="px-3 py-2.5 font-bold text-slate-900">{r.courseName || "General"}</td>
                        <td className="px-3 py-2.5 text-center text-slate-500">{r.examScore ?? "—"}</td>
                        <td className="px-3 py-2.5 text-center text-slate-500">{r.assignmentScore ?? "—"}</td>
                        <td className="px-3 py-2.5 text-center font-extrabold text-slate-900">{r.total ?? "—"}</td>
                        <td className="px-3 py-2.5 text-center font-extrabold" style={{ color: gradeColor(r.grade) }}>{r.grade || "—"}</td>
                        <td className="px-3 py-2.5 text-slate-500 text-xs hidden sm:table-cell">{r.remarks || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
