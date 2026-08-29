import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { organizations, users, tests, submissions } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { generateId } from "@/lib/utils";

export async function GET() {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();

    if (!currentUser || (currentUser.role !== "org_admin" && currentUser.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized. Organization admin privileges required." }, { status: 403 });
    }

    const orgId = currentUser.orgId || "org-springfield-academy";
    const orgRows = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
    if (orgRows.length === 0) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const org = orgRows[0];
    const orgMembers = await db.select().from(users).where(eq(users.orgId, org.id)).orderBy(desc(users.createdAt));
    const teachers = orgMembers.filter((m) => m.role === "teacher");
    const students = orgMembers.filter((m) => m.role === "student");

    const orgTests = await db.select().from(tests).where(eq(tests.orgId, org.id)).orderBy(desc(tests.createdAt));

    return NextResponse.json({
      organization: org,
      seats: {
        total: org.seatLimit,
        used: orgMembers.length,
        available: Math.max(0, org.seatLimit - orgMembers.length),
      },
      teachers: teachers.map((t) => ({
        id: t.id,
        name: t.name,
        email: t.email,
        role: t.role,
        status: t.status,
        createdAt: t.createdAt,
      })),
      students: students.map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        studentId: s.studentId,
        role: s.role,
        status: s.status,
        createdAt: s.createdAt,
      })),
      tests: orgTests,
    });
  } catch (error: any) {
    console.error("Org API error:", error);
    return NextResponse.json({ error: error.message || "Failed to load organization" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();

    if (!currentUser || (currentUser.role !== "org_admin" && currentUser.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized. Organization admin privileges required." }, { status: 403 });
    }

    const orgId = currentUser.orgId || "org-springfield-academy";
    const orgRows = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
    if (orgRows.length === 0) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const org = orgRows[0];
    const body = await req.json();
    const { name, email, password = "password123", role = "student", studentId } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 400 });
    }

    // Check seat limits
    const currentMembers = await db.select().from(users).where(eq(users.orgId, org.id));
    if (currentMembers.length >= org.seatLimit) {
      return NextResponse.json({ error: `Seat limit reached (${org.seatLimit} seats). Please upgrade your organization plan.` }, { status: 403 });
    }

    const userId = generateId();
    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();

    await db.insert(users).values({
      id: userId,
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      role: role as any,
      orgId: org.id,
      studentId: studentId ? studentId.trim() : null,
      status: "active",
      createdAt: now,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        name: name.trim(),
        email: cleanEmail,
        role,
        studentId: studentId || null,
      },
      message: `${role === "teacher" ? "Teacher" : "Student"} sub-account created successfully`,
    });
  } catch (error: any) {
    console.error("Create sub-account error:", error);
    return NextResponse.json({ error: error.message || "Failed to create sub-account" }, { status: 500 });
  }
}
