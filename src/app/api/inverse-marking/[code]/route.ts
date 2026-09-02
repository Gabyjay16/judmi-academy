import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { inverseMarkings, inverseMarkingSubmissions, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

type MarkEntry = { qId: string; marks: number; justification: string };

function parseQuestions(raw: string | null): any[] {
  try {
    const qs = JSON.parse(raw || "[]");
    if (Array.isArray(qs)) return qs;
    return [];
  } catch {
    return [];
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();
    const { code } = await params;

    const rows = await db
      .select()
      .from(inverseMarkings)
      .where(eq(inverseMarkings.code, code.trim().toUpperCase()))
      .limit(1);
    if (rows.length === 0) {
      return NextResponse.json({ error: "No inverse marking exercise found for that code. Check the code and try again." }, { status: 404 });
    }
    const ex = rows[0];

    const isOwner =
      currentUser &&
      (currentUser.role === "admin" ||
        currentUser.role === "super_admin" ||
        ex.ownerUserId === currentUser.id ||
        (currentUser.role === "org_admin" && !!ex.orgId && ex.orgId === currentUser.orgId));

    const ownerRows = ex.ownerUserId ? await db.select().from(users).where(eq(users.id, ex.ownerUserId)).limit(1) : [];
    const questions = parseQuestions(ex.questionsJson);

    if (isOwner) {
      const submissions = await db
        .select()
        .from(inverseMarkingSubmissions)
        .where(eq(inverseMarkingSubmissions.exerciseId, ex.id))
        .orderBy(desc(inverseMarkingSubmissions.submittedAt));

      const subs = submissions.map((s) => {
        let marks: MarkEntry[] = [];
        try {
          const parsed = JSON.parse(s.marksJson || "[]");
          if (Array.isArray(parsed)) marks = parsed;
        } catch {}
        return {
          id: s.id,
          studentName: s.studentName,
          studentEmail: s.studentEmail,
          marks,
          totalTeacherMarks: s.totalTeacherMarks,
          totalControlMarks: s.totalControlMarks,
          totalMaxMarks: s.totalMaxMarks,
          deviationTotal: s.deviationTotal,
          accuracyScore: s.accuracyScore,
          passed: s.passed === 1,
          leniency: s.leniency,
          submittedAt: s.submittedAt,
        };
      });

      return NextResponse.json({
        exercise: {
          id: ex.id,
          code: ex.code,
          title: ex.title,
          instruction: ex.instruction,
          questions,
          tolerance: ex.tolerance,
          passThreshold: ex.passThreshold,
          durationMinutes: ex.durationMinutes,
          status: ex.status,
          showResultsToStudents: ex.showResultsToStudents === 1,
          createdAt: ex.createdAt,
        },
        teacher: ownerRows[0] ? { name: ownerRows[0].name, email: ownerRows[0].email } : null,
        submissions: subs,
      });
    }

    // Public/student view: reference answer + prompts are visible (students mark them),
    // but the teacher's control marks stay hidden until the student submits.
    const publicQuestions = questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      maxMarks: q.maxMarks,
      markScheme: q.markScheme,
      answer: q.answer,
      isTrap: Boolean(q.isTrap),
      controlMark: undefined,
    }));

    return NextResponse.json({
      exercise: {
        id: ex.id,
        code: ex.code,
        title: ex.title,
        instruction: ex.instruction,
        questions: publicQuestions,
        tolerance: ex.tolerance,
        passThreshold: ex.passThreshold,
        durationMinutes: ex.durationMinutes,
        status: ex.status,
        showResultsToStudents: ex.showResultsToStudents === 1,
        createdAt: ex.createdAt,
      },
      teacher: ownerRows[0] ? { name: ownerRows[0].name } : null,
      owner: false,
    });
  } catch (error: any) {
    console.error("Inverse marking lookup error:", error);
    return NextResponse.json({ error: error?.message || "Failed to load this exercise." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();
    const { code: id } = await params;
    if (!currentUser) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const rows = await db.select().from(inverseMarkings).where(eq(inverseMarkings.id, id)).limit(1);
    if (rows.length === 0) {
      return NextResponse.json({ error: "Exercise not found." }, { status: 404 });
    }
    const ex = rows[0];
    const isOwner =
      currentUser.role === "admin" ||
      currentUser.role === "super_admin" ||
      ex.ownerUserId === currentUser.id ||
      (currentUser.role === "org_admin" && !!ex.orgId && ex.orgId === currentUser.orgId);
    if (!isOwner) {
      return NextResponse.json({ error: "You can only edit your own exercises." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");
    if (action === "set_status") {
      const status = String(body?.status || "");
      if (status !== "active" && status !== "ended") {
        return NextResponse.json({ error: "Invalid status." }, { status: 400 });
      }
      await db
        .update(inverseMarkings)
        .set({ status, updatedAt: new Date().toISOString() })
        .where(eq(inverseMarkings.id, id));
      return NextResponse.json({ success: true, status });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error: any) {
    console.error("Update inverse marking error:", error);
    return NextResponse.json({ error: error?.message || "Failed to update the exercise." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();
    const { code: id } = await params;
    if (!currentUser) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const rows = await db.select().from(inverseMarkings).where(eq(inverseMarkings.id, id)).limit(1);
    if (rows.length === 0) {
      return NextResponse.json({ error: "Exercise not found." }, { status: 404 });
    }
    const ex = rows[0];
    const isOwner =
      currentUser.role === "admin" ||
      currentUser.role === "super_admin" ||
      ex.ownerUserId === currentUser.id ||
      (currentUser.role === "org_admin" && !!ex.orgId && ex.orgId === currentUser.orgId);
    if (!isOwner) {
      return NextResponse.json({ error: "You can only delete your own exercises." }, { status: 403 });
    }

    await db.delete(inverseMarkings).where(eq(inverseMarkings.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete inverse marking error:", error);
    return NextResponse.json({ error: "Failed to delete the exercise." }, { status: 500 });
  }
}

export const maxDuration = 60;