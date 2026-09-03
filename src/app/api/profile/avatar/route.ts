import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

// POST /api/profile/avatar — set the user's profile picture (used in the
// forum). Accepts a compressed base64 data URL (image/jpeg|png|webp).
export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { avatarUrl } = body;

    if (!avatarUrl || typeof avatarUrl !== "string" || !avatarUrl.startsWith("data:image/")) {
      return NextResponse.json({ error: "Invalid image. Upload a JPEG, PNG or WebP image." }, { status: 400 });
    }

    // Approx size guard (~4MB base64)
    if (avatarUrl.length > 5 * 1024 * 1024 * 1.34) {
      return NextResponse.json({ error: "Image is too large." }, { status: 400 });
    }

    await db.update(users).set({ avatarUrl }).where(eq(users.id, user.id));

    return NextResponse.json({ success: true, avatarUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
