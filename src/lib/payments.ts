import { db } from "@/db";
import { users, organizations, payments, type Payment } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";

// Prices in XAF — keep in sync with the checkout page display.
export const PRICING = {
  individual: { monthly: 5000, yearly: 36000 },
  school_pro: { monthly: 25000, yearly: 236000 },
} as const;

export type PaidPlan = keyof typeof PRICING;
export type BillingCycle = "monthly" | "yearly";

export function priceFor(plan: PaidPlan, cycle: BillingCycle): number {
  return PRICING[plan][cycle];
}

export function roleForPlan(plan: PaidPlan): string {
  return plan === "school_pro" ? "org_admin" : "teacher";
}

/**
 * Grant the paid plan after Fapshi confirms SUCCESSFUL. Idempotent — a payment
 * that is already SUCCESSFUL is never re-applied, and repeated calls converge.
 */
export async function applyPaidPlan(payment: Payment): Promise<void> {
  const existing = await db.select().from(payments).where(eq(payments.id, payment.id)).limit(1);
  if (existing.length === 0) return;
  if (existing[0].status === "SUCCESSFUL") return;

  if (!payment.userId) return;

  const userRows = await db.select().from(users).where(eq(users.id, payment.userId)).limit(1);
  if (userRows.length === 0) return;
  const user = userRows[0];

  let orgId = user.orgId;

  if (payment.plan === "school_pro") {
    let meta: { orgName?: string } = {};
    try {
      meta = payment.metaJson ? JSON.parse(payment.metaJson) : {};
    } catch {}
    if (!orgId) {
      const orgName = (meta.orgName || user.name || user.email).toString().trim();
      orgId = generateId();
      const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "school";
      await db.insert(organizations).values({
        id: orgId,
        name: orgName,
        slug: `${slug}-${Math.floor(Math.random() * 899 + 100)}`,
        planType: "school_pro",
        seatLimit: 50,
        ownerEmail: user.email,
        status: "active",
        createdAt: new Date().toISOString(),
      });
    } else {
      await db.update(organizations).set({ planType: "school_pro" }).where(eq(organizations.id, orgId!));
    }
  }

  await db
    .update(users)
    .set({
      planType: payment.plan,
      role: roleForPlan(payment.plan as PaidPlan) as any,
      orgId: orgId ?? null,
    })
    .where(eq(users.id, payment.userId));
}

/**
 * Mark a payment SUCCESSFUL and grant the plan. Verifies the reported amount
 * matches the expected price before granting (never trusts a webhook blindly).
 */
export async function confirmPayment(
  paymentId: string,
  opts: { transId?: string; amount?: number }
): Promise<{ ok: boolean; already?: boolean; reason?: string }> {
  const rows = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  if (rows.length === 0) return { ok: false, reason: "not_found" };
  const payment = rows[0];
  if (payment.status === "SUCCESSFUL") return { ok: true, already: true };

  if (opts.amount != null && opts.amount !== payment.amount) {
    return { ok: false, reason: "amount_mismatch" };
  }

  const now = new Date().toISOString();
  await db
    .update(payments)
    .set({ status: "SUCCESSFUL", transId: opts.transId || payment.transId, updatedAt: now })
    .where(eq(payments.id, paymentId));

  await applyPaidPlan({ ...payment, status: "SUCCESSFUL" });
  return { ok: true };
}

export async function voidPayment(
  paymentId: string,
  status: "FAILED" | "EXPIRED"
): Promise<void> {
  await db
    .update(payments)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(eq(payments.id, paymentId));
}