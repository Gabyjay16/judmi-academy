import { db } from "@/db";
import { users, organizations, manualPayments, systemSettings, type ManualPayment } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { priceFor, roleForPlan, type PaidPlan, type BillingCycle } from "@/lib/payments";

// Manual (offline) payment method. Users pay directly to a Mobile Money number,
// upload the payment screenshot, and an administrator verifies it before
// granting access. When the global payment mode is "manual", this method is
// used across the WHOLE system (plagiarism feature AND plan subscriptions).
export const MANUAL_PAYMENT_METHOD = {
  operator: "MTN Mobile Money",
  phone: "681597837",
  accountName: "Brandon Judmi",
} as const;

// Price (XAF) a user must pay to unlock each manual-payment feature. Plan keys
// match the subscription plans — the monthly/annual price comes from PRICING.
export const MANUAL_FEATURE_PRICES: Record<string, number> = {
  plagiarism: 5000,
} as const;

export const MANUAL_PLAN_KEYS: PaidPlan[] = ["individual", "school_pro"];

export const MANUAL_FEATURE_LABELS: Record<string, string> = {
  plagiarism: "Plagiarism & Authenticity Checker",
  individual: "Individual Teacher Pro Plan",
  school_pro: "School / Organization Pro Plan",
} as const;

/**
 * Price (XAF) for a manual payment request:
 * - gated features use MANUAL_FEATURE_PRICES (e.g. plagiarism = 5000)
 * - plan purchases (individual/school_pro) use the subscription PRICING, with
 *   the billing cycle taken from meta.
 */
export function manualPriceFor(feature: string, meta?: { cycle?: string }): number {
  const fixed = MANUAL_FEATURE_PRICES[feature];
  if (fixed != null) return fixed;
  if (MANUAL_PLAN_KEYS.includes(feature as PaidPlan)) {
    const cycle: BillingCycle = meta?.cycle === "yearly" ? "yearly" : "monthly";
    return priceFor(feature as PaidPlan, cycle);
  }
  return 0;
}

export function manualFeatureLabel(feature: string): string {
  return MANUAL_FEATURE_LABELS[feature] ?? feature;
}

/**
 * Check whether a user can use a manual-payment-gated feature:
 * - admins always may
 * - otherwise they must have the granted access flag for the feature
 */
export function hasManualFeatureAccess(
  user: { role: string; plagiarismAccess?: number | null } | null,
  feature: string
): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (feature === "plagiarism") return user.plagiarismAccess === 1;
  return false;
}

/**
 * Fetch the user's latest manual payment request for a feature, if any.
 */
export async function getLatestManualPayment(
  userId: string,
  feature: string
): Promise<ManualPayment | null> {
  try {
    const rows = await db
      .select()
      .from(manualPayments)
      .where(eq(manualPayments.userId, userId))
      .limit(20);
    const featureRows = rows.filter((r) => r.feature === feature);
    if (featureRows.length === 0) return null;
    return featureRows[0];
  } catch {
    return null;
  }
}

/**
 * Grant manual payment access to a user. Currently supports:
 * - plagiarism → sets plagiarismAccess = 1
 * - individual / school_pro plans → grants the paid plan (+ org when school_pro)
 * Request meta (cycle, orgName) is passed through for plan purchases.
 */
export async function grantManualFeatureAccess(
  userId: string,
  feature: string,
  meta?: { cycle?: string; orgName?: string } | null
): Promise<void> {
  if (feature === "plagiarism") {
    await db.update(users).set({ plagiarismAccess: 1 }).where(eq(users.id, userId));
    return;
  }
  if (feature === "individual" || feature === "school_pro") {
    const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (userRows.length === 0) return;
    const user = userRows[0];

    let orgId = user.orgId;
    if (feature === "school_pro") {
      if (!orgId) {
        const orgName = (meta?.orgName || user.name || user.email || "School").toString().trim();
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
        planType: feature,
        role: roleForPlan(feature as PaidPlan) as any,
        orgId: orgId ?? null,
      })
      .where(eq(users.id, userId));
  }
}

/**
 * Fetch the global payment mode from system settings.
 * Returns "fapshi" (online checkout) or "manual" (Mobile Money + screenshot).
 * Defaults to "fapshi" (the historical behaviour).
 */
export async function getPaymentMode(): Promise<"fapshi" | "manual"> {
  try {
    const rows = await db.select().from(systemSettings).where(eq(systemSettings.key, "payment_mode")).limit(1);
    const value = rows[0]?.value;
    return value === "manual" ? "manual" : "fapshi";
  } catch {
    return "fapshi";
  }
}
