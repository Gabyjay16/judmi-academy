import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { results, users, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { canViewResults } from "@/lib/results-access";

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isOwner = user.role === "student";
    const isStaff = user.role === "admin" || user.role === "org_admin" || user.role === "teacher";

    // Staff can view any student by ?studentId=; students view their own.
    const studentId = isOwner ? user.id : (req.nextUrl.searchParams.get("studentId") || user.id);
    if (!isStaff && !isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const studentRows = await db.select().from(users).where(eq(users.id, studentId)).limit(1);
    const student = studentRows[0];
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const rows = await db
      .select()
      .from(results)
      .where(eq(results.studentId, studentId));

    // Published only for the student owner; staff see all.
    if (!isStaff && !(await canViewResults(user, studentId))) {
      return NextResponse.json({ error: "Results are locked until outstanding fees are cleared or an administrator approves access." }, { status: 403 });
    }
    const visible = isStaff ? rows : rows.filter((r) => r.published === 1);

    let orgName = "";
    if (student.orgId) {
      const orgRows = await db.select().from(organizations).where(eq(organizations.id, student.orgId)).limit(1);
      if (orgRows[0]) orgName = orgRows[0].brandName || orgRows[0].name;
    }

    const grouped = visible.reduce<Record<string, typeof visible>>((acc, r) => {
      (acc[r.term] = acc[r.term] || []).push(r);
      return acc;
    }, {});

    const grave = (n: number | null) => (n == null ? "—" : String(n));
    const gradeColor = (g: string | null) => {
      switch (g) {
        case "A": return "#059669";
        case "B": return "#0369a1";
        case "C": return "#d97706";
        case "D": return "#c2410c";
        case "F": return "#e11d48";
        default: return "#475569";
      }
    };

    const termBlocks = Object.entries(grouped)
      .map(
        ([term, arr]) => `
        <h3 style="font-size:14px;font-weight:800;color:#0f172a;margin:18px 0 8px;border-bottom:2px solid #1a2c47;padding-bottom:4px;">${term}</h3>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr style="background:#1a2c47;color:#fff;">
              <th style="padding:7px 10px;text-align:left;">Course</th>
              <th style="padding:7px 10px;text-align:center;">Exam</th>
              <th style="padding:7px 10px;text-align:center;">Assign.</th>
              <th style="padding:7px 10px;text-align:center;">Total</th>
              <th style="padding:7px 10px;text-align:center;">Grade</th>
              <th style="padding:7px 10px;text-align:left;">Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${arr
              .map(
                (r) => `
              <tr style="border-bottom:1px solid #e2e8f0;background:#fff;">
                <td style="padding:7px 10px;font-weight:700;color:#0f172a;">${r.courseName || "General"}</td>
                <td style="padding:7px 10px;text-align:center;">${grave(r.examScore)}</td>
                <td style="padding:7px 10px;text-align:center;">${grave(r.assignmentScore)}</td>
                <td style="padding:7px 10px;text-align:center;font-weight:800;">${grave(r.total)}</td>
                <td style="padding:7px 10px;text-align:center;color:${gradeColor(r.grade)};font-weight:800;">${r.grade || "—"}</td>
                <td style="padding:7px 10px;color:#64748b;">${r.remarks || ""}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>`
      )
      .join("");

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Transcript - ${student.name}</title>
<style>
  @page { margin: 20mm; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 0; }
  .sheet { max-width: 800px; margin: 0 auto; }
  .head { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #1a2c47; padding-bottom: 12px; }
  .brand { font-size: 22px; font-weight: 900; color: #1a2c47; }
  .doc { font-size: 11px; color: #64748b; text-align: right; }
  .title { text-align: center; margin: 18px 0; }
  .title h1 { font-size: 20px; margin: 0; color: #0f172a; }
  .title p { font-size: 11px; color: #64748b; margin: 4px 0 0; }
  .meta { display: inline-block; width: 48%; }
  .meta-row { display: flex; flex-wrap: wrap; gap: 8px 24px; margin: 12px 0; }
  .meta-row div { font-size: 12px; }
  .meta-row span { font-weight: 800; color: #1a2c47; }
  .foot { margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 10px; color: #94a3b8; text-align: center; }
</style>
</head>
<body>
<div class="sheet">
  <div class="head">
    <div class="brand">${orgName || "Judmi Academy"}</div>
    <div class="doc">ACADEMIC TRANSCRIPT<br/>Generated ${new Date().toLocaleDateString()}</div>
  </div>
  <div class="title">
    <h1>${escapeHtml(student.name)}</h1>
    <p>${student.studentId ? "Student ID: " + student.studentId + " · " : ""}${student.departmentId || " "}${student.year ? " · " + student.year : ""}</p>
  </div>
  <div class="meta-row">
    <div>Email: <span>${escapeHtml(student.email)}</span></div>
    ${student.year ? `<div>Level: <span>${student.year}</span></div>` : ""}
    ${student.studentId ? `<div>Matric: <span>${student.studentId}</span></div>` : ""}
  </div>
  ${termBlocks || `<p style="text-align:center;color:#64748b;margin:30px 0;">No published results yet.</p>`}
  <div class="foot">This transcript is generated electronically. For verification contact your school administrator.</div>
</div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="transcript-${student.studentId || student.name
          .trim()
          .replace(/\s+/g, "-")
          .toLowerCase()}.html"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}