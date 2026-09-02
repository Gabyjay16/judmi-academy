import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { users, extractTemplates, extractAdvancedSets, extractDocuments } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { enforceServiceAccess } from "@/lib/plan-limits";
import { generateId } from "@/lib/utils";
import type { ExtractField } from "@/lib/openrouter";
import {
  parseSharedWith,
  routeOptionsOf,
  fieldsOf,
  ensureSetDocs,
  docToSummary,
  isDocArchived,
} from "@/lib/extract-advanced";

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const all = await db
      .select()
      .from(extractAdvancedSets)
      .orderBy(desc(extractAdvancedSets.createdAt));

    const own = all.filter((s) => s.ownerUserId === currentUser.id);
    const isOrgAdmin = currentUser.role === "org_admin" || currentUser.role === "admin";
    const orgShared = isOrgAdmin && currentUser.orgId
      ? all.filter((s) => s.orgId === currentUser.orgId && s.ownerUserId !== currentUser.id)
      : [];
    const shared = all.filter(
      (s) =>
        s.ownerUserId !== currentUser.id &&
        !orgShared.some((x) => x.id === s.id) &&
        (parseSharedWith(s.sharedWithJson).some(
          (r) =>
            (r.username && r.username.trim().toLowerCase() === (currentUser.username || "").trim().toLowerCase()) ||
            (r.email && r.email.trim().toLowerCase() === currentUser.email.toLowerCase())
        ) || (isOrgAdmin && s.orgId === currentUser.orgId))
    );

    const ownerIds = new Set<string>();
    for (const s of [...own, ...orgShared, ...shared]) {
      if (s.ownerUserId) ownerIds.add(s.ownerUserId);
    }
    const owners = ownerIds.size > 0
      ? await db.select().from(users).where(inArray(users.id, [...ownerIds]))
      : [];
    const ownerMap = new Map<string, any>();
    for (const o of owners as any[]) ownerMap.set(o.id, o);

    const summarize = async (set: any, shared: boolean) => {
      const docs = await db.select().from(extractDocuments).where(eq(extractDocuments.advancedSetId, set.id));
      const options = routeOptionsOf(set);
      return {
        id: set.id,
        name: set.name,
        fieldDefinitions: fieldsOf(set),
        routingField: set.routingField || "",
        routeOptions: options,
        isShared: shared,
        ownerName: shared ? ownerMap.get(set.ownerUserId)?.name || "Teacher" : null,
        ownerUsername: shared ? ownerMap.get(set.ownerUserId)?.username || null : null,
        sharedWith: shared ? undefined : parseSharedWith(set.sharedWithJson),
        documentCount: docs.length,
        recordCount: docs.reduce(
          (acc, d) => acc + (JSON.parse(d.extractedRowsJson || "[]") as any[]).length,
          0
        ),
        docs: docs.map((d) => ({ ...docToSummary(d), isArchived: isDocArchived(d, options) })),
        createdAt: set.createdAt,
        updatedAt: set.updatedAt,
      };
    };

    const mine: any[] = [];
    for (const s of own) mine.push(await summarize(s, false));
    const sharedList: any[] = [];
    for (const s of [...orgShared, ...shared] as any[]) sharedList.push(await summarize(s, true));

    return NextResponse.json({ sets: mine, sharedSets: sharedList });
  } catch (error: any) {
    console.error("Extract advanced list error:", error);
    return NextResponse.json({ error: error?.message || "Failed to load workspaces." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const denied = await enforceServiceAccess("extractInfo", currentUser);
    if (denied) return denied;

    const body = await req.json();
    const name = (body.name || "").trim() || "Untitled Workspace";

    let fields: ExtractField[] = Array.isArray(body.fields) ? body.fields : [];
    let routingField = body.routingField ? String(body.routingField).trim() : "";
    let routingMode: "value" | "marker" = body.routingMode === "marker" ? "marker" : "value";
    let routingMarker = String(body.routingMarker ?? "1").trim() || "1";
    let routeOptions: string[] = Array.isArray(body.routeOptions)
      ? body.routeOptions.map(String).map((s: string) => s.trim()).filter(Boolean)
      : [];

    // Optionally initialise from a saved template (field settings reuse).
    if (body.templateId) {
      const tRows = await db.select().from(extractTemplates).where(eq(extractTemplates.id, body.templateId)).limit(1);
      if (tRows.length > 0) {
        const t = tRows[0];
        if ((body.fields === undefined || (Array.isArray(body.fields) && body.fields.length === 0))) {
          fields = JSON.parse(t.fieldDefinitionsJson || "[]") as ExtractField[];
        }
        if (!body.routingField) routingField = t.routingField || "";
        if (body.routeOptions === undefined || (Array.isArray(body.routeOptions) && body.routeOptions.length === 0)) {
          routeOptions = t.routeOptionsJson ? JSON.parse(t.routeOptionsJson) : [];
        }
      }
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "Please define at least one data field." }, { status: 400 });
    }
    if (routingMode === "value") {
      if (routingField && !fields.some((f) => f.name === routingField)) {
        return NextResponse.json({ error: "The routing field must be one of the data fields." }, { status: 400 });
      }
      if (!routingField) {
        return NextResponse.json({ error: "Choose which field decides where each record is saved (e.g. option / department)." }, { status: 400 });
      }
    }

    const now = new Date().toISOString();
    const id = generateId();
    await db.insert(extractAdvancedSets).values({
      id,
      ownerUserId: currentUser.id,
      orgId: (currentUser as any).orgId || null,
      name,
      templateId: body.templateId || null,
      fieldDefinitionsJson: JSON.stringify(fields),
      routingField,
      routingMode,
      routingMarker,
      routeOptionsJson: JSON.stringify(routeOptions),
      sharedWithJson: "[]",
      createdAt: now,
      updatedAt: now,
    });

    if (routeOptions.length === 0) {
      // No documents specified — create a starter Uncategorised document so the
      // workspace is usable immediately; new values create docs on the fly.
      await db.insert(extractDocuments).values({
        id: generateId(),
        ownerUserId: currentUser.id,
        orgId: (currentUser as any).orgId || null,
        title: "Uncategorised",
        fieldDefinitionsJson: JSON.stringify(fields),
        extractedRowsJson: "[]",
        pageCount: 0,
        exportFormat: "xlsx",
        status: "ready",
        advancedSetId: id,
        routeValue: "uncategorised",
        routeLabel: "Uncategorised",
        createdAt: now,
        updatedAt: now,
      });
    } else {
      const rows = await db.select().from(extractAdvancedSets).where(eq(extractAdvancedSets.id, id)).limit(1);
      await ensureSetDocs(rows[0], routeOptions);
    }

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error("Extract advanced create error:", error);
    return NextResponse.json({ error: error?.message || "Failed to create workspace." }, { status: 500 });
  }
}