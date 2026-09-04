import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { studyResources, courses } from "@/db/schema";
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

    const courseFilter = req.nextUrl.searchParams.get("course") || undefined;

    let rows = await db.select().from(studyResources).where(eq(studyResources.orgId, user.orgId)).orderBy(desc(studyResources.createdAt));
    if (courseFilter) rows = rows.filter((r) => r.courseId === courseFilter);

    let courseRows: any[] = [];
    try { courseRows = await db.select().from(courses); } catch {}

    return NextResponse.json({
      resources: rows.map((r) => ({ ...r })),
      courses: courseRows
        .filter((c) => (c as any).orgId === user.orgId)
        .map((c) => ({ id: c.id, name: (c as any).name || (c as any).title || "Untitled" })),
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
    if (!user.orgId || !STAFF.includes(user.role)) return NextResponse.json({ error: "Only staff can upload resources." }, { status: 403 });

    const body = await req.json();
    const { courseId, courseName, departmentId, title, description, url, fileType } = body;
    if (!title?.trim()) return NextResponse.json({ error: "Resource title is required." }, { status: 400 });

    await db.insert(studyResources).values({
      id: generateId(),
      orgId: user.orgId,
      courseId: courseId || null,
      courseName: courseName || null,
      departmentId: departmentId || null,
      title: title.trim(),
      description: description?.trim() || null,
      url: url?.trim() || null,
      fileType: fileType || "link",
      uploadedById: user.id,
      uploadedByName: user.name,
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
    if (!user.orgId || !STAFF.includes(user.role)) return NextResponse.json({ error: "Only staff." }, { status: 403 });

    const body = await req.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    await db.delete(studyResources).where(eq(studyResources.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
