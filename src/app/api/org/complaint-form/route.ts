import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { complaintForms, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { generateId } from "@/lib/utils";

const DEFAULT_CATEGORIES = [
  "Grade Discrepancy / Incorrect Calculation",
  "Missing Continuous Assessment (CA) Mark",
  "Missing Final Exam / Resit Mark",
  "Course Registration / Portal Enrollment Error",
  "Lecturer Conduct / Class Attendance Issue",
  "Timetable & Exam Scheduling Clash",
  "Tuition & Financial Record Discrepancy",
  "Other Academic Grievance",
];

const DEFAULT_LEVELS = [
  "Year 1",
  "Year 2",
  "Year 3",
  "Year 4",
  "Year 5",
  "Year 6",
  "Year 7",
  "Year 8",
];

// GET the complaint form config for an organization
export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const { searchParams } = new URL(req.url);
    const orgIdParam = searchParams.get("orgId");
    const schoolCode = searchParams.get("schoolCode")?.trim().toLowerCase();

    let targetOrgId = orgIdParam;

    if (!targetOrgId && schoolCode) {
      const orgRows = await db.select().from(organizations).limit(100);
      const matched = orgRows.find(
        (o) => o.slug?.toLowerCase() === schoolCode || o.id?.toLowerCase() === schoolCode || o.name?.toLowerCase() === schoolCode
      );
      if (matched) targetOrgId = matched.id;
    }

    if (!targetOrgId) {
      const currentUser = await getCurrentUser();
      if (currentUser?.orgId) targetOrgId = currentUser.orgId;
    }

    if (!targetOrgId) {
      return NextResponse.json({
        form: null,
        available: false,
        message: "No organization found.",
      });
    }

    const rows = await db.select().from(complaintForms).where(eq(complaintForms.orgId, targetOrgId)).limit(1);

    if (rows.length === 0) {
      return NextResponse.json({
        form: {
          id: "",
          orgId: targetOrgId,
          status: "inactive",
          categories: DEFAULT_CATEGORIES,
          levels: DEFAULT_LEVELS,
          allowDocumentUpload: 1,
          instructions: "Please provide clear and accurate details regarding your academic petition.",
        },
        available: false,
        message: "Complaint form is not yet configured or activated by school administration.",
      });
    }

    const f = rows[0];
    let categories = DEFAULT_CATEGORIES;
    let levels = DEFAULT_LEVELS;

    try { categories = JSON.parse(f.categoriesJson); } catch {}
    try { levels = JSON.parse(f.levelsJson); } catch {}

    return NextResponse.json({
      form: {
        id: f.id,
        orgId: f.orgId,
        status: f.status,
        categories,
        levels,
        allowDocumentUpload: f.allowDocumentUpload === 1,
        instructions: f.instructions || "",
        updatedAt: f.updatedAt,
      },
      available: f.status === "active",
    });
  } catch (error: any) {
    console.error("Get complaint form error:", error);
    return NextResponse.json({ error: error.message || "Failed to get complaint form" }, { status: 500 });
  }
}

// POST update complaint form configuration (Admin only)
export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();

    if (!currentUser || (currentUser.role !== "org_admin" && currentUser.role !== "admin")) {
      return NextResponse.json({ error: "Only school administrators can configure complaint forms." }, { status: 403 });
    }

    if (!currentUser.orgId) {
      return NextResponse.json({ error: "No school organization linked." }, { status: 400 });
    }

    const body = await req.json();
    const {
      status = "active", // "active" | "inactive"
      categories = DEFAULT_CATEGORIES,
      levels = DEFAULT_LEVELS,
      allowDocumentUpload = true,
      instructions = "",
    } = body;

    const now = new Date().toISOString();
    const existing = await db.select().from(complaintForms).where(eq(complaintForms.orgId, currentUser.orgId)).limit(1);

    if (existing.length > 0) {
      await db.update(complaintForms).set({
        status,
        categoriesJson: JSON.stringify(categories),
        levelsJson: JSON.stringify(levels),
        allowDocumentUpload: allowDocumentUpload ? 1 : 0,
        instructions,
        updatedAt: now,
      }).where(eq(complaintForms.id, existing[0].id));
    } else {
      const id = generateId();
      await db.insert(complaintForms).values({
        id,
        orgId: currentUser.orgId,
        status,
        categoriesJson: JSON.stringify(categories),
        levelsJson: JSON.stringify(levels),
        allowDocumentUpload: allowDocumentUpload ? 1 : 0,
        instructions,
        updatedAt: now,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Complaint form configuration updated (${status === "active" ? "Enabled for Students" : "Disabled"}).`,
    });
  } catch (error: any) {
    console.error("Update complaint form error:", error);
    return NextResponse.json({ error: error.message || "Failed to update complaint form" }, { status: 500 });
  }
}
