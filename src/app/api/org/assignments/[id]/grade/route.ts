import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { assignments, assignmentSubmissions } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { generateId } from "@/lib/utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDatabase();
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });
    if (user.role !== "admin" && user.role !== "org_admin" && user.role !== "teacher") {
      return NextResponse.json({ error: "Staff only." }, { status: 403 });
    }

    const assignment = await db.select().from(assignments).where(eq(assignments.id, id)).limit(1);
    if (!assignment[0] || assignment[0].orgId !== user.orgId) {
      return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
    }

    const subs = await db
      .select()
      .from(assignmentSubmissions)
      .where(eq(assignmentSubmissions.assignmentId, id))
      .orderBy(desc(assignmentSubmissions.submittedAt));

    return NextResponse.json({
      assignment: assignment[0],
      submissions: subs,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDatabase();
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin" && user.role !== "org_admin" && user.role !== "teacher") {
      return NextResponse.json({ error: "Staff only." }, { status: 403 });
    }

    const assignment = await db.select().from(assignments).where(eq(assignments.id, id)).limit(1);
    if (!assignment[0] || assignment[0].orgId !== user.orgId) {
      return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
    }

    const body = await req.json();
    const { submissionId, score, feedback } = body;
    if (!submissionId) return NextResponse.json({ error: "Missing submissionId" }, { status: 400 });

    const maxScore = assignment[0].maxScore || 100;
    const parsedScore = score !== undefined && score !== null && score !== "" ? Number(score) : null;
    if (parsedScore !== null && (isNaN(parsedScore) || parsedScore < 0 || parsedScore > maxScore)) {
      return NextResponse.json({ error: `Score must be between 0 and ${maxScore}.` }, { status: 400 });
    }

    const existing = await db
      .select()
      .from(assignmentSubmissions)
      .where(and(eq(assignmentSubmissions.id, submissionId), eq(assignmentSubmissions.assignmentId, id)))
      .limit(1);
    if (!existing[0]) return NextResponse.json({ error: "Submission not found." }, { status: 404 });

    await db
      .update(assignmentSubmissions)
      .set({
        score: parsedScore,
        feedback: feedback?.trim() || null,
        gradedAt: new Date().toISOString(),
      })
      .where(eq(assignmentSubmissions.id, submissionId));

    // Create a grade notification for the student.
    if (parsedScore !== null && existing[0].studentId) {
      const { notifications } = await import("@/db/schema");
      await db.insert(notifications).values({
        id: generateId(),
        orgId: user.orgId,
        userId: existing[0].studentId,
        type: "grade",
        title: `Graded: ${assignment[0].title}`,
        body: `You scored ${parsedScore} out of ${maxScore}.`,
        link: "/student/assignments",
        isRead: 0,
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}