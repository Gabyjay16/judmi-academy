import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { results, users, departments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    const orgId = user.orgId;

    // Gather all results for the org, plus all students and their departments
    const allResults = await db.select().from(results).where(eq(results.orgId, orgId));
    const students = await db.select().from(users).where(eq(users.orgId, orgId));

    const studentDept: Record<string, string | null> = {};
    students.forEach((s) => { studentDept[s.id] = s.departmentId || null; });

    let deptRows: any[] = [];
    try { deptRows = await db.select().from(departments); } catch {}
    const deptName: Record<string, string> = {};
    deptRows.forEach((d: any) => { deptName[d.id] = d.name || d.title || "Department"; });

    // --- By course ---
    const byCourse: Record<string, { name: string; totals: number[]; grades: Record<string, number>; count: number }> = {};
    allResults.forEach((r) => {
      const key = r.courseName || "General";
      const agg = (byCourse[key] = byCourse[key] || { name: key, totals: [], grades: {}, count: 0 });
      if (r.total != null) agg.totals.push(r.total);
      if (r.grade) agg.grades[r.grade] = (agg.grades[r.grade] || 0) + 1;
      agg.count += 1;
    });
    const courseStats = Object.values(byCourse).map((c) => {
      const total = c.totals.length ? Math.round(c.totals.reduce((a, b) => a + b, 0) / c.totals.length) : null;
      const passed = c.totals.filter((t) => t >= 50).length;
      return {
        name: c.name,
        count: c.count,
        avg: total,
        passRate: c.totals.length ? Math.round((passed / c.totals.length) * 100) : null,
        gradeCounts: c.grades,
      };
    }).sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));

    // --- By department ---
    const byDept: Record<string, { name: string; totals: number[]; count: number }> = {};
    allResults.forEach((r) => {
      const dept = studentDept[r.studentId] || "Unassigned";
      const d = (byDept[dept] = byDept[dept] || { name: deptName[dept] || (dept === "Unassigned" ? "Unassigned" : dept), totals: [], count: 0 });
      if (r.total != null) d.totals.push(r.total);
      d.count += 1;
    });
    const deptStats = Object.values(byDept).map((d) => ({
      name: d.name,
      count: d.count,
      avg: d.totals.length ? Math.round(d.totals.reduce((a, b) => a + b, 0) / d.totals.length) : null,
    })).sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));

    // --- Overall grade distribution + aggregate ---
    const gradeDistribution: Record<string, number> = {};
    let allTotals: number[] = [];
    allResults.forEach((r) => {
      if (r.grade) gradeDistribution[r.grade] = (gradeDistribution[r.grade] || 0) + 1;
      if (r.total != null) allTotals.push(r.total);
    });
    const overallAvg = allTotals.length ? Math.round(allTotals.reduce((a, b) => a + b, 0) / allTotals.length) : null;
    const overallPassRate = allTotals.length ? Math.round((allTotals.filter((t) => t >= 50).length / allTotals.length) * 100) : null;
    const totalAssessments = allResults.length;

    // --- Class performance (by year/level if available) ---
    const studentYear: Record<string, string | null> = {};
    students.forEach((s) => { studentYear[s.id] = s.year || null; });
    const byLevel: Record<string, { name: string; totals: number[]; count: number }> = {};
    allResults.forEach((r) => {
      const lvl = studentYear[r.studentId] || "Unassigned";
      const d = (byLevel[lvl] = byLevel[lvl] || { name: lvl, totals: [], count: 0 });
      if (r.total != null) d.totals.push(r.total);
      d.count += 1;
    });
    const levelStats = Object.values(byLevel).map((d) => ({
      name: d.name,
      count: d.count,
      avg: d.totals.length ? Math.round(d.totals.reduce((a, b) => a + b, 0) / d.totals.length) : null,
    })).sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));

    const order = ["A", "B", "C", "D", "F"];
    const distribution = order.map((g) => ({ grade: g, count: gradeDistribution[g] || 0 }));

    return NextResponse.json({
      overview: { overallAvg, overallPassRate, totalAssessments },
      gradeDistribution: distribution,
      courseStats,
      deptStats,
      levelStats,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
