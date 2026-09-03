import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { generateId } from "@/lib/utils";
import { fapshiConfigured, initiateFapshiPayment } from "@/lib/fapshi";

const PLAGIARISM_PRICE = 5000;

// Start a Fapshi payment for the student Plagiarism & Authenticity Checker
// (used when the global payment mode is "fapshi"). Access is granted
// automatically once the webhook/status confirms SUCCESSFUL.
export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const headerToken = req.headers.get("x-session-token") || req.headers.get("authorization");
    const user = await getCurrentUser(headerToken);
    if (!user) {
      return NextResponse.json({ error: "Please log in to buy plagiarism access." }, { status: 401 });
    }

    if (!fapshiConfigured()) {
      return NextResponse.json(
        { error: "Online payments are not configured on this deployment yet. Please contact the administrator." },
        { status: 503 }
      );
    }

    const paymentId = generateId();
    const now = new Date().toISOString();
    const origin = new URL(req.url).origin;

    await db.insert(payments).values({
      id: paymentId,
      userId: user.id,
      email: user.email,
      plan: "plagiarism",
      cycle: "once",
      amount: PLAGIARISM_PRICE,
      status: "CREATED",
      metaJson: JSON.stringify({ role: user.role, name: user.name }),
      createdAt: now,
      updatedAt: now,
    });

    let fapshi: { link: string; transId: string };
    try {
      fapshi = await initiateFapshiPayment({
        amount: PLAGIARISM_PRICE,
        email: user.email,
        userId: user.id,
        externalId: paymentId,
        redirectUrl: `${origin}/student/plagiarism?pay=${paymentId}`,
        message: "Judmi Academy Plagiarism & Authenticity Checker",
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

    return NextResponse.json({
      success: true,
      link: fapshi.link,
      transId: fapshi.transId,
      paymentId,
    });
  } catch (error: any) {
    console.error("Plagiarism payment initiate error:", error);
    return NextResponse.json({ error: error.message || "Payment initiation failed." }, { status: 500 });
  }
}
