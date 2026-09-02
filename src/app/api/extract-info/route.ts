import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { users, extractDocuments, extractAdvancedSets } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { enforceServiceAccess } from "@/lib/plan-limits";
import { generateId } from "@/lib/utils";
import { extractFieldsFromImages, ExtractField } from "@/lib/openrouter";
import { isUsernameShared } from "@/lib/extract-advanced";

interface CreateBody {
  title?: string;
  fields?: ExtractField[];
  images?: string[];
  exportFormat?: string;
}

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Enforce per-service access control (admin/granted)
    const denied = await enforceServiceAccess("extractInfo", currentUser);
    if (denied) return denied;

    const body: CreateBody = await req.json();
    const title = (body.title || "").trim() || "Extracted Document";
    const fields = Array.isArray(body.fields) ? body.fields : [];
    const images = Array.isArray(body.images) ? body.images : [];
    const exportFormat = ["xlsx", "docx", "csv", "pdf"].includes(body.exportFormat || "")
      ? body.exportFormat!
      : "xlsx";

    if (fields.length === 0) {
      return NextResponse.json({ error: "Please define at least one data field to extract." }, { status: 400 });
    }
    if (images.length === 0) {
      return NextResponse.json({ error: "Please snap or upload at least one document page." }, { status: 400 });
    }

    const id = generateId();
    const now = new Date().toISOString();

    let rows: Record<string, string>[] = [];
    let status: "ready" | "error" = "ready";
    let error: string | null = null;

    try {
      rows = await extractFieldsFromImages(images, fields.slice(0, 50), title);
    } catch (e: any) {
      status = "error";
      error = e?.message || "AI extraction failed. Please check your photos and try again.";
      console.error("Extract info AI error:", e);
    }

    await db.insert(extractDocuments).values({
      id,
      ownerUserId: currentUser.id,
      orgId: (currentUser as any).orgId || null,
      title,
      fieldDefinitionsJson: JSON.stringify(fields),
      extractedRowsJson: JSON.stringify(rows),
      pageCount: images.length,
      sourceImagesJson: JSON.stringify(images),
      exportFormat,
      status,
      error,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      success: true,
      id,
      status,
      error,
      rows,
      fields,
    });
  } catch (error: any) {
    console.error("Extract-info create error:", error);
    return NextResponse.json({ error: error?.message || "Failed to create extraction." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const isOrgAdmin = currentUser.role === "org_admin" || currentUser.role === "admin";
    const orgId = (currentUser as any).orgId;

    // Sets shared directly with this teacher (by username or email).
    const allSets = await db.select().from(extractAdvancedSets);
    const sharedSetIds = new Set(
      allSets
        .filter((s) => isUsernameShared(s, currentUser.username || "", currentUser.email))
        .map((s) => s.id)
    );

    const all = await db.select().from(extractDocuments).orderBy(desc(extractDocuments.createdAt));
    const docs = all.filter((d) => {
      if (d.ownerUserId === currentUser.id) return true;
      if (currentUser.role === "admin") return true;
      if (isOrgAdmin && orgId && d.orgId === orgId) return true;
      if (d.advancedSetId && sharedSetIds.has(d.advancedSetId)) return true;
      return false;
    });

    if (q) {
      const needle = q.toLowerCase();
      const filtered = docs.filter((d) => d.title.toLowerCase().includes(needle));
      return NextResponse.json({ documents: await buildListItems(currentUser, filtered) });
    }

    return NextResponse.json({ documents: await buildListItems(currentUser, docs) });
  } catch (error: any) {
    console.error("Extract-info list error:", error);
    return NextResponse.json({ error: error?.message || "Failed to load documents." }, { status: 500 });
  }
}

async function buildListItems(currentUser: any, docs: any[]) {
  const sharedOwnerIds = [...new Set(docs
    .filter((d) => d.ownerUserId !== currentUser.id && d.ownerUserId)
    .map((d) => d.ownerUserId))];
  const owners = sharedOwnerIds.length > 0
    ? await db.select().from(users).where(inArray(users.id, sharedOwnerIds))
    : [];
  const ownerMap = new Map<string, any>();
  for (const o of owners) ownerMap.set(o.id, o);

  return docs.map((d) => {
    const item: Record<string, unknown> = {
      id: d.id,
      title: d.title,
      status: d.status,
      error: d.error,
      exportFormat: d.exportFormat,
      pageCount: d.pageCount,
      fieldDefinitions: JSON.parse(d.fieldDefinitionsJson || "[]"),
      rowCount: (JSON.parse(d.extractedRowsJson || "[]") as any[]).length,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      advancedSetId: d.advancedSetId || null,
    };
    if (d.ownerUserId !== currentUser.id) {
      const owner = d.ownerUserId ? ownerMap.get(d.ownerUserId) : null;
      if (owner) {
        item.ownerName = owner.name;
        item.ownerUsername = owner.username;
      }
      item.shared = true;
    } else {
      item.shared = false;
    }
    return item;
  });
}
