import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { extractDocuments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { extractFieldsFromImages, ExtractField } from "@/lib/openrouter";

function canAccess(currentUser: any, doc: any): boolean {
  if (!currentUser) return false;
  if (currentUser.role === "admin") return true;
  const isOrgAdmin = currentUser.role === "org_admin";
  if (isOrgAdmin && doc.orgId) {
    return doc.orgId === (currentUser.orgId || null);
  }
  return doc.ownerUserId === currentUser.id;
}

export async function POST(
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
    if (!canAccess(currentUser, doc)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const images = Array.isArray(body.images) ? body.images : [];
    if (images.length === 0) {
      return NextResponse.json({ error: "Please snap or upload at least one document page." }, { status: 400 });
    }

    let fields: ExtractField[] = Array.isArray(body.fields) ? body.fields : [];
    if (fields.length === 0) {
      fields = JSON.parse(doc.fieldDefinitionsJson || "[]");
    }
    if (fields.length === 0) {
      return NextResponse.json({ error: "No data fields defined on this file. Please edit the file and add fields first." }, { status: 400 });
    }

    // Run AI extraction on the new pages against the file's existing fields
    let newRows: Record<string, string>[] = [];
    let status: "ready" | "error" = "ready";
    let error: string | null = null;
    try {
      newRows = await extractFieldsFromImages(images, fields.slice(0, 50), doc.title);
    } catch (e: any) {
      status = "error";
      error = e?.message || "AI could not read the new pages. Please retake clearer photos and try again.";
      console.error("Extract-info append AI error:", e);
    }

    // Only tag the new content onto the file when the extraction actually succeeded
    if (status === "error") {
      return NextResponse.json({ success: false, status, error });
    }

    const prevRows = JSON.parse(doc.extractedRowsJson || "[]") as Record<string, string>[];
    const prevImages = doc.sourceImagesJson ? JSON.parse(doc.sourceImagesJson) : [];

    await db
      .update(extractDocuments)
      .set({
        extractedRowsJson: JSON.stringify([...prevRows, ...newRows]),
        sourceImagesJson: JSON.stringify([...prevImages, ...images]),
        pageCount: prevImages.length + images.length,
        status,
        error: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(extractDocuments.id, id));

    return NextResponse.json({
      success: true,
      id,
      addedRows: newRows.length,
      totalRows: prevRows.length + newRows.length,
      totalPages: prevImages.length + images.length,
      status,
      rows: newRows,
    });
  } catch (error: any) {
    console.error("Extract-info append error:", error);
    return NextResponse.json({ error: error?.message || "Failed to update document." }, { status: 500 });
  }
}