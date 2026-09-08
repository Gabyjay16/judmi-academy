import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { extractDocuments } from "@/db/schema";
import { desc, or, like } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { enforceServiceAccess } from "@/lib/plan-limits";
import { generateId } from "@/lib/utils";
import { extractFieldsFromImages, ExtractField } from "@/lib/openrouter";

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

    let docs;
    if (isOrgAdmin && orgId) {
      const all = await db
        .select()
        .from(extractDocuments)
        .orderBy(desc(extractDocuments.createdAt));
      docs = all.filter((d) => d.orgId === orgId);
      if (q) {
        docs = docs.filter((d) => d.title.toLowerCase().includes(q.toLowerCase()));
      }
      return NextResponse.json({
        documents: docs.map((d) => ({
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
        })),
      });
    }

    const base = db.select().from(extractDocuments).orderBy(desc(extractDocuments.createdAt));
    docs = await base;
    docs = docs.filter((d) => d.ownerUserId === currentUser.id);
    if (q) {
      docs = docs.filter((d) => d.title.toLowerCase().includes(q.toLowerCase()));
    }

    return NextResponse.json({
      documents: docs.map((d) => ({
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
      })),
    });
  } catch (error: any) {
    console.error("Extract-info list error:", error);
    return NextResponse.json({ error: error?.message || "Failed to load documents." }, { status: 500 });
  }
}
