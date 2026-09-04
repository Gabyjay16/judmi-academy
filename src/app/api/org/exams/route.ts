import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { exams } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
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
      .from(exams)
      .where(eq(exams.orgId, user.orgId))
      .orderBy(desc(exams.examDate), desc(exams.createdAt));

    return NextResponse.json({ exams: rows });
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
    if (user.role !== "admin" && user.role !== "org_admin" && user.role !== "teacher") {
      return NextResponse.json({ error: "Only school staff can create exams." }, { status: 403 });
    }

    const body = await req.json();
    const { courseId, courseName, title, description, examDate, startTime, endTime, venue, duration, totalMarks, instructions } = body;

    if (!title?.trim() || !examDate || !startTime || !endTime) {
      return NextResponse.json({ error: "Title, date, start time, and end time are required." }, { status: 400 });
    }

    const id = generateId();
    const now = new Date().toISOString();

    await db.insert(exams).values({
      id,
      orgId: user.orgId,
      courseId: courseId || null,
      courseName: courseName?.trim() || null,
      title: title.trim(),
      description: description?.trim() || null,
      examDate,
      startTime,
      endTime,
      venue: venue?.trim() || null,
      duration: duration ? Number(duration) : null,
      totalMarks: totalMarks ? Number(totalMarks) : 100,
      instructions: instructions?.trim() || null,
      createdBy: user.id,
      createdByName: user.name,
      createdAt: now,
    });

    return NextResponse.json({ success: true, id });
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
      return NextResponse.json({ error: "Only administrators can delete exams." }, { status: 403 });
    }
    const body = await req.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    await db.delete(exams).where(and(eq(exams.id, id), eq(exams.orgId, user.orgId!)));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}