import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { extractDocuments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { resolveSetDocAccess } from "@/lib/extract-advanced";

function canDelete(currentUser: any, doc: any): boolean {
  if (!currentUser) return false;
  if (currentUser.role === "admin") return true;
  if (doc.ownerUserId === currentUser.id) return true;
  if (currentUser.role === "org_admin" && doc.orgId && (currentUser.orgId || null) === doc.orgId) return true;
  return false;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const rows = await db.select().from(extractDocuments).where(eq(extractDocuments.id, id)).limit(1);
    if (rows.length === 0) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    const doc = rows[0];
    const access = await resolveSetDocAccess(currentUser, doc);
    if (!access.ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      document: {
        id: doc.id,
        title: doc.title,
        status: doc.status,
        error: doc.error,
        exportFormat: doc.exportFormat,
        pageCount: doc.pageCount,
        fieldDefinitions: JSON.parse(doc.fieldDefinitionsJson || "[]"),
        rows: JSON.parse(doc.extractedRowsJson || "[]"),
        sourceImages: doc.sourceImagesJson ? JSON.parse(doc.sourceImagesJson) : [],
        revertCount: doc.rowHistoryJson ? (JSON.parse(doc.rowHistoryJson) as any[]).length : 0,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Extract-info get error:", error);
    return NextResponse.json({ error: error?.message || "Failed to load document." }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const rows = await db.select().from(extractDocuments).where(eq(extractDocuments.id, id)).limit(1);
    if (rows.length === 0) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    const doc = rows[0];
    const access = await resolveSetDocAccess(currentUser, doc);
    if (!access.ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

    // Revert last change: restore the previous snapshot of rows from history.
    if (body.revert === true) {
      const history = (doc.rowHistoryJson ? JSON.parse(doc.rowHistoryJson) : []) as any[];
      if (history.length === 0) {
        return NextResponse.json({ error: "There is nothing to revert." }, { status: 400 });
      }
      const last = history[history.length - 1];
      history.pop();
      updates.extractedRowsJson = JSON.stringify(last.rows || []);
      updates.rowHistoryJson = JSON.stringify(history);
    } else {
      if (typeof body.title === "string") updates.title = body.title.trim() || doc.title;
      if (body.rows && Array.isArray(body.rows)) {
        const history = (doc.rowHistoryJson ? JSON.parse(doc.rowHistoryJson) : []) as any[];
        history.push({ rows: JSON.parse(doc.extractedRowsJson || "[]"), at: new Date().toISOString(), label: "Manual edit" });
        if (history.length > 50) history.splice(0, history.length - 50);
        updates.rowHistoryJson = JSON.stringify(history);
        updates.extractedRowsJson = JSON.stringify(body.rows);
      }
      if (body.fields && Array.isArray(body.fields)) updates.fieldDefinitionsJson = JSON.stringify(body.fields);
      if (typeof body.exportFormat === "string" && ["xlsx", "docx", "csv", "pdf"].includes(body.exportFormat)) {
        updates.exportFormat = body.exportFormat;
      }
    }

    await db.update(extractDocuments).set(updates).where(eq(extractDocuments.id, id));

    const updated = await db.select().from(extractDocuments).where(eq(extractDocuments.id, id)).limit(1);
    const d = updated[0];
    return NextResponse.json({
      success: true,
      document: {
        id: d.id,
        title: d.title,
        status: d.status,
        error: d.error,
        exportFormat: d.exportFormat,
        pageCount: d.pageCount,
        fieldDefinitions: JSON.parse(d.fieldDefinitionsJson || "[]"),
        rows: JSON.parse(d.extractedRowsJson || "[]"),
        sourceImages: d.sourceImagesJson ? JSON.parse(d.sourceImagesJson) : [],
        revertCount: d.rowHistoryJson ? (JSON.parse(d.rowHistoryJson) as any[]).length : 0,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Extract-info update error:", error);
    return NextResponse.json({ error: error?.message || "Failed to update document." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const rows = await db.select().from(extractDocuments).where(eq(extractDocuments.id, id)).limit(1);
    if (rows.length === 0) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    if (!canDelete(currentUser, rows[0])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.delete(extractDocuments).where(eq(extractDocuments.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Extract-info delete error:", error);
    return NextResponse.json({ error: error?.message || "Failed to delete document." }, { status: 500 });
  }
}
