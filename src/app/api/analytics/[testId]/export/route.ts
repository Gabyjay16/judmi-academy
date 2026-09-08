import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { tests, submissions, organizations } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { generateExcel } from "@/lib/export-doc";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { testId } = await params;
    const testRows = await db.select().from(tests).where(eq(tests.id, testId)).limit(1);
    if (testRows.length === 0) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }
    const test = testRows[0];

    // Brand the workbook with the school name when the exam belongs to a school.
    let schoolName: string | null = null;
    if (test.orgId) {
      const orgRows = await db.select().from(organizations).where(eq(organizations.id, test.orgId)).limit(1);
      if (orgRows.length > 0) {
        schoolName = orgRows[0].brandName || orgRows[0].name;
      }
    }

    const testSubmissions = await db
      .select()
      .from(submissions)
      .where(eq(submissions.testId, testId))
      .orderBy(desc(submissions.submittedAt));

    if (testSubmissions.length === 0) {
      return NextResponse.json({ error: "No students have taken this exam yet." }, { status: 400 });
    }

    const formatTime = (sec: number) => {
      const m = Math.floor((sec || 0) / 60);
      const s = Math.floor((sec || 0) % 60);
      return `${m}m ${s}s`;
    };

    const columns = [
      { name: "Student Name", type: "text" },
      { name: "Student ID / Matricule", type: "text" },
      { name: "Email", type: "text" },
      { name: "Score", type: "number" },
      { name: "Max Score", type: "number" },
      { name: "Percentage", type: "number" },
      { name: "Status", type: "text" },
      { name: "Time Spent", type: "text" },
      { name: "Submitted At", type: "text" },
    ];

    // "Percentage" as string with % for readability in the spreadsheet.
    const rows = testSubmissions.map((s) => ({
      "Student Name": s.studentName || "",
      "Student ID / Matricule": s.studentId || "—",
      "Email": s.studentEmail || "",
      "Score": String(s.score ?? 0),
      "Max Score": String(s.maxScore ?? 0),
      "Percentage": `${s.percentage ?? 0}%`,
      "Status": s.passed === 1 ? "Passed" : "Failed",
      "Time Spent": formatTime(s.timeSpentSeconds || 0),
      "Submitted At": new Date(s.submittedAt).toLocaleString(),
    }));

    const title = `${schoolName ? `${schoolName} — ` : ""}${test.title} — Student Results`;
    const buf = await generateExcel({
      title: title.slice(0, 31),
      columns,
      rows,
      generatedAt: new Date().toLocaleString(),
    });

    const slug = (test.code || test.title || "test").toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "test";

    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${slug}_students.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error("Test results Excel export error:", error);
    return NextResponse.json({ error: error?.message || "Failed to export results." }, { status: 500 });
  }
}
