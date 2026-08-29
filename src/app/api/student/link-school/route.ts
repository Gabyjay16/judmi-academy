import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { users, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();
    const body = await req.json();
    const { schoolCode, studentId } = body;

    if (!schoolCode || !studentId) {
      return NextResponse.json({ error: "School Code and Student Matricule are required." }, { status: 400 });
    }

    const cleanCode = schoolCode.trim().toLowerCase();
    const orgRows = await db.select().from(organizations).limit(100);
    const orgMatch = orgRows.find(
      (o) => o.slug?.toLowerCase() === cleanCode || o.id?.toLowerCase() === cleanCode || o.name?.toLowerCase() === cleanCode
    );

    if (!orgMatch) {
      return NextResponse.json({ error: "Invalid School Code. Please verify with your teacher or school administrator." }, { status: 400 });
    }

    if (currentUser) {
      await db.update(users).set({
        orgId: orgMatch.id,
        studentId: studentId.trim(),
      }).where(eq(users.id, currentUser.id));
    }

    return NextResponse.json({
      success: true,
      message: `Successfully linked account to ${orgMatch.name}`,
      organization: {
        id: orgMatch.id,
        name: orgMatch.name,
        slug: orgMatch.slug,
      },
    });
  } catch (error: any) {
    console.error("Link school error:", error);
    return NextResponse.json({ error: error?.message || "Failed to link school" }, { status: 500 });
  }
}
