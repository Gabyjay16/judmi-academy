import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser, generateSessionToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { generateId } from "@/lib/utils";
import { priceFor, type PaidPlan, type BillingCycle } from "@/lib/payments";
import { fapshiConfigured, initiateFapshiPayment } from "@/lib/fapshi";

const SESSION_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export async function POST(req: NextRequest) {
  try {
    await initDatabase();

    const headerToken = req.headers.get("x-session-token") || req.headers.get("authorization");
    const user = await getCurrentUser(headerToken);
    if (!user) {
      return NextResponse.json({ error: "Please log in or create an account to subscribe." }, { status: 401 });
    }

    if (!fapshiConfigured()) {
      return NextResponse.json(
        { error: "Online payments are not configured on this deployment yet. Please contact the administrator." },
        { status: 503 }
      );
    }

    const body = await req.json();
    const plan: PaidPlan = body.plan === "school_pro" ? "school_pro" : "individual";
    const cycle: BillingCycle = body.cycle === "yearly" ? "yearly" : "monthly";
    const orgName = body.organizationName ? String(body.organizationName).trim() : null;

    if (plan === "school_pro" && !orgName) {
      return NextResponse.json({ error: "School / institution name is required." }, { status: 400 });
    }

    const amount = priceFor(plan, cycle);
    const paymentId = generateId();
    const now = new Date().toISOString();
    const origin = new URL(req.url).origin;

    await db.insert(payments).values({
      id: paymentId,
      userId: user.id,
      email: user.email,
      plan,
      cycle,
      amount,
      status: "CREATED",
      metaJson: JSON.stringify({ orgName, role: plan === "school_pro" ? "org_admin" : "teacher", name: user.name }),
      createdAt: now,
      updatedAt: now,
    });

    let fapshi: { link: string; transId: string };
    try {
      fapshi = await initiateFapshiPayment({
        amount,
        email: user.email,
        userId: user.id,
        externalId: paymentId,
        redirectUrl: `${origin}/checkout?pay=${paymentId}`,
        message: `Judmi Academy ${plan} subscription (${cycle})`,
      });
    } catch (err: any) {
      await db
        .update(payments)
        .set({ status: "FAILED", updatedAt: new Date().toISOString() })
        .where(eq(payments.id, paymentId));
      return NextResponse.json({ error: err.message || "Could not generate payment link." }, { status: 502 });
    }

    await db
      .update(payments)
      .set({ transId: fapshi.transId, status: "PENDING", updatedAt: new Date().toISOString() })
      .where(eq(payments.id, paymentId));

    const token = generateSessionToken(user.id);
    const response = NextResponse.json({
      success: true,
      link: fapshi.link,
      transId: fapshi.transId,
      paymentId,
    });
    response.cookies.set(AUTH_COOKIE_NAME, token, {
      path: "/",
      httpOnly: true,
      maxAge: SESSION_MAX_AGE,
      sameSite: "lax",
    });
    return response;
  } catch (error: any) {
    console.error("Payment initiate error:", error);
    return NextResponse.json({ error: error.message || "Payment initiation failed." }, { status: 500 });
  }
}