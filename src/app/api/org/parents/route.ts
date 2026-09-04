import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { users, parentLinks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { generateId } from "@/lib/utils";

const STAFF = ["admin", "org_admin"];

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    const parents = await db.select().from(users).where(eq(users.role as any, "parent"));
    const orgParents = parents.filter((p) => p.orgId === user.orgId);

    const links = await db.select().from(parentLinks).where(eq(parentLinks.orgId, user.orgId));
    const students = await db.select().from(users).where(eq(users.orgId, user.orgId));

    const result = orgParents.map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      studentId: p.studentId || null,
      createdAt: p.createdAt,
      children: links
        .filter((l) => l.parentId === p.id)
        .map((l) => ({ id: l.studentId, name: l.studentName, relationship: l.relationship })),
    }));

    return NextResponse.json({
      parents: result,
      students: students
        .filter((s) => s.role === "student")
        .map((s) => ({ id: s.id, name: s.name, studentId: s.studentId || "" })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.orgId || !STAFF.includes(user.role)) return NextResponse.json({ error: "Only administrators can manage parents." }, { status: 403 });

    const body = await req.json();
    const { action } = body;
    const now = new Date().toISOString();

    if (action === "create") {
      const { name, email, password, studentId, relationship } = body;
      if (!name?.trim() || !email?.trim()) return NextResponse.json({ error: "Parent name and email are required." }, { status: 400 });
      const cleanEmail = email.trim().toLowerCase();

      const existing = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
      if (existing.length > 0) return NextResponse.json({ error: "An account with this email already exists." }, { status: 400 });

      const parentId = generateId();
      const generatedPassword = password && String(password).length >= 6 ? String(password) : "Parent@" + Math.random().toString(36).slice(2, 7);
      const passwordHash = await hashPassword(generatedPassword);

      await db.insert(users).values({
        id: parentId,
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        role: "parent" as any,
        orgId: user.orgId,
        planType: "school_pro",
        status: "active",
        createdAt: now,
      });

      if (studentId) {
        const studentRows = await db.select().from(users).where(and(eq(users.id, studentId), eq(users.orgId, user.orgId!))).limit(1);
        if (studentRows[0]) {
          await db.insert(parentLinks).values({
            id: generateId(),
            orgId: user.orgId,
            parentId,
            parentName: name.trim(),
            studentId: studentRows[0].id,
            studentName: studentRows[0].name,
            relationship: relationship || "guardian",
            createdAt: now,
          });
        }
      }

      return NextResponse.json({ success: true, parentId, generatedPassword, generated: !(password && String(password).length >= 6) });
    }

    if (action === "link") {
      const { parentId, studentId, relationship } = body;
      if (!parentId || !studentId) return NextResponse.json({ error: "Parent and student are required." }, { status: 400 });
      const studentRows = await db.select().from(users).where(and(eq(users.id, studentId), eq(users.orgId, user.orgId!))).limit(1);
      const parentRows = await db.select().from(users).where(and(eq(users.id, parentId), eq(users.orgId, user.orgId!))).limit(1);
      if (!parentRows[0] || !studentRows[0]) return NextResponse.json({ error: "Parent or student not found." }, { status: 404 });

      const dup = await db.select().from(parentLinks).where(and(eq(parentLinks.parentId, parentId), eq(parentLinks.studentId, studentId))).limit(1);
      if (dup.length === 0) {
        await db.insert(parentLinks).values({
          id: generateId(),
          orgId: user.orgId,
          parentId,
          parentName: parentRows[0].name,
          studentId,
          studentName: studentRows[0].name,
          relationship: relationship || "guardian",
          createdAt: now,
        });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.orgId || !STAFF.includes(user.role)) return NextResponse.json({ error: "Only administrators." }, { status: 403 });

    const body = await req.json();
    const { id, parentId, studentId } = body;

    if (studentId) {
      await db.delete(parentLinks).where(and(eq(parentLinks.parentId, parentId || id), eq(parentLinks.studentId, studentId)));
      return NextResponse.json({ success: true });
    }
    if (id) {
      await db.delete(parentLinks).where(and(eq(parentLinks.parentId, id), eq(parentLinks.orgId, user.orgId!)));
      await db.delete(users).where(and(eq(users.id, id), eq(users.orgId, user.orgId!)));
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
