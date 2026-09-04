import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { parentLinks, users, results, attendanceRecords, disciplineRecords, invoices, feePayments, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "parent") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const links = await db
      .select()
      .from(parentLinks)
      .where(eq(parentLinks.parentId, user.id));

    const children = [];
    for (const link of links) {
      const studentRows = await db.select().from(users).where(eq(users.id, link.studentId)).limit(1);
      const student = studentRows[0];
      if (!student) continue;

      const resultRows = await db.select().from(results).where(eq(results.studentId, student.id));
      const published = resultRows.filter((r) => r.published === 1);
      const byTerm = published.reduce<Record<string, typeof published>>((acc, r) => {
        (acc[r.term] = acc[r.term] || []).push(r);
        return acc;
      }, {});
      const terms = Object.keys(byTerm).sort();
      const termSummaries = terms.map((term) => {
        const arr = byTerm[term];
        const totals = arr.map((r) => r.total ?? 0);
        const avg = totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : null;
        return { term, avg, count: arr.length };
      });

      const attRows = await db.select().from(attendanceRecords).where(eq(attendanceRecords.studentId, student.id));
      const presentCount = attRows.filter((a) => a.status === "present" || a.status === "late").length;
      const attendancePct = attRows.length ? Math.round((presentCount / attRows.length) * 100) : null;

      const discRows = await db.select().from(disciplineRecords).where(eq(disciplineRecords.studentId, student.id));
      const incidents = discRows.filter((d) => d.type === "incident").length;
      const rewards = discRows.filter((d) => d.type === "reward").length;

      const invoiceRows = await db.select().from(invoices).where(eq(invoices.studentId, student.id));
      const totalInvoiced = invoiceRows.reduce((a, r) => a + (r.amount || 0), 0);
      const paymentRows = await db.select().from(feePayments).where(eq(feePayments.studentId, student.id));
      const totalPaid = paymentRows.reduce((a, r) => a + (r.amount || 0), 0);
      const balanceOutstanding = totalInvoiced - totalPaid;

      const gradeCounts: Record<string, number> = {};
      published.forEach((r) => { if (r.grade) gradeCounts[r.grade] = (gradeCounts[r.grade] || 0) + 1; });

      children.push({
        linkId: link.id,
        relationship: link.relationship,
        student: {
          id: student.id,
          name: student.name,
          studentId: student.studentId,
          year: student.year,
          departmentId: student.departmentId,
          email: student.email,
        },
        terms,
        termSummaries,
        attendancePct,
        conduct: { incidents, rewards },
        fees: { totalInvoiced, totalPaid, balanceOutstanding },
        gradeCounts,
      });
    }

    let orgName = "";
    if (user.orgId) {
      const orgRows = await db.select().from(organizations).where(eq(organizations.id, user.orgId)).limit(1);
      if (orgRows[0]) orgName = orgRows[0].brandName || orgRows[0].name;
    }

    return NextResponse.json({ children, orgName });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
