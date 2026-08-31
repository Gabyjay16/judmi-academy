import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { extractDocuments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { generateDocx, generateExcel, generateCsv, ExportData } from "@/lib/export-doc";

function canAccess(currentUser: any, doc: any): boolean {
  if (!currentUser) return false;
  if (currentUser.role === "admin") return true;
  const isOrgAdmin = currentUser.role === "org_admin";
  if (isOrgAdmin && doc.orgId) {
    return doc.orgId === (currentUser.orgId || null);
  }
  return doc.ownerUserId === currentUser.id;
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
    if (!canAccess(currentUser, doc)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const query = new URL(req.url).searchParams;
    const format = (query.get("format") || doc.exportFormat || "xlsx").toLowerCase();
    const fields = JSON.parse(doc.fieldDefinitionsJson || "[]") as { name: string; type: string }[];
    const dataRows = JSON.parse(doc.extractedRowsJson || "[]") as Array<Record<string, string>>;

    const exportData: ExportData = {
      title: doc.title || "Extracted Document",
      columns: fields.length ? fields : Object.keys(dataRows[0] || {}).map((n) => ({ name: n, type: "text" })),
      rows: dataRows,
      generatedAt: new Date().toLocaleString(),
    };

    const slug = (doc.title || "extracted").toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "extracted";

    if (format === "json") {
      return NextResponse.json({ document: { ...exportData, columns: exportData.columns.map((c) => c.name) } });
    }

    if (format === "csv") {
      const csv = "\uFEFF" + generateCsv(exportData);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${slug}.csv"`,
        },
      });
    }

    if (format === "xlsx") {
      const buf = await generateExcel(exportData);
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${slug}.xlsx"`,
        },
      });
    }

    if (format === "docx") {
      const buf = await generateDocx(exportData);
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${slug}.docx"`,
        },
      });
    }

    // PDF is generated client-side (browser print-to-PDF), so return the data.
    return NextResponse.json({ pdf: true, document: { ...exportData, columns: exportData.columns.map((c) => c.name) } });
  } catch (error: any) {
    console.error("Extract-info export error:", error);
    return NextResponse.json({ error: error?.message || "Failed to generate export." }, { status: 500 });
  }
}
