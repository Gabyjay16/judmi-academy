import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { assignments, assignmentSubmissions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { generateId } from "@/lib/utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDatabase();
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });
    if (user.role !== "student") return NextResponse.json({ error: "Only students can submit assignments." }, { status: 403 });

    const a = await db.select().from(assignments).where(eq(assignments.id, id)).limit(1);
    if (!a[0] || a[0].orgId !== user.orgId) return NextResponse.json({ error: "Assignment not found." }, { status: 404 });

    const body = await req.json();
    const { content } = body;
    if (!content?.trim()) return NextResponse.json({ error: "Submission text is required." }, { status: 400 });

    const existing = await db
      .select()
      .from(assignmentSubmissions)
      .where(and(eq(assignmentSubmissions.assignmentId, id), eq(assignmentSubmissions.studentId, user.id)))
      .limit(1);

    const now = new Date().toISOString();

    if (existing[0]) {
      await db
        .update(assignmentSubmissions)
        .set({ content: content.trim(), submittedAt: now, score: null, feedback: null, gradedAt: null })
        .where(eq(assignmentSubmissions.id, existing[0].id));
      return NextResponse.json({ success: true, resubmitted: true });
    }

    await db.insert(assignmentSubmissions).values({
      id: generateId(),
      orgId: user.orgId,
      assignmentId: id,
      studentId: user.id,
      studentName: user.name,
      content: content.trim(),
      submittedAt: now,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}