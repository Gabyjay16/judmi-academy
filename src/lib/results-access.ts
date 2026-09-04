import { db, initDatabase } from "@/db";
import { invoices, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import type { User } from "@/db/schema";

const STAFF = ["admin", "org_admin", "teacher"];

/**
 * Determine whether a subject (a student) may view their results.
 *
 * Results are gated on fees: a student can only see results when they have no
 * outstanding balance on their invoices OR an admin has granted an override
 * (users.resultsApproved = 1). Staff always have access.
 *
 * @param requester the authenticated user (staff, student, or parent)
 * @param studentId the student whose results are being requested (optional; defaults
 *        to the requester if they are a student, required when requester is a parent)
 */
export async function canViewResults(requester: User, studentId?: string): Promise<boolean> {
  if (STAFF.includes(requester.role)) return true;
  if (requester.role !== "student" && requester.role !== "parent") return true;

  const subjectId =
    requester.role === "student" ? requester.id : studentId || requester.id;
  if (!subjectId) return true;

  // Fetch the subject's admin-override flag (parents check their linked student).
  const subjectRows = await db.select().from(users).where(eq(users.id, subjectId)).limit(1);
  const subject = subjectRows[0];
  if (subject && subject.resultsApproved === 1) return true;

  return studentHasNoBalance(subjectId);
}

/** True when a student has no outstanding balance on their invoices. */
export async function studentHasNoBalance(studentId: string): Promise<boolean> {
  try {
    await initDatabase();
    const rows = await db.select().from(invoices).where(eq(invoices.studentId, studentId));
    if (rows.length === 0) return true; // no invoices => nothing owed
    let outstanding = 0;
    for (const inv of rows) {
      if (inv.status === "paid" || inv.status === "waived") continue;
      outstanding += (inv.amount || 0) - (inv.paidAmount || 0);
    }
    return outstanding <= 0;
  } catch {
    return false;
  }
}
