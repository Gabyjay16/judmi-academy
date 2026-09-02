import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { confirmPayment, voidPayment, type PaidPlan } from "@/lib/payments";
import { getFapshiPaymentStatus, fapshiConfigured } from "@/lib/fapshi";

// Reconcile against Fapshi at most once per 45s per payment (their rate limit
// is 6 requests/min per transaction id) — the webhook is the primary trigger.
const RECONCILE_INTERVAL_MS = 45000;

const FINAL_STATUSES = ["SUCCESSFUL", "FAILED", "EXPIRED"] as const;

export async function GET(req: NextRequest) {
  try {
    await initDatabase();

    const headerToken = req.headers.get("x-session-token") || req.headers.get("authorization");
    const user = await getCurrentUser(headerToken);
    if (!user) {
      return NextResponse.json({ error: "Please log in to check your payment." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const paymentId = searchParams.get("paymentId") || searchParams.get("pay");
    const transIdParam = searchParams.get("transId");
    if (!paymentId && !transIdParam) {
      return NextResponse.json({ error: "Missing payment identifier." }, { status: 400 });
    }

    const rows = paymentId
      ? await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1)
      : await db.select().from(payments).where(eq(payments.transId, transIdParam!)).limit(1);
    if (rows.length === 0) {
      return NextResponse.json({ error: "Payment not found." }, { status: 404 });
    }
    const payment = rows[0];
    if (payment.userId && payment.userId !== user.id) {
      return NextResponse.json({ error: "You do not have access to this payment." }, { status: 403 });
    }

    let status = payment.status;
    const isFinal = (FINAL_STATUSES as readonly string[]).includes(status);

    if (!isFinal && fapshiConfigured() && payment.transId) {
      const age = Date.now() - new Date(payment.updatedAt).getTime();
      if (age >= RECONCILE_INTERVAL_MS) {
        try {
          const remote = await getFapshiPaymentStatus(payment.transId);
          if (remote === "SUCCESSFUL") {
            await confirmPayment(payment.id, { transId: payment.transId, amount: payment.amount });
            status = "SUCCESSFUL";
          } else if (remote === "FAILED" || remote === "EXPIRED") {
            await voidPayment(payment.id, remote);
            status = remote;
          } else if (remote === "PENDING" || remote === "CREATED") {
            await db
              .update(payments)
              .set({ status: remote, updatedAt: new Date().toISOString() })
              .where(eq(payments.id, payment.id));
          }
        } catch {}
      }
    }

    const redirectTo = (payment.plan as PaidPlan) === "school_pro" ? "/org/dashboard" : "/dashboard";

    return NextResponse.json({
      success: true,
      status,
      plan: payment.plan,
      redirectTo,
    });
  } catch (error: any) {
    console.error("Payment status error:", error);
    return NextResponse.json({ error: error.message || "Payment status check failed." }, { status: 500 });
  }
}