import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { results, users, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

const STAFF = ["admin", "org_admin", "teacher"];
const GPA: Record<string, number> = { A: 4, B: 3, C: 2, D: 1, F: 0 };

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isStaff = STAFF.includes(user.role);
    const studentId = isStaff ? (req.nextUrl.searchParams.get("studentId") || user.id) : user.id;

    const studentRows = await db.select().from(users).where(eq(users.id, studentId)).limit(1);
    const student = studentRows[0];
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    let rows = await db.select().from(results).where(eq(results.studentId, studentId));
    if (!isStaff) rows = rows.filter((r) => r.published === 1);

    let orgName = "Judmi Academy";
    if (student.orgId) {
      const orgRows = await db.select().from(organizations).where(eq(organizations.id, student.orgId)).limit(1);
      if (orgRows[0]) orgName = orgRows[0].brandName || orgRows[0].name;
    }

    // Group by term, compute GPA per term and CGPA overall
    const byTerm = rows.reduce<Record<string, typeof rows>>((acc, r) => {
      (acc[r.term] = acc[r.term] || []).push(r);
      return acc;
    }, {});
    const terms = Object.keys(byTerm).sort((a, b) => a.localeCompare(b));

    let cgpaPoints = 0;
    let cgpaCredits = 0;
    let totalScore = 0;
    let totalCount = 0;

    const termBlocks = terms.map((term) => {
      const arr = byTerm[term];
      let points = 0; let credits = 0; let tScore = 0; let tCount = 0;
      arr.forEach((r) => {
        if (r.grade && GPA[r.grade] != null) { points += GPA[r.grade]; credits += 1; }
        if (r.total != null) { tScore += r.total; tCount += 1; }
      });
      cgpaPoints += points; cgpaCredits += credits;
      totalScore += tScore; totalCount += tCount;
      const termGpa = credits ? (points / credits).toFixed(2) : "—";
      const termAvg = tCount ? Math.round(tScore / tCount) : null;

      const rowsHtml = arr.map((r) => {
        const gColor = { A: "#059669", B: "#0369a1", C: "#d97706", D: "#c2410c", F: "#e11d48" }[r.grade || ""] || "#475569";
        return `
        <tr style="border-bottom:1px solid #e2e8f0;background:#fff;">
          <td style="padding:7px 10px;font-weight:700;color:#0f172a;">${r.courseName || "General"}</td>
          <td style="padding:7px 10px;text-align:center;">${r.total ?? "—"}</td>
          <td style="padding:7px 10px;text-align:center;">${r.remarks || ""}</td>
          <td style="padding:7px 10px;text-align:center;color:#475569;font-weight:700;">${r.grade || "—"}</td>
          <td style="padding:7px 10px;text-align:center;color:${gColor};font-weight:800;">${r.grade && GPA[r.grade] != null ? GPA[r.grade] : "—"}</td>
        </tr>`;
      }).join("");

      return `
        <h3 style="font-size:13px;font-weight:800;color:#1a2c47;margin:16px 0 8px;border-bottom:2px solid #1a2c47;padding-bottom:4px;">
          ${term} — Avg: ${termAvg ?? "—"} · GPA: ${termGpa}
        </h3>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr style="background:#1a2c47;color:#fff;">
              <th style="padding:7px 10px;text-align:left;">Course</th>
              <th style="padding:7px 10px;text-align:center;">Total</th>
              <th style="padding:7px 10px;text-align:center;">Remarks</th>
              <th style="padding:7px 10px;text-align:center;">Grade</th>
              <th style="padding:7px 10px;text-align:center;">Points</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>`;
    }).join("");

    const cgpa = cgpaCredits ? (cgpaPoints / cgpaCredits).toFixed(2) : "—";
    const overallAvg = totalCount ? Math.round(totalScore / totalCount) : null;
    const overallGrade = overallAvg == null ? "—" : overallAvg >= 70 ? "A" : overallAvg >= 60 ? "B" : overallAvg >= 50 ? "C" : overallAvg >= 40 ? "D" : "F";

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Official Transcript - ${student.name}</title>
<style>
  @page { margin: 20mm; }
  body { font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;margin:0;padding:0; }
  .sheet { max-width:800px;margin:0 auto; }
  .head { display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #1a2c47;padding-bottom:12px; }
  .brand{font-size:22px;font-weight:900;color:#1a2c47;}
  .doc{font-size:11px;color:#64748b;text-align:right;}
  .title{text-align:center;margin:18px 0;}
  .title h1{margin:0;font-size:20px;}
  .title p{margin:4px 0 0;font-size:11px;color:#64748b;}
  .meta{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0;}
  .meta div{font-size:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px 12px;}
  .meta span{font-weight:800;color:#1a2c47;}
  .cgpa{text-align:center;background:#1a2c47;color:#fff;border-radius:12px;padding:14px;margin:12px 0;}
  .cgpa .lbl{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;}
  .cgpa .val{font-size:26px;font-weight:900;margin-top:2px;}
  .foot{margin-top:24px;border-top:1px solid #e2e8f0;padding-top:10px;font-size:10px;color:#94a3b8;text-align:center;}
</style>
</head>
<body>
<div class="sheet">
  <div class="head">
    <div class="brand">${orgName}</div>
    <div class="doc">OFFICIAL ACADEMIC TRANSCRIPT<br/>Generated ${new Date().toLocaleDateString()}</div>
  </div>
  <div class="title">
    <h1>${escapeHtml(student.name)}</h1>
    <p>${escapeHtml(student.email)}</p>
  </div>
  <div class="meta">
    <div>ID: <span>${escapeHtml(student.studentId || "—")}</span></div>
    <div>Level: <span>${escapeHtml(student.year || "—")}</span></div>
    <div>Program: <span>${escapeHtml(student.departmentId || "—")}</span></div>
  </div>
  <div class="cgpa">
    <div class="lbl">Cumulative GPA (CGPA)</div>
    <div class="val">${cgpa}</div>
    <div style="font-size:11px;color:#cbd5e1;margin-top:2px;">Overall Average: ${overallAvg ?? "—"} · Overall Grade: ${overallGrade}</div>
  </div>
  ${termBlocks || '<p style="text-align:center;color:#64748b;margin:30px 0;">No published results yet.</p>'}
  <div class="foot">This is an official academic transcript generated electronically by ${orgName} for ${escapeHtml(student.name)}. For verification, contact the school administrator.</div>
</div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="transcript-${student.studentId || student.name.trim().replace(/\s+/g, "-").toLowerCase()}.html"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
