import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { disciplineRecords } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { generateId } from "@/lib/utils";

const STAFF = ["admin", "org_admin", "teacher"];

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    if (user.role === "student") {
      const rows = await db
        .select()
        .from(disciplineRecords)
        .where(and(eq(disciplineRecords.orgId, user.orgId), eq(disciplineRecords.studentId, user.id)))
        .orderBy(desc(disciplineRecords.createdAt));
      return NextResponse.json({ records: rows });
    }

    if (!STAFF.includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const studentId = req.nextUrl.searchParams.get("studentId");
    const query = studentId
      ? and(eq(disciplineRecords.orgId, user.orgId), eq(disciplineRecords.studentId, studentId))
      : eq(disciplineRecords.orgId, user.orgId);

    const rows = await db.select().from(disciplineRecords).where(query).orderBy(desc(disciplineRecords.createdAt));
    return NextResponse.json({ records: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.orgId || !STAFF.includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { studentId, studentName, type, severity, title, notes } = body;
    if (!studentId || !title?.trim()) return NextResponse.json({ error: "Student and title are required." }, { status: 400 });

    await db.insert(disciplineRecords).values({
      id: generateId(),
      orgId: user.orgId,
      studentId,
      studentName: studentName?.trim() || null,
      type: type || "incident",
      severity: severity || (type === "reward" ? "acknowledgment" : "minor"),
      title: title.trim(),
      notes: notes?.trim() || null,
      recordedBy: user.id,
      recordedByName: user.name,
      createdAt: new Date().toISOString(),
    });

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
    if (user.role !== "admin" && user.role !== "org_admin") return NextResponse.json({ error: "Only administrators." }, { status: 403 });

    const body = await req.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    await db.delete(disciplineRecords).where(and(eq(disciplineRecords.id, id), eq(disciplineRecords.orgId, user.orgId!)));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
