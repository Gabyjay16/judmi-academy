import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { extractTemplates } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { enforceServiceAccess } from "@/lib/plan-limits";
import { generateId } from "@/lib/utils";
import type { ExtractField } from "@/lib/openrouter";

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rows = await db
      .select()
      .from(extractTemplates)
      .where(eq(extractTemplates.ownerUserId, currentUser.id))
      .orderBy(desc(extractTemplates.createdAt));

    return NextResponse.json({
      templates: rows.map((t) => ({
        id: t.id,
        name: t.name,
        fieldDefinitions: JSON.parse(t.fieldDefinitionsJson || "[]") as ExtractField[],
        routingField: t.routingField || "",
        routeOptions: t.routeOptionsJson ? JSON.parse(t.routeOptionsJson) : [],
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
    });
  } catch (error: any) {
    console.error("Extract templates list error:", error);
    return NextResponse.json({ error: error?.message || "Failed to load templates." }, { status: 500 });
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
    const name = (body.name || "").trim() || "Untitled Template";
    const fields: ExtractField[] = Array.isArray(body.fields) ? body.fields : [];
    if (fields.length === 0) {
      return NextResponse.json({ error: "Please define at least one data field." }, { status: 400 });
    }

    const routingField = body.routingField ? String(body.routingField).trim() : "";
    const routeOptions: string[] = Array.isArray(body.routeOptions)
      ? body.routeOptions.map(String).filter(Boolean)
      : [];
    if (routingField && !fields.some((f) => f.name === routingField)) {
      return NextResponse.json({ error: "The routing field must be one of the data fields." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const id = generateId();
    await db.insert(extractTemplates).values({
      id,
      ownerUserId: currentUser.id,
      orgId: (currentUser as any).orgId || null,
      name,
      fieldDefinitionsJson: JSON.stringify(fields),
      routingField,
      routeOptionsJson: JSON.stringify(routeOptions),
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error("Extract template create error:", error);
    return NextResponse.json({ error: error?.message || "Failed to save template." }, { status: 500 });
  }
}