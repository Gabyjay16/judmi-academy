import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { confirmPayment, voidPayment } from "@/lib/payments";

export async function POST(req: NextRequest) {
  try {
    await initDatabase();

    // Verify webhook origin when a secret is configured on the Fapshi dashboard.
    const secret = process.env.FAPSCHI_WEBHOOK_SECRET;
    if (secret) {
      const header = req.headers.get("x-wh-secret") || "";
      if (header !== secret) {
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
      }
    }

    const body = await req.json();
    const { transId, status, amount } = body;

    console.log("Fapshi webhook received:", { transId, status, amount });

    if (!transId) {
      return NextResponse.json({ error: "Missing transId" }, { status: 400 });
    }

    const rows = await db.select().from(payments).where(eq(payments.transId, transId)).limit(1);
    if (rows.length === 0) {
      // Unknown transaction — acknowledge so Fapshi does not treat this as a failure.
      return NextResponse.json({ received: true, note: "Unknown transaction" });
    }
    const payment = rows[0];

    if (payment.status === "SUCCESSFUL") {
      return NextResponse.json({ received: true, already: true });
    }

    if (status === "SUCCESSFUL") {
      const result = await confirmPayment(payment.id, {
        transId,
        amount: typeof amount === "number" ? amount : undefined,
      });
      if (result.reason === "amount_mismatch") {
        console.error(`Fapshi amount mismatch for ${transId}: expected ${payment.amount}, got ${amount}`);
        return NextResponse.json({ received: true, note: "amount_mismatch" });
      }
    } else if (status === "FAILED" || status === "EXPIRED") {
      await voidPayment(payment.id, status);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Fapshi webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "Fapshi webhook endpoint active.",
    /** Configure this URL as the webhook/notify URL of your Fapshi service. */
    suggestedEnv: ["FAPSCHI_API_USER", "FAPSCHI_API_KEY", "FAPSCHI_WEBHOOK_SECRET"],
  });
}