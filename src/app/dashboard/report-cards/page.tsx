"use client";

import { useEffect, useState, useCallback } from "react";
import { BookOpen, Users, Printer, Search, Star } from "lucide-react";

interface CourseRow { id: string; courseName: string; examScore: number | null; assignmentScore: number | null; total: number | null; grade: string | null; remarks: string | null; }
interface TermSummary { term: string; courses: CourseRow[]; avg: number | null; gradeCounts: Record<string, number>; performance: string; }
interface Student { name: string; email: string; studentId: string | null; year: string | null; departmentId: string | null; }

export default function ReportCardsPage() {
  const [user, setUser] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingCard, setLoadingCard] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem("judmi_user") || "null")); } catch {}
  }, []);

  const isAdmin = user?.role === "admin" || user?.role === "org_admin";

  const loadStudents = useCallback(async () => {
    try {
      const res = await fetch("/api/org/students");
      const d = await res.json();
      setStudents(d || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (user?.orgId) loadStudents(); else setLoading(false); }, [user?.orgId, loadStudents]);

  const loadCard = useCallback(async (id: string) => {
    if (!id) return;
    setLoadingCard(true);
    try {
      const res = await fetch("/api/org/report-card?studentId=" + encodeURIComponent(id));
      const d = await res.json();
      setData(d);
    } finally { setLoadingCard(false); }
  }, []);

  useEffect(() => { if (selectedId) loadCard(selectedId); }, [selectedId, loadCard]);

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w || !data) return;
    const s = data.student;
    w.document.write(reportHtml(data));
    w.document.close();
  };

  const gradeColor = (g: string | null) => {
    switch (g) { case "A": return "#059669"; case "B": return "#0369a1"; case "C": return "#d97706"; case "D": return "#c2410c"; case "F": return "#e11d48"; default: return "#475569"; }
  };

  const filteredStudents = students
    .map((s: any) => ({ id: s.id, name: s.name, studentId: s.studentId || "", year: s.year || "" }))
    .filter((s) => !filter || s.name.toLowerCase().includes(filter.toLowerCase()));

  if (!isAdmin) {
    return <div className="max-w-2xl mx-auto px-5 py-16 text-center surface-elevated rounded-2xl"><p className="text-sm text-slate-500 font-semibold">Only administrators and org admins can view and print report cards.</p></div>;
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center animate-pulse mx-auto"><BookOpen className="w-6 h-6" /></div>
        <p className="text-sm text-slate-500 font-semibold mt-3">Loading…</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <span className="inline-block text-[12px] sm:text-sm font-bold uppercase tracking-[0.22em] text-amber-600">Staff Portal</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-navy-700" /> Report Cards
          </h1>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Per-term academic report combining results, attendance & conduct.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[300px_1fr] gap-6 items-start">
        {/* Student selector */}
        <div className="surface-elevated rounded-2xl p-4 lg:sticky lg:top-24">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-navy-700" />
            <h2 className="text-sm font-extrabold text-slate-900">Select Student</h2>
          </div>
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search name…" className="input-field pl-9 py-2 text-sm" />
          </div>
          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
            {filteredStudents.length === 0 && <p className="text-xs text-slate-400 text-center py-6">No students found.</p>}
            {filteredStudents.map((s) => (
              <button key={s.id} type="button" onClick={() => setSelectedId(s.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm font-semibold transition ${
                  selectedId === s.id ? "bg-navy-900 text-white border-navy-900" : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-100"
                }`}>
                {s.name}
                <span className={`block text-[10px] ${selectedId === s.id ? "text-slate-300" : "text-slate-400"} font-bold`}>{s.studentId || s.year || "—"}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Report card preview */}
        <div>
          {!selectedId ? (
            <div className="surface-elevated rounded-2xl p-10 text-center">
              <BookOpen className="w-10 h-10 text-navy-200 mx-auto mb-3" />
              <p className="text-sm text-slate-500 font-semibold">Select a student to preview their report card.</p>
            </div>
          ) : loadingCard ? (
            <div className="surface-elevated rounded-2xl p-10 text-center animate-pulse"><p className="text-sm text-slate-500 font-semibold">Generating report card…</p></div>
          ) : data ? (
            <div className="surface-elevated rounded-2xl overflow-hidden">
              <div className="bg-navy-900 text-white px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-400">{data.orgName || "Judmi Academy"}</div>
                  <h2 className="text-lg font-extrabold">{data.student.name}</h2>
                  <p className="text-[11px] text-slate-300 font-semibold">{data.student.studentId ? "ID: " + data.student.studentId + " · " : ""}{data.student.year ? data.student.year + " · " : ""}{data.student.email}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <a href={"/api/org/transcript?studentId=" + encodeURIComponent(selectedId)} className="bg-white text-navy-900 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 hover:bg-slate-200 justify-center">
                    <Printer className="w-4 h-4" /> Official Transcript
                  </a>
                  <button onClick={handlePrint} className="bg-amber-500 text-navy-900 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 hover:bg-amber-400 justify-center">
                    <Printer className="w-4 h-4" /> Report Card PDF
                  </button>
                </div>
              </div>

              {/* Summary badges */}
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

              {/* Term results */}
              {data.termSummaries.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400 font-semibold">No results recorded for this student yet.</div>
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
          ) : (
            <div className="surface-elevated rounded-2xl p-10 text-center"><p className="text-sm text-slate-500 font-semibold">Could not load report card.</p></div>
          )}
        </div>
      </div>
    </div>
  );
}

function reportHtml(data: any) {
  const s = data.student;
  const gradeColor = (g: string | null) => {
    switch (g) { case "A": return "#059669"; case "B": return "#0369a1"; case "C": return "#d97706"; case "D": return "#c2410c"; case "F": return "#e11d48"; default: return "#475569"; }
  };
  const termBlocks = data.termSummaries
    .map((ts: TermSummary) => `
      <div style="margin:16px 0;">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #1a2c47;padding-bottom:4px;margin-bottom:8px;">
          <h3 style="margin:0;font-size:14px;font-weight:800;color:#0f172a;">${ts.term}</h3>
          <span style="font-size:11px;font-weight:700;color:#64748b;">Average: ${ts.avg ?? "—"} · ${ts.performance}</span>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr style="background:#1a2c47;color:#fff;">
              <th style="padding:6px 10px;text-align:left;">Course</th>
              <th style="padding:6px 10px;text-align:center;">Exam</th>
              <th style="padding:6px 10px;text-align:center;">Assign.</th>
              <th style="padding:6px 10px;text-align:center;">Total</th>
              <th style="padding:6px 10px;text-align:center;">Grade</th>
              <th style="padding:6px 10px;text-align:left;">Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${ts.courses.map((r) => `
              <tr style="border-bottom:1px solid #e2e8f0;background:#fff;">
                <td style="padding:6px 10px;font-weight:700;color:#0f172a;">${r.courseName || "General"}</td>
                <td style="padding:6px 10px;text-align:center;">${r.examScore ?? "—"}</td>
                <td style="padding:6px 10px;text-align:center;">${r.assignmentScore ?? "—"}</td>
                <td style="padding:6px 10px;text-align:center;font-weight:800;">${r.total ?? "—"}</td>
                <td style="padding:6px 10px;text-align:center;color:${gradeColor(r.grade)};font-weight:800;">${r.grade || "—"}</td>
                <td style="padding:6px 10px;color:#64748b;">${r.remarks || ""}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>`).join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Report Card - ${s.name}</title>
<style>
  @page { margin: 18mm; }
  body { font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;margin:0;padding:0; }
  .sheet { max-width:780px;margin:0 auto; }
  .head { display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #1a2c47;padding-bottom:12px; }
  .brand{font-size:20px;font-weight:900;color:#1a2c47;}
  .doc{font-size:11px;color:#64748b;text-align:right;}
  .title{text-align:center;margin:16px 0;}
  .title h1{margin:0;font-size:20px;}
  .title p{margin:4px 0 0;font-size:11px;color:#64748b;}
  .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0;}
  .stat{border:1px solid #e2e8f0;border-radius:10px;padding:10px;text-align:center;}
  .stat .lbl{font-size:9px;font-weight:800;text-transform:uppercase;color:#64748b;}
  .stat .val{font-size:16px;font-weight:800;color:#1a2c47;margin-top:2px;}
  .foot{margin-top:22px;border-top:1px solid #e2e8f0;padding-top:10px;font-size:10px;color:#94a3b8;text-align:center;}
</style></head><body>
<div class="sheet">
  <div class="head">
    <div class="brand">${data.orgName || "Judmi Academy"}</div>
    <div class="doc">STUDENT REPORT CARD<br/>Generated ${new Date().toLocaleDateString()}</div>
  </div>
  <div class="title">
    <h1>${s.name}</h1>
    <p>${s.studentId ? "Student ID: " + s.studentId + " · " : ""}${s.year ? s.year + " · " : ""}${s.email}</p>
  </div>
  <div class="summary">
    <div class="stat"><div class="lbl">Attendance</div><div class="val">${data.attendancePct == null ? "—" : data.attendancePct + "%"}</div></div>
    <div class="stat"><div class="lbl">Incidents</div><div class="val">${data.conduct.incidents} (${data.conduct.majorIncidents} major)</div></div>
    <div class="stat"><div class="lbl">Rewards</div><div class="val">${data.conduct.rewards}</div></div>
    <div class="stat"><div class="lbl">Conduct</div><div class="val" style="font-size:12px;">${data.conduct.rating}</div></div>
  </div>
  ${termBlocks || '<p style="text-align:center;color:#64748b;margin:30px 0;">No results recorded.</p>'}
  <div class="foot">This report card is generated electronically by ${data.orgName || "Judmi Academy"} for ${s.name}.</div>
</div></body></html>`;
}
