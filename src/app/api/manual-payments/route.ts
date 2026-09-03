import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { manualPayments } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { generateId } from "@/lib/utils";
import { manualPriceFor, MANUAL_FEATURE_LABELS, MANUAL_FEATURE_PRICES } from "@/lib/manual-payments";

const MAX_SCREENSHOT_BYTES = 3 * 1024 * 1024; // ~3MB (data URL decoded)

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const feature = String(body?.feature || "").trim();
    const amount = Number(body?.amount);
    const phone = String(body?.phone || "").trim();
    const operator = String(body?.operator || "").trim() || "MTN Mobile Money";
    const screenshotUrl = String(body?.screenshotUrl || "");
    const screenshotName = String(body?.screenshotName || "").trim();
    const note = String(body?.note || "").trim();

    // Validate feature is a manual-payment-gated one with a defined price.
    const expected = manualPriceFor(feature);
    if (!MANUAL_FEATURE_PRICES[feature] || expected <= 0) {
      return NextResponse.json({ error: "Invalid payment feature." }, { status: 400 });
    }
    if (amount !== expected) {
      return NextResponse.json(
        { error: `The amount must be exactly ${expected.toLocaleString()} FCFA.` },
        { status: 400 }
      );
    }
    if (!screenshotUrl || !screenshotUrl.startsWith("data:image/")) {
      return NextResponse.json({ error: "Please upload a payment screenshot (image)." }, { status: 400 });
    }
    // Rough decoded-size guard to protect the DB (base64 → ~75% of string length).
    const approxBytes = Math.round((screenshotUrl.length * 3) / 4);
    if (approxBytes > MAX_SCREENSHOT_BYTES) {
      return NextResponse.json(
        { error: "That screenshot is too large. Please upload a smaller image." },
        { status: 400 }
      );
    }

    // Reject repeat submissions: the user already has a pending request for this feature.
    const existing = await db
      .select()
      .from(manualPayments)
      .where(eq(manualPayments.userId, currentUser.id));
    const pending = existing.find((r) => r.feature === feature && r.status === "pending");
    if (pending) {
      return NextResponse.json(
        { error: "You already have a payment request awaiting admin approval. Please wait." },
        { status: 409 }
      );
    }

    const id = generateId();
    const now = new Date().toISOString();
    await db.insert(manualPayments).values({
      id,
      userId: currentUser.id,
      email: currentUser.email,
      name: currentUser.name,
      feature,
      amount: expected,
      phone,
      operator,
      screenshotUrl,
      screenshotName: screenshotName || "payment.png",
      note,
      status: "pending",
      createdAt: now,
    });

    return NextResponse.json({
      success: true,
      id,
      label: MANUAL_FEATURE_LABELS[feature] || feature,
      status: "pending",
    });
  } catch (error: any) {
    console.error("Manual payment submission error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to submit your payment request. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    // Admins list all pending/history requests; everyone else sees their own.
    const isAdmin = currentUser.role === "admin";
    const rows = await db
      .select()
      .from(manualPayments)
      .orderBy(desc(manualPayments.createdAt));

    const filtered = isAdmin
      ? rows
      : rows.filter((r) => r.userId === currentUser.id);

    const result = filtered.map((r) => ({
      id: r.id,
      userId: r.userId,
      email: r.email,
      name: r.name,
      feature: r.feature,
      label: MANUAL_FEATURE_LABELS[r.feature] || r.feature,
      amount: r.amount,
      phone: r.phone,
      operator: r.operator,
      screenshotUrl: r.screenshotUrl,
      screenshotName: r.screenshotName,
      note: r.note,
      status: r.status,
      createdAt: r.createdAt,
      reviewedAt: r.reviewedAt,
    }));

    return NextResponse.json({ requests: result });
  } catch (error: any) {
    console.error("List manual payments error:", error);
    return NextResponse.json({ error: "Failed to load payment requests." }, { status: 500 });
  }
}
