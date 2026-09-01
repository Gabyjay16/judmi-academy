import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { meetings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { MeetingSummary } from "@/lib/minutes";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const rows = await db.select().from(meetings).where(eq(meetings.id, id)).limit(1);
    if (rows.length === 0) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }
    const m = rows[0];

    const isOrgAdmin = currentUser.role === "org_admin" || currentUser.role === "admin";
    const canAccess = isOrgAdmin ? m.orgId === currentUser.orgId : m.ownerUserId === currentUser.id || m.orgId === currentUser.orgId;
    if (!canAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const summary = m.summaryJson ? (JSON.parse(m.summaryJson) as MeetingSummary) : null;

    const children: Paragraph[] = [];

    // Title
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: summary?.title || m.title, bold: true, size: 34 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
        children: [
          new TextRun({ text: `Date: ${m.meetingDate || "—"}    •    Duration: ${Math.round((m.audioDurationSeconds || 0) / 60)} minutes`, italics: true, size: 20 }),
        ],
      })
    );

    if (summary) {
      // Attendees / Speakers
      children.push(
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "Attendees", bold: true })] }),
        ...summary.speakers.map(
          (s) => new Paragraph({ children: [new TextRun({ text: `• ${s}`, size: 22 })] })
        )
      );

      // Overview
      children.push(
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "Overview", bold: true })] }),
        new Paragraph({ children: [new TextRun({ text: summary.overview, size: 22 })] })
      );

      // Key Points
      children.push(
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "Key Points", bold: true })] }),
        ...summary.keyPoints.map((k) => new Paragraph({ children: [new TextRun({ text: `• ${k}`, size: 22 })] }))
      );

      // Decisions
      if (summary.decisions.length > 0) {
        children.push(
          new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "Decisions", bold: true })] }),
          ...summary.decisions.map((d) => new Paragraph({ children: [new TextRun({ text: `• ${d}`, size: 22 })] }))
        );
      }

      // Action Items
      if (summary.actionItems.length > 0) {
        children.push(
          new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "Action Items", bold: true })] }),
          ...summary.actionItems.map(
            (a) =>
              new Paragraph({
                children: [
                  new TextRun({ text: `• ${a.task}`, size: 22 }),
                  a.owner ? new TextRun({ text: `  (Owner: ${a.owner})`, italics: true, size: 20 }) : new TextRun({ text: "", size: 22 }),
                ],
              })
          )
        );
      }
    }

    const doc = new Document({
      sections: [{ children }],
    });

    const buf = await Packer.toBuffer(doc);
    const safeTitle = (summary?.title || m.title || "meeting-minutes").toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "meeting-minutes";

    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${safeTitle}-minutes.docx"`,
      },
    });
  } catch (error: any) {
    console.error("Export meeting minutes error:", error);
    return NextResponse.json({ error: error?.message || "Failed to export meeting minutes." }, { status: 500 });
  }
}