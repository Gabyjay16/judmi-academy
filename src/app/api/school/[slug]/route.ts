import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    await initDatabase();
    const { slug } = await context.params;
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key") || "";

    if (!slug || !key) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const orgRows = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, slug.toLowerCase()))
      .limit(1);
    if (orgRows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const org = orgRows[0];
    // The private access key is required and must match exactly.
    if (!org.accessKey || org.accessKey !== key) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      organization: {
        id: org.id,
        slug: org.slug,
        name: org.name,
        status: org.status,
      },
      branding: {
        brandName: org.brandName || org.name,
        logoData: org.logoData || null,
        brandColor: org.brandColor || "#4f46e5",
      },
    });
  } catch (error: any) {
    console.error("School branding lookup error:", error);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
