import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { enforceServiceAccess } from "@/lib/plan-limits";

function generateAccessKey(): string {
  if (typeof crypto !== "undefined" && (crypto as any).randomUUID) {
    return (crypto as any).randomUUID().replace(/-/g, "").slice(0, 24);
  }
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

function sanitizeColor(color: string): string {
  return /^#[0-9a-fA-F]{3,6}$/.test(color) ? color : "";
}

export async function GET() {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();

    if (!currentUser || (currentUser.role !== "org_admin" && currentUser.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized. Organization admin privileges required." }, { status: 403 });
    }

    const orgId = currentUser.orgId;
    if (!orgId) {
      return NextResponse.json({ error: "No organization linked to this account." }, { status: 400 });
    }

    const orgRows = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
    if (orgRows.length === 0) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const org = orgRows[0];
    let accessKey = org.accessKey;
    if (!accessKey) {
      accessKey = generateAccessKey();
      await db.update(organizations).set({ accessKey }).where(eq(organizations.id, org.id));
    }

    return NextResponse.json({
      organization: {
        id: org.id,
        slug: org.slug,
        name: org.name,
        planType: org.planType,
        status: org.status,
      },
      branding: {
        brandName: org.brandName || org.name,
        logoData: org.logoData || null,
        brandColor: org.brandColor || "#4f46e5",
      },
      accessKey,
      // Private branded link shared only with the school's own teachers/students
      schoolUrl: `/school/${org.slug}?key=${accessKey}`,
      accessKeyGenerated: Boolean(org.accessKey),
    });
  } catch (error: any) {
    console.error("Organization branding GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to load branding" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();

    if (!currentUser || (currentUser.role !== "org_admin" && currentUser.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized. Organization admin privileges required." }, { status: 403 });
    }

    // Per-service access control (granted by super admin)
    const denied = await enforceServiceAccess("branding", currentUser);
    if (denied) return denied;

    const orgId = currentUser.orgId;
    if (!orgId) {
      return NextResponse.json({ error: "No organization linked to this account." }, { status: 400 });
    }

    const orgRows = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
    if (orgRows.length === 0) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const body = await req.json();

    const updates: Partial<typeof organizations.$inferInsert> = {};

    if (typeof body.brandName === "string") {
      const trimmed = body.brandName.trim().slice(0, 120);
      if (trimmed) updates.brandName = trimmed;
    }
    if (typeof body.brandColor === "string") {
      const color = sanitizeColor(body.brandColor.trim());
      if (color) updates.brandColor = color;
    }
    if (typeof body.logo === "string") {
      const logo = body.logo.trim().slice(0, 3_000_000);
      if (/^data:image\/(png|jpe?g|webp|gif);base64,/.test(logo) || logo.startsWith("http")) {
        updates.logoData = logo;
      }
    } else if (body.logo === null) {
      updates.logoData = null as any;
    }

    if (body.regenerateKey === true) {
      updates.accessKey = generateAccessKey();
    }

    if (Object.keys(updates).length > 0) {
      await db.update(organizations).set(updates).where(eq(organizations.id, orgId));
    }

    const updatedRows = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
    const org = updatedRows[0];

    return NextResponse.json({
      success: true,
      message: "School branding updated successfully.",
      branding: {
        brandName: org.brandName || org.name,
        logoData: org.logoData || null,
        brandColor: org.brandColor || "#4f46e5",
      },
      accessKey: org.accessKey || "",
      schoolUrl: `/school/${org.slug}?key=${org.accessKey}`,
    });
  } catch (error: any) {
    console.error("Organization branding PATCH error:", error);
    return NextResponse.json({ error: error.message || "Failed to update branding" }, { status: 500 });
  }
}
