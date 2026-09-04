import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { programs, departments, users } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { generateId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    const rows = await db
      .select()
      .from(programs)
      .where(eq(programs.orgId, user.orgId))
      .orderBy(desc(programs.createdAt));

    return NextResponse.json({ programs: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });
    if (user.role !== "admin" && user.role !== "org_admin") {
      return NextResponse.json({ error: "Only school administrators can create programs." }, { status: 403 });
    }

    const body = await req.json();
    const { name, code, departmentId, description, duration, headId } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Program name is required." }, { status: 400 });
    }

    const id = generateId();
    const now = new Date().toISOString();

    await db.insert(programs).values({
      id,
      orgId: user.orgId,
      departmentId: departmentId || null,
      name: name.trim(),
      code: code?.trim().toUpperCase() || null,
      description: description?.trim() || null,
      duration: duration?.trim() || null,
      headId: headId || null,
      createdAt: now,
    });

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin" && user.role !== "org_admin") {
      return NextResponse.json({ error: "Only school administrators can update programs." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Program ID is required." }, { status: 400 });

    const prog = await db.select().from(programs).where(eq(programs.id, id)).limit(1);
    if (!prog[0] || prog[0].orgId !== user.orgId) return NextResponse.json({ error: "Program not found." }, { status: 404 });

    const body = await req.json();
    const updates: Record<string, any> = {};
    if (body.name !== undefined) updates.name = body.name?.trim() || prog[0].name;
    if (body.code !== undefined) updates.code = body.code ? body.code.trim().toUpperCase() : null;
    if (body.departmentId !== undefined) updates.departmentId = body.departmentId || null;
    if (body.description !== undefined) updates.description = body.description?.trim() || null;
    if (body.duration !== undefined) updates.duration = body.duration?.trim() || null;
    if (body.headId !== undefined) updates.headId = body.headId || null;

    if (Object.keys(updates).length === 0) return NextResponse.json({ error: "No fields to update." }, { status: 400 });

    await db.update(programs).set(updates).where(eq(programs.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin" && user.role !== "org_admin") {
      return NextResponse.json({ error: "Only school administrators can delete programs." }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Program ID is required." }, { status: 400 });
    await db.delete(programs).where(eq(programs.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}