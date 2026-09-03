import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { manualPayments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { grantManualFeatureAccess } from "@/lib/manual-payments";

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const status = String(body?.status || "");

    if (status !== "approved" && status !== "rejected") {
      return NextResponse.json({ error: "Invalid status. Use approved or rejected." }, { status: 400 });
    }

    const rows = await db.select().from(manualPayments).where(eq(manualPayments.id, id)).limit(1);
    if (rows.length === 0) {
      return NextResponse.json({ error: "Payment request not found." }, { status: 404 });
    }
    const request = rows[0];
    if (request.status !== "pending") {
      return NextResponse.json(
        { error: "This request has already been reviewed." },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    await db
      .update(manualPayments)
      .set({
        status,
        reviewedAt: now,
        reviewedByAdminId: currentUser.id,
      })
      .where(eq(manualPayments.id, id));

    // Grant the feature only when the payment is approved.
    if (status === "approved" && request.userId) {
      await grantManualFeatureAccess(request.userId, request.feature);
    }

    return NextResponse.json({ success: true, status });
  } catch (error: any) {
    console.error("Manual payment review error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to review the payment request." },
      { status: 500 }
    );
  }
}
