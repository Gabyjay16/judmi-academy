import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { users, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const body = await req.json();

    // Fapshi payload details: { transId, status: "SUCCESSFUL" | "FAILED", amount, externalId, userId }
    const { status, externalId, userId, amount } = body;

    console.log("Fapshi Webhook Received:", { status, externalId, userId, amount });

    if (status === "SUCCESSFUL" || status === "COMPLETED") {
      // If externalId or userId corresponds to a user ID or email
      if (userId) {
        // Upgrade user plan
        await db.update(users).set({
          planType: amount >= 60000 ? "school_pro" : "individual",
        }).where(eq(users.id, userId));
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Fapshi webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "Fapshi webhook endpoint active and ready." });
}
