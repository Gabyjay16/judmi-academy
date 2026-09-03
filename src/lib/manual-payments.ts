import { db } from "@/db";
import { users, manualPayments, type ManualPayment } from "@/db/schema";
import { eq } from "drizzle-orm";

// Manual (offline) payment methods and per-feature pricing. Users pay directly
// to a Mobile Money number, upload the payment screenshot, and an administrator
// verifies it before granting access.
export const MANUAL_PAYMENT_METHOD = {
  operator: "MTN Mobile Money",
  phone: "681597837",
  accountName: "Brandon Judmi",
} as const;

// Price (XAF) a user must pay to unlock each manual-payment-gated feature.
export const MANUAL_FEATURE_PRICES: Record<string, number> = {
  plagiarism: 5000,
} as const;

export const MANUAL_FEATURE_LABELS: Record<string, string> = {
  plagiarism: "Plagiarism & Authenticity Checker",
} as const;

export function manualPriceFor(feature: string): number {
  return MANUAL_FEATURE_PRICES[feature] ?? 0;
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
 * Grant manual feature access to a user. Currently only plagiarism is gated.
 */
export async function grantManualFeatureAccess(userId: string, feature: string): Promise<void> {
  if (feature === "plagiarism") {
    await db.update(users).set({ plagiarismAccess: 1 }).where(eq(users.id, userId));
  }
}
