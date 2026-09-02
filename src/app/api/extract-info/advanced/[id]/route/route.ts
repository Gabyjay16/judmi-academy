import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { extractAdvancedSets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { extractFieldsFromImages, type ExtractField } from "@/lib/openrouter";
import {
  resolveSetAccess,
  fieldsOf,
  routeOptionsOf,
  routingModeOf,
  routingMarkerOf,
  ensureSetDocs,
  fileRowsIntoSet,
  matchRouteOption,
  normalizeRouteValue,
} from "@/lib/extract-advanced";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
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

    const body = await req.json();
    const images = Array.isArray(body.images) ? body.images : [];
    if (images.length === 0) {
      return NextResponse.json({ error: "Please snap or upload at least one document page." }, { status: 400 });
    }

    const mode: "auto" | "pick" = body.mode === "pick" ? "pick" : "auto";
    if (mode === "pick" && !body.targetId) {
      return NextResponse.json({ error: "Choose a document to add these records to." }, { status: 400 });
    }

    let fields: ExtractField[] = fieldsOf(set);
    if (fields.length === 0) {
      return NextResponse.json({ error: "This workspace has no data fields. Ask the owner to add fields." }, { status: 400 });
    }

    // Auto-routing needs the routing field in the AI extraction request so each
    // extracted row carries the value that decides where it is filed. We also
    // embed the workspace's route options into the field's instruction so the
    // AI returns values already matching the user's documents wherever possible.
    if (mode === "auto") {
      const routingMode = routingModeOf(set);
      if (routingMode === "marker") {
        // Marker (e.g. first-choice) mode: each field is a department and the
        // student writes a rank (1/2/3) in the one they pick. Tell the AI to
        // record that rank in EVERY department field so routing works.
        const marker = routingMarkerOf(set);
        fields = fields.slice(0, 50).map((f) => ({
          ...f,
          instruction:
            [f.instruction, `record the student's choice number (like "${marker}") written next to this department, or leave empty if not chosen`]
              .filter(Boolean)
              .join("; "),
        }));
      } else if (set.routingField) {
        const idx = fields.findIndex((f) => f.name === set.routingField);
        const options = routeOptionsOf(set);
        const hint =
          options.length > 0
            ? `use exactly one of these labels: ${options.join(", ")}`
            : `use the short, consistent name of the category/section`;
        if (idx >= 0) {
          fields[idx] = {
            ...fields[idx],
            instruction: fields[idx].instruction && fields[idx].instruction.trim()
              ? `${fields[idx].instruction}; ${hint}`
              : hint,
          };
        } else {
          fields = [...fields, { name: set.routingField!, type: "text", instruction: hint }];
        }
      }
    }

    let rows: Record<string, string>[] = [];
    try {
      const groupSize = Math.max(1, Math.trunc(Number(body.groupSize) || 1));
      if (groupSize <= 1) {
        // Default: treat all pages as one document, extract whatever records appear.
        rows = await extractFieldsFromImages(images, fields.slice(0, 50), set.name);
      } else {
        // Group the photos by the "photos per record" setting, in upload order,
        // and extract exactly ONE record from each group. A leftover partial
        // group at the end is processed as its own record too.
        const groups: { i: number; images: string[] }[] = [];
        for (let i = 0; i < images.length; i += groupSize) {
          groups.push({ i, images: images.slice(i, i + groupSize) });
        }
        const results = await Promise.all(
          groups.map((g) =>
            extractFieldsFromImages(g.images, fields.slice(0, 50), `${set.name} (part ${g.i / groupSize + 1})`, true).catch(() => [])
          )
        );
        for (const groupRows of results) {
          if (groupRows.length > 0) rows.push(...groupRows);
        }
      }
    } catch (e: any) {
      console.error("Extract advanced AI error:", e);
      return NextResponse.json({
        success: false,
        error: e?.message || "AI could not read the document. Please retake clearer photos and try again.",
      });
    }

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: "No records were found on the pages." });
    }

    const result = await fileRowsIntoSet(set, rows, images, { mode, targetId: body.targetId });

    return NextResponse.json({
      success: true,
      addedRows: result.perDoc.reduce((acc, d) => acc + d.added, 0),
      perDoc: result.perDoc,
      unclassified: result.unclassified,
    });
  } catch (error: any) {
    console.error("Extract advanced route error:", error);
    return NextResponse.json({ error: error?.message || "Failed to extract records." }, { status: 500 });
  }
}