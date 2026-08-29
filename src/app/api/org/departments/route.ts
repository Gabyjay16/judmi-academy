import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { departments, organizations, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { generateId } from "@/lib/utils";

// GET departments: by current user org, or by ?schoolCode=... / ?orgId=...
export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const { searchParams } = new URL(req.url);
    const schoolCode = searchParams.get("schoolCode")?.trim().toLowerCase();
    const orgIdParam = searchParams.get("orgId")?.trim();

    let targetOrgId = orgIdParam;

    if (!targetOrgId && schoolCode) {
      const orgRows = await db.select().from(organizations).limit(100);
      const matched = orgRows.find(
        (o) => o.slug?.toLowerCase() === schoolCode || o.id?.toLowerCase() === schoolCode || o.name?.toLowerCase() === schoolCode
      );
      if (matched) {
        targetOrgId = matched.id;
      }
    }

    if (!targetOrgId) {
      const currentUser = await getCurrentUser();
      if (currentUser?.orgId) {
        targetOrgId = currentUser.orgId;
      }
    }

    if (!targetOrgId) {
      return NextResponse.json({ departments: [] });
    }

    const deptRows = await db
      .select()
      .from(departments)
      .where(eq(departments.orgId, targetOrgId))
      .orderBy(desc(departments.createdAt));

    return NextResponse.json({ departments: deptRows, orgId: targetOrgId });
  } catch (error: any) {
    console.error("Fetch departments error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch departments" }, { status: 500 });
  }
}

// POST create a department under school
export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();

    if (!currentUser || (currentUser.role !== "org_admin" && currentUser.role !== "admin")) {
      return NextResponse.json({ error: "Only school administrators can create departments." }, { status: 403 });
    }

    if (!currentUser.orgId) {
      return NextResponse.json({ error: "No organization linked to this account." }, { status: 400 });
    }

    const body = await req.json();
    const { name, code } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Department name is required." }, { status: 400 });
    }

    const id = generateId();
    const now = new Date().toISOString();

    await db.insert(departments).values({
      id,
      orgId: currentUser.orgId,
      name: name.trim(),
      code: code ? code.trim().toUpperCase() : null,
      createdAt: now,
    });

    const created = await db.select().from(departments).where(eq(departments.id, id)).limit(1);

    return NextResponse.json({
      success: true,
      message: "Department created successfully.",
      department: created[0],
    });
  } catch (error: any) {
    console.error("Create department error:", error);
    return NextResponse.json({ error: error.message || "Failed to create department" }, { status: 500 });
  }
}

// DELETE a department
export async function DELETE(req: NextRequest) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();

    if (!currentUser || (currentUser.role !== "org_admin" && currentUser.role !== "admin")) {
      return NextResponse.json({ error: "Only school administrators can delete departments." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Department ID is required." }, { status: 400 });
    }

    await db.delete(departments).where(eq(departments.id, id));

    return NextResponse.json({
      success: true,
      message: "Department deleted successfully.",
    });
  } catch (error: any) {
    console.error("Delete department error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete department" }, { status: 500 });
  }
}
