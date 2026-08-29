import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { users, passwordResetRequests } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { generateId } from "@/lib/utils";

// 1. Submit a Password Reset Request
export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const body = await req.json();
    const { email, reason = "Forgot password" } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const userRows = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
    if (userRows.length === 0) {
      // Return ambiguous success or clear notice
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, your password reset request has been submitted for administrator approval.",
      });
    }

    const user = userRows[0];
    const requestId = generateId();
    const now = new Date().toISOString();

    await db.insert(passwordResetRequests).values({
      id: requestId,
      userId: user.id,
      email: cleanEmail,
      role: user.role,
      reason: reason ? reason.trim() : "Forgot password",
      status: "pending",
      resetToken: null,
      requestedAt: now,
    });

    return NextResponse.json({
      success: true,
      message: "Your password reset request has been successfully submitted! The system administrator will review and approve your request.",
    });
  } catch (error: any) {
    console.error("Reset request error:", error);
    return NextResponse.json({ error: error.message || "Failed to submit request" }, { status: 500 });
  }
}

// 2. Admin: Get all reset requests
export async function GET() {
  try {
    await initDatabase();
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Admin privileges required." }, { status: 403 });
    }

    const requests = await db
      .select({
        id: passwordResetRequests.id,
        userId: passwordResetRequests.userId,
        email: passwordResetRequests.email,
        role: passwordResetRequests.role,
        reason: passwordResetRequests.reason,
        status: passwordResetRequests.status,
        resetToken: passwordResetRequests.resetToken,
        requestedAt: passwordResetRequests.requestedAt,
        reviewedAt: passwordResetRequests.reviewedAt,
        userName: users.name,
      })
      .from(passwordResetRequests)
      .leftJoin(users, eq(passwordResetRequests.userId, users.id))
      .orderBy(desc(passwordResetRequests.requestedAt));

    return NextResponse.json({ requests });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 3. Admin: Approve or Reject Reset Request
export async function PUT(req: NextRequest) {
  try {
    await initDatabase();
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Admin privileges required." }, { status: 403 });
    }

    const body = await req.json();
    const { requestId, action } = body; // action: 'approve' | 'reject'

    if (!requestId || !action) {
      return NextResponse.json({ error: "Request ID and action are required" }, { status: 400 });
    }

    const reqRows = await db.select().from(passwordResetRequests).where(eq(passwordResetRequests.id, requestId)).limit(1);
    if (reqRows.length === 0) {
      return NextResponse.json({ error: "Reset request not found" }, { status: 404 });
    }

    const now = new Date().toISOString();

    if (action === "approve") {
      const resetToken = `rst_${generateId()}_${Math.random().toString(36).substring(2, 12)}`;
      await db
        .update(passwordResetRequests)
        .set({
          status: "approved",
          resetToken,
          reviewedAt: now,
          reviewedByAdminId: admin.id,
        })
        .where(eq(passwordResetRequests.id, requestId));

      return NextResponse.json({
        success: true,
        status: "approved",
        resetToken,
        resetUrl: `/reset-password?token=${resetToken}`,
        message: "Password reset approved successfully. The authorization token has been generated.",
      });
    }

    if (action === "reject") {
      await db
        .update(passwordResetRequests)
        .set({
          status: "rejected",
          reviewedAt: now,
          reviewedByAdminId: admin.id,
        })
        .where(eq(passwordResetRequests.id, requestId));

      return NextResponse.json({
        success: true,
        status: "rejected",
        message: "Password reset request rejected.",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 4. User: Execute Password Reset with Authorized Token
export async function PATCH(req: NextRequest) {
  try {
    await initDatabase();
    const body = await req.json();
    const { resetToken, newPassword } = body;

    if (!resetToken || !newPassword) {
      return NextResponse.json({ error: "Reset token and new password are required" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const reqRows = await db
      .select()
      .from(passwordResetRequests)
      .where(eq(passwordResetRequests.resetToken, resetToken.trim()))
      .limit(1);

    if (reqRows.length === 0) {
      return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
    }

    const resetReq = reqRows[0];
    if (resetReq.status !== "approved") {
      return NextResponse.json({ error: `This reset request is ${resetReq.status}` }, { status: 400 });
    }

    // Hash new password and update user record
    const passwordHash = await hashPassword(newPassword);
    await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, resetReq.userId));

    // Mark reset token as used
    await db
      .update(passwordResetRequests)
      .set({ status: "used" })
      .where(eq(passwordResetRequests.id, resetReq.id));

    return NextResponse.json({
      success: true,
      message: "Your password has been successfully updated! You can now log in with your new credentials.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
