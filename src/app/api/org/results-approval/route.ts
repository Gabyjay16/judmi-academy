import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { users, invoices } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

const MANAGERS = ["admin", "org_admin"];

interface StudentRow {
  id: string;
  name: string;
  email: string;
  studentId: string | null;
  year: string | null;
  departmentId: string | null;
  resultsApproved: number;
}

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin" && user.role !== "org_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const studentRows = await db
      .select()
      .from(users)
      .where(and(eq(users.orgId, user.orgId), eq(users.role, "student")))
      .orderBy(desc(users.createdAt));

    const invoiceRows = await db.select().from(invoices).where(eq(invoices.orgId, user.orgId));

    const balanceByStudent: Record<string, number> = {};
    for (const inv of invoiceRows) {
      if (inv.status === "paid" || inv.status === "waived") continue;
      balanceByStudent[inv.studentId] = (balanceByStudent[inv.studentId] || 0) + ((inv.amount || 0) - (inv.paidAmount || 0));
    }

    const students: StudentRow[] = studentRows.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      studentId: s.studentId,
      year: s.year,
      departmentId: s.departmentId,
      resultsApproved: s.resultsApproved ?? 0,
    }));

    return NextResponse.json({ students, balanceByStudent });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user || !user.orgId || !MANAGERS.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { studentId, approved } = body;
    if (!studentId) return NextResponse.json({ error: "Student is required." }, { status: 400 });

    const target = await db.select().from(users).where(and(eq(users.id, studentId), eq(users.orgId, user.orgId))).limit(1);
    if (target.length === 0) return NextResponse.json({ error: "Student not found." }, { status: 404 });

    await db
      .update(users)
      .set({ resultsApproved: approved ? 1 : 0 })
      .where(eq(users.id, studentId));

    return NextResponse.json({ success: true, resultsApproved: approved ? 1 : 0 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
