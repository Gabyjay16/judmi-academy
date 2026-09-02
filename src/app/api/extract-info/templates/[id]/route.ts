import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { extractTemplates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const rows = await db.select().from(extractTemplates).where(eq(extractTemplates.id, id)).limit(1);
    if (rows.length === 0) return NextResponse.json({ error: "Template not found" }, { status: 404 });
    if (rows[0].ownerUserId !== currentUser.id && currentUser.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.delete(extractTemplates).where(eq(extractTemplates.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Extract template delete error:", error);
    return NextResponse.json({ error: error?.message || "Failed to delete template." }, { status: 500 });
  }
}