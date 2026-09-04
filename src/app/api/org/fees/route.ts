import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { feeStructures, invoices, feePayments } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { generateId } from "@/lib/utils";

const STAFF = ["admin", "org_admin", "teacher"];

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    if (user.role === "student") {
      const invo = await db
        .select()
        .from(invoices)
        .where(and(eq(invoices.orgId, user.orgId), eq(invoices.studentId, user.id)))
        .orderBy(desc(invoices.createdAt));
      return NextResponse.json({ invoices: invo });
    }

    if (!STAFF.includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const [fees, invo, pays] = await Promise.all([
      db.select().from(feeStructures).where(eq(feeStructures.orgId, user.orgId)).orderBy(desc(feeStructures.createdAt)),
      db.select().from(invoices).where(eq(invoices.orgId, user.orgId)).orderBy(desc(invoices.createdAt)),
      db.select().from(feePayments).where(eq(feePayments.orgId, user.orgId)).orderBy(desc(feePayments.paidAt)),
    ]);

    return NextResponse.json({ feeStructures: fees, invoices: invo, payments: pays });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });
    if (!STAFF.includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { action } = body;
    const now = new Date().toISOString();

    // Create a fee structure
    if (action === "fee_structure") {
      const { name, amount, departmentId, programId, year, period, description, mandatory } = body;
      if (!name?.trim() || !amount) return NextResponse.json({ error: "Name and amount are required." }, { status: 400 });
      const id = generateId();
      await db.insert(feeStructures).values({
        id,
        orgId: user.orgId,
        name: name.trim(),
        amount: Number(amount),
        departmentId: departmentId || null,
        programId: programId || null,
        year: year || null,
        period: period || null,
        description: description?.trim() || null,
        mandatory: mandatory === false ? 0 : 1,
        createdAt: now,
      });
      return NextResponse.json({ success: true, id });
    }

    // Generate an invoice for a student
    if (action === "invoice") {
      const { studentId, studentName, feeStructureId, feeName, amount, description, dueDate } = body;
      if (!studentId || !amount) return NextResponse.json({ error: "Student and amount are required." }, { status: 400 });
      const id = generateId();
      await db.insert(invoices).values({
        id,
        orgId: user.orgId,
        studentId,
        studentName: studentName?.trim() || null,
        feeStructureId: feeStructureId || null,
        feeName: feeName?.trim() || null,
        description: description?.trim() || null,
        amount: Number(amount),
        paidAmount: 0,
        status: "unpaid",
        dueDate: dueDate || null,
        createdBy: user.id,
        createdAt: now,
      });
      return NextResponse.json({ success: true, id });
    }

    // Record a payment against an invoice
    if (action === "payment") {
      const { invoiceId, studentId, childAmount, method, reference, note } = body;
      if (!invoiceId || !childAmount) return NextResponse.json({ error: "Invoice and amount are required." }, { status: 400 });
      const paidAmt = Number(childAmount);

      const existing = await db
        .select()
        .from(invoices)
        .where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, user.orgId)))
        .limit(1);
      if (existing.length === 0) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

      const inv = existing[0];
      const newPaid = (inv.paidAmount || 0) + paidAmt;
      const status = newPaid >= inv.amount ? "paid" : newPaid > 0 ? "partial" : "unpaid";

      await db.insert(feePayments).values({
        id: generateId(),
        orgId: user.orgId,
        invoiceId,
        studentId: studentId || inv.studentId,
        amount: paidAmt,
        method: method || "cash",
        reference: reference?.trim() || null,
        note: note?.trim() || null,
        recordedBy: user.id,
        paidAt: now,
        createdAt: now,
      });

      await db
        .update(invoices)
        .set({ paidAmount: newPaid, status })
        .where(eq(invoices.id, invoiceId));

      return NextResponse.json({ success: true, status });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.orgId || !STAFF.includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { id, status, amount, paidAmount } = body;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const patch: any = {};
    if (status) patch.status = status;
    if (amount) patch.amount = Number(amount);
    if (paidAmount !== undefined && paidAmount !== null) patch.paidAmount = Number(paidAmount);

    if (Object.keys(patch).length > 0) {
      await db.update(invoices).set(patch).where(and(eq(invoices.id, id), eq(invoices.orgId, user.orgId!)));
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin" && user.role !== "org_admin") return NextResponse.json({ error: "Only administrators." }, { status: 403 });

    const body = await req.json();
    const { id, kind } = body;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    if (kind === "fee_structure") {
      await db.delete(feeStructures).where(and(eq(feeStructures.id, id), eq(feeStructures.orgId, user.orgId!)));
    } else {
      await db.delete(invoices).where(and(eq(invoices.id, id), eq(invoices.orgId, user.orgId!)));
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
