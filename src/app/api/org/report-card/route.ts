import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { results, users, attendanceRecords, disciplineRecords, organizations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { canViewResults } from "@/lib/results-access";

const STAFF = ["admin", "org_admin", "teacher"];

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isStaff = STAFF.includes(user.role);
    const studentId = isStaff ? (req.nextUrl.searchParams.get("studentId") || user.id) : user.id;
    const targetTerm = req.nextUrl.searchParams.get("term") || undefined;

    const studentRows = await db.select().from(users).where(eq(users.id, studentId)).limit(1);
    const student = studentRows[0];
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    // Results
    let resultRows = await db.select().from(results).where(eq(results.studentId, studentId));
    if (!isStaff) {
      if (!(await canViewResults(user, studentId))) {
        return NextResponse.json({ error: "Results are locked until outstanding fees are cleared or an administrator approves access." }, { status: 403 });
      }
      resultRows = resultRows.filter((r) => r.published === 1);
    }
    if (targetTerm) resultRows = resultRows.filter((r) => r.term === targetTerm);

    // Group by term
    const byTerm = resultRows.reduce<Record<string, typeof resultRows>>((acc, r) => {
      (acc[r.term] = acc[r.term] || []).push(r);
      return acc;
    }, {});

    const terms = Object.keys(byTerm).sort();

    const termSummaries = terms.map((term) => {
      const rows = byTerm[term];
      const totals = rows.map((r) => r.total ?? 0).filter((n) => n != null);
      const avg = totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : null;
      // Class position among students' averages in this term (best effort)
      const gradeCounts: Record<string, number> = {};
      rows.forEach((r) => { if (r.grade) gradeCounts[r.grade] = (gradeCounts[r.grade] || 0) + 1; });
      const remarks = rows.find((r) => r.remarks)?.remarks || "";
      return {
        term,
        courses: rows,
        avg,
        gradeCounts,
        performance: avg == null ? "—" : avg >= 70 ? "Excellent" : avg >= 60 ? "Very Good" : avg >= 50 ? "Good" : avg >= 40 ? "Fair" : "Needs Improvement",
      };
    });

    // Attendance for the target term (or all time if none selected)
    const attRows = await db.select().from(attendanceRecords).where(eq(attendanceRecords.studentId, studentId));
    const attFiltered = targetTerm
      ? attRows // attendance records don't carry term; scope by date within term range if we had it — approximate by all
      : attRows;
    const presentCount = attFiltered.filter((a) => a.status === "present" || a.status === "late").length;
    const attendancePct = attFiltered.length ? Math.round((presentCount / attFiltered.length) * 100) : null;

    // Discipline summary
    const discRows = await db.select().from(disciplineRecords).where(eq(disciplineRecords.studentId, studentId));
    const conduct = {
      incidents: discRows.filter((d) => d.type === "incident").length,
      rewards: discRows.filter((d) => d.type === "reward").length,
      contacts: discRows.filter((d) => d.type === "contact").length,
      majorIncidents: discRows.filter((d) => d.type === "incident" && d.severity === "major").length,
      rating: "Good",
    };
    conduct.rating = conduct.majorIncidents > 0 ? "Needs Improvement" : conduct.incidents === 0 && conduct.rewards > 0 ? "Excellent" : conduct.incidents <= 2 ? "Good" : "Fair";

    // Org name
    let orgName = "";
    if (student.orgId) {
      const orgRows = await db.select().from(organizations).where(eq(organizations.id, student.orgId)).limit(1);
      if (orgRows[0]) orgName = orgRows[0].brandName || orgRows[0].name;
    }

    return NextResponse.json({
      student: {
        name: student.name,
        email: student.email,
        studentId: student.studentId,
        year: student.year,
        departmentId: student.departmentId,
      },
      orgName,
      terms,
      termSummaries,
      attendancePct,
      conduct,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
