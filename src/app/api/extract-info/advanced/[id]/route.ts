import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { users, extractAdvancedSets, extractDocuments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import type { ExtractField } from "@/lib/openrouter";
import {
  resolveSetAccess,
  parseSharedWith,
  routeOptionsOf,
  fieldsOf,
  ensureSetDocs,
  docToSummary,
  isDocArchived,
} from "@/lib/extract-advanced";

function canManage(currentUser: any, set: any): boolean {
  if (!currentUser) return false;
  if (currentUser.role === "admin") return true;
  if (set.ownerUserId === currentUser.id) return true;
  if (currentUser.role === "org_admin" && set.orgId && (currentUser.orgId || null) === set.orgId) return true;
  return false;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const access = await resolveSetAccess(currentUser, id);
    if (!access.ok || !access.set) {
      return NextResponse.json({ error: "Workspace not found or not shared with you." }, { status: 404 });
    }
    const set = access.set;

    const docs = await db.select().from(extractDocuments).where(eq(extractDocuments.advancedSetId, set.id));
    const options = routeOptionsOf(set);

    let ownerInfo = null;
    if (set.ownerUserId) {
      const rows = await db.select().from(users).where(eq(users.id, set.ownerUserId)).limit(1);
      if (rows.length > 0) ownerInfo = { name: rows[0].name, email: rows[0].email, username: rows[0].username };
    }

    return NextResponse.json({
      set: {
        id: set.id,
        name: set.name,
        fieldDefinitions: fieldsOf(set),
        routingField: set.routingField || "",
        routingMode: set.routingMode === "marker" ? "marker" : "value",
        routingMarker: String(set.routingMarker || "1"),
        routeOptions: options,
        isShared: access.shared || false,
        owner: ownerInfo,
        sharedWith: parseSharedWith(set.sharedWithJson),
        docs: docs.map((d) => ({ ...docToSummary(d), isArchived: isDocArchived(d, options) })),
        createdAt: set.createdAt,
        updatedAt: set.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Extract advanced get error:", error);
    return NextResponse.json({ error: error?.message || "Failed to load workspace." }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const access = await resolveSetAccess(currentUser, id);
    if (!access.ok || !access.set) {
      return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    }
    if (!canManage(currentUser, access.set)) {
      return NextResponse.json({ error: "Only the workspace owner can change these settings." }, { status: 403 });
    }
    const set = access.set;

    const body = await req.json();
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim();

    let fields = fieldsOf(set);
    let routingField = set.routingField || "";
    let routingMode: "value" | "marker" = set.routingMode === "marker" ? "marker" : "value";
    let routingMarker = String(set.routingMarker || "1").trim() || "1";
    let routeOptions = routeOptionsOf(set);

    if (Array.isArray(body.fields)) {
      const f = body.fields as ExtractField[];
      if (f.length > 0) {
        fields = f;
        updates.fieldDefinitionsJson = JSON.stringify(f);
      }
    }
    if (typeof body.routingMode === "string") {
      routingMode = body.routingMode === "marker" ? "marker" : "value";
      updates.routingMode = routingMode;
    }
    if (typeof body.routingMarker === "string" && body.routingMarker.trim()) {
      routingMarker = body.routingMarker.trim();
      updates.routingMarker = routingMarker;
    }
    if (typeof body.routingField === "string") {
      routingField = body.routingField.trim();
      updates.routingField = routingField;
    }
    if (routingMode === "value" && routingField && !fields.some((x) => x.name === routingField)) {
      return NextResponse.json({ error: "The routing field must be one of the data fields." }, { status: 400 });
    }
    if (Array.isArray(body.routeOptions)) {
      routeOptions = body.routeOptions.map(String).map((s: string) => s.trim()).filter(Boolean);
      updates.routeOptionsJson = JSON.stringify(routeOptions);
    }

    await db.update(extractAdvancedSets).set(updates).where(eq(extractAdvancedSets.id, id));

    const freshRows = await db.select().from(extractAdvancedSets).where(eq(extractAdvancedSets.id, id)).limit(1);
    const docs = await ensureSetDocs(freshRows[0], routeOptions);

    return NextResponse.json({
      success: true,
      docs: docs.map((d) => ({ ...docToSummary(d), isArchived: isDocArchived(d, routeOptions) })),
    });
  } catch (error: any) {
    console.error("Extract advanced update error:", error);
    return NextResponse.json({ error: error?.message || "Failed to update workspace." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const access = await resolveSetAccess(currentUser, id);
    if (!access.ok || !access.set) {
      return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    }
    if (!canManage(currentUser, access.set)) {
      return NextResponse.json({ error: "Only the workspace owner can delete it." }, { status: 403 });
    }

    await db.delete(extractDocuments).where(eq(extractDocuments.advancedSetId, id));
    await db.delete(extractAdvancedSets).where(eq(extractAdvancedSets.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Extract advanced delete error:", error);
    return NextResponse.json({ error: error?.message || "Failed to delete workspace." }, { status: 500 });
  }
}