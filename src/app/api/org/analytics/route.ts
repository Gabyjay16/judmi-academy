import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { users, attendanceRecords, results, invoices, feePayments, exams, courses, enrollments, libraryBooks, libraryLoans, disciplineRecords } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

const STAFF = ["admin", "org_admin", "teacher"];

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });
    if (!STAFF.includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const orgId = user.orgId;

    const [studentRows, attendance, resultRows, invoiceRows, payRows, examRows, courseRows, enrollmentRows, bookRows, loanRows, discRows] = await Promise.all([
      db.select().from(users).where(and(eq(users.orgId, orgId), eq(users.role, "student"))),
      db.select().from(attendanceRecords).where(eq(attendanceRecords.orgId, orgId)),
      db.select().from(results).where(eq(results.orgId, orgId)),
      db.select().from(invoices).where(eq(invoices.orgId, orgId)),
      db.select().from(feePayments).where(eq(feePayments.orgId, orgId)),
      db.select().from(exams).where(eq(exams.orgId, orgId)),
      db.select().from(courses).where(eq(courses.orgId, orgId)),
      db.select().from(enrollments).where(eq(enrollments.orgId, orgId)),
      db.select().from(libraryBooks).where(eq(libraryBooks.orgId, orgId)),
      db.select().from(libraryLoans).where(eq(libraryLoans.orgId, orgId)),
      db.select().from(disciplineRecords).where(eq(disciplineRecords.orgId, orgId)),
    ]);

    // Attendance
    const present = attendance.filter((a) => a.status === "present" || a.status === "late" || a.status === "excused").length;
    const attendancePct = attendance.length ? Math.round((present / attendance.length) * 100) : 0;

    // Grade distribution
    const gradeCounts = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    resultRows.forEach((r) => { if (r.grade && gradeCounts[r.grade as keyof typeof gradeCounts] !== undefined) gradeCounts[r.grade as keyof typeof gradeCounts]++; });
    const avgTotal = resultRows.length ? Math.round(resultRows.reduce((s, r) => s + (r.total || 0), 0) / resultRows.length) : 0;

    // Fees
    const totalBilled = invoiceRows.reduce((s, i) => s + (i.amount || 0), 0);
    const totalCollected = payRows.reduce((s, p) => s + (p.amount || 0), 0);
    const outstanding = Math.max(0, totalBilled - totalCollected);

    // Enrollment
    const teachers = (await db.select().from(users).where(and(eq(users.orgId, orgId), eq(users.role, "teacher")))).length;

    // library
    const borrowed = loanRows.filter((l) => l.status !== "returned").length;

    // Discipline
    const incidents = discRows.filter((d) => d.type === "incident").length;
    const rewards = discRows.filter((d) => d.type === "reward").length;

    // By-year attendance + results for trend
    const byYear: Record<string, { students: number; attendancePct: number; avgTotal: number }> = {};
    for (const s of studentRows) {
      const y = s.year || "Unassigned";
      byYear[y] = byYear[y] || { students: 0, attendancePct: 0, avgTotal: 0 };
      byYear[y].students++;
    }
    // per-year attendance
    for (const y of Object.keys(byYear)) {
      const yearStudents = new Set(studentRows.filter((s) => (s.year || "Unassigned") === y).map((s) => s.id));
      const recs = attendance.filter((a) => yearStudents.has(a.studentId));
      const pres = recs.filter((a) => a.status === "present" || a.status === "late" || a.status === "excused").length;
      byYear[y].attendancePct = recs.length ? Math.round((pres / recs.length) * 100) : 0;
    }

    return NextResponse.json({
      overview: {
        students: studentRows.length,
        teachers,
        courses: courseRows.length,
        exams: examRows.length,
        enrollments: enrollmentRows.length,
        books: bookRows.length,
        borrowed,
        incidents,
        rewards,
        attendanceRecords: attendance.length,
        results: resultRows.length,
        invoices: invoiceRows.length,
      },
      attendance: { percent: attendancePct, records: attendance.length, present },
      grades: gradeCounts,
      avgTotal,
      fees: { billed: totalBilled, collected: totalCollected, outstanding, payments: payRows.length },
      byYear,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
