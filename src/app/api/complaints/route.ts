import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { complaints, complaintForms, departments, organizations, users } from "@/db/schema";
import { eq, desc, and, or, like } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { enforceServiceAccess } from "@/lib/plan-limits";
import { generateId } from "@/lib/utils";

// GET complaints: Students get their own; School Admins & delegated reviewers get school complaints with filters
export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const departmentFilter = searchParams.get("department")?.trim();
    const courseFilter = searchParams.get("course")?.trim();
    const natureFilter = searchParams.get("nature")?.trim();
    const levelFilter = searchParams.get("level")?.trim();
    const statusFilter = searchParams.get("status")?.trim();
    const searchQuery = searchParams.get("search")?.trim().toLowerCase();

    // Check if user is School Admin, Super Admin, or Teacher with delegated permissions
    const isStaffReviewer = 
      currentUser.role === "org_admin" || 
      currentUser.role === "admin" || 
      (currentUser.role === "teacher" && (currentUser as any).canManageComplaints === 1);

    // Per-service access control for staff reviewers (granted by super admin)
    if (isStaffReviewer && currentUser.orgId) {
      const denied = await enforceServiceAccess("complaints", currentUser);
      if (denied) return denied;
    }

    if (isStaffReviewer && currentUser.orgId) {
      // 1. Fetch School Complaints with flexible sorting/filtering
      const allOrgComplaints = await db
        .select()
        .from(complaints)
        .where(eq(complaints.orgId, currentUser.orgId))
        .orderBy(desc(complaints.createdAt));

      // Filter in memory for maximum flexibility with compound filters
      let filtered = allOrgComplaints;

      if (departmentFilter && departmentFilter !== "all") {
        filtered = filtered.filter(
          (c) => c.departmentId === departmentFilter || c.departmentName?.toLowerCase() === departmentFilter.toLowerCase()
        );
      }

      if (courseFilter && courseFilter !== "all") {
        filtered = filtered.filter(
          (c) => c.courseCode?.toLowerCase().includes(courseFilter.toLowerCase())
        );
      }

      if (natureFilter && natureFilter !== "all") {
        filtered = filtered.filter(
          (c) => c.nature?.toLowerCase() === natureFilter.toLowerCase()
        );
      }

      if (levelFilter && levelFilter !== "all") {
        filtered = filtered.filter(
          (c) => c.studentLevel?.toLowerCase() === levelFilter.toLowerCase()
        );
      }

      if (statusFilter && statusFilter !== "all") {
        filtered = filtered.filter((c) => c.status === statusFilter);
      }

      if (searchQuery) {
        filtered = filtered.filter(
          (c) =>
            c.studentName.toLowerCase().includes(searchQuery) ||
            c.studentMatricule.toLowerCase().includes(searchQuery) ||
            c.subject.toLowerCase().includes(searchQuery) ||
            (c.courseCode && c.courseCode.toLowerCase().includes(searchQuery))
        );
      }

      // Fetch School Departments & Form Config for the filter bar
      const schoolDepts = await db
        .select()
        .from(departments)
        .where(eq(departments.orgId, currentUser.orgId));

      const formConfig = await db
        .select()
        .from(complaintForms)
        .where(eq(complaintForms.orgId, currentUser.orgId))
        .limit(1);

      // Extract unique course codes & natures from actual complaints for quick filters
      const uniqueCourses = Array.from(
        new Set(allOrgComplaints.map((c) => c.courseCode).filter(Boolean))
      ) as string[];

      const stats = {
        total: allOrgComplaints.length,
        pending: allOrgComplaints.filter((c) => c.status === "pending").length,
        underReview: allOrgComplaints.filter((c) => c.status === "under_review").length,
        resolved: allOrgComplaints.filter((c) => c.status === "resolved").length,
        rejected: allOrgComplaints.filter((c) => c.status === "rejected").length,
      };

      return NextResponse.json({
        isStaffReviewer: true,
        complaints: filtered,
        stats,
        departments: schoolDepts,
        uniqueCourses,
        formConfig: formConfig[0] || null,
      });
    }

    // 2. Student View: Fetch student's own complaints
    const studentComplaints = await db
      .select()
      .from(complaints)
      .where(
        or(
          eq(complaints.studentUserId, currentUser.id),
          currentUser.studentId ? eq(complaints.studentMatricule, currentUser.studentId) : undefined
        )
      )
      .orderBy(desc(complaints.createdAt));

    // Get school form availability
    let formAvailable = false;
    let schoolFormConfig = null;
    let schoolName = "";

    if (currentUser.orgId) {
      const orgRows = await db.select().from(organizations).where(eq(organizations.id, currentUser.orgId)).limit(1);
      if (orgRows.length > 0) schoolName = orgRows[0].name;

      const fRows = await db.select().from(complaintForms).where(eq(complaintForms.orgId, currentUser.orgId)).limit(1);
      if (fRows.length > 0 && fRows[0].status === "active") {
        formAvailable = true;
        let categories = [];
        let levels = [];
        try { categories = JSON.parse(fRows[0].categoriesJson); } catch {}
        try { levels = JSON.parse(fRows[0].levelsJson); } catch {}

        schoolFormConfig = {
          ...fRows[0],
          categories,
          levels,
          allowDocumentUpload: fRows[0].allowDocumentUpload === 1,
        };
      }
    }

    // Get school departments for the student form
    let schoolDepts: any[] = [];
    if (currentUser.orgId) {
      schoolDepts = await db.select().from(departments).where(eq(departments.orgId, currentUser.orgId));
    }

    return NextResponse.json({
      isStaffReviewer: false,
      complaints: studentComplaints,
      formAvailable,
      schoolName,
      formConfig: schoolFormConfig,
      departments: schoolDepts,
    });
  } catch (error: any) {
    console.error("Get complaints error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch complaints" }, { status: 500 });
  }
}

// POST: Student submits a new complaint OR Staff Reviewer updates complaint status / resolution
export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    // A. STAFF REVIEWER RESOLUTION ACTION
    if (action === "resolve" || action === "update_status") {
      const isStaffReviewer = 
        currentUser.role === "org_admin" || 
        currentUser.role === "admin" || 
        (currentUser.role === "teacher" && (currentUser as any).canManageComplaints === 1);

      if (!isStaffReviewer) {
        return NextResponse.json({ error: "Permission denied. You do not have complaint resolution access." }, { status: 403 });
      }

      const { complaintId, status, resolutionNote } = body;

      if (!complaintId || !status) {
        return NextResponse.json({ error: "Complaint ID and status are required." }, { status: 400 });
      }

      const now = new Date().toISOString();

      await db.update(complaints).set({
        status,
        resolutionNote: resolutionNote || null,
        assignedReviewerUserId: currentUser.id,
        assignedReviewerName: currentUser.name,
        resolvedAt: status === "resolved" || status === "rejected" ? now : null,
        updatedAt: now,
      }).where(eq(complaints.id, complaintId));

      return NextResponse.json({
        success: true,
        message: `Complaint updated to '${status}'.`,
      });
    }

    // B. STUDENT SUBMITTING A NEW COMPLAINT
    const orgId = body.orgId || currentUser.orgId;

    if (!orgId) {
      return NextResponse.json({ 
        error: "You must be enrolled under a School / Organization to submit an academic complaint." 
      }, { status: 400 });
    }

    // Verify school form is active
    const formRows = await db.select().from(complaintForms).where(eq(complaintForms.orgId, orgId)).limit(1);
    if (formRows.length === 0 || formRows[0].status !== "active") {
      return NextResponse.json({ 
        error: "Complaint submission is currently disabled or not yet configured by your school administration." 
      }, { status: 403 });
    }

    const {
      studentName = currentUser.name,
      studentMatricule = currentUser.studentId || "",
      studentPhone = currentUser.email,
      departmentId,
      departmentName,
      studentLevel,
      courseCode,
      nature,
      subject,
      description,
      documentUrl,
      documentName,
    } = body;

    if (!studentName || !studentMatricule) {
      return NextResponse.json({ error: "Student Full Name and Student Matricule are required." }, { status: 400 });
    }

    if (!studentLevel || !nature || !subject || !description) {
      return NextResponse.json({ 
        error: "Student Level / Year, Nature of Complaint, Subject, and Description are required." 
      }, { status: 400 });
    }

    const complaintId = generateId();
    const now = new Date().toISOString();

    await db.insert(complaints).values({
      id: complaintId,
      orgId,
      studentUserId: currentUser.id,
      studentName: studentName.trim(),
      studentMatricule: studentMatricule.trim(),
      studentPhone: studentPhone ? studentPhone.trim() : null,
      departmentId: departmentId || null,
      departmentName: departmentName || null,
      studentLevel: studentLevel.trim(),
      courseCode: courseCode ? courseCode.trim().toUpperCase() : null,
      nature: nature.trim(),
      subject: subject.trim(),
      description: description.trim(),
      documentUrl: documentUrl || null,
      documentName: documentName || null,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      success: true,
      message: "Your academic complaint has been submitted successfully to school administration.",
      complaintId,
    });
  } catch (error: any) {
    console.error("Submit complaint error:", error);
    return NextResponse.json({ error: error.message || "Failed to process complaint" }, { status: 500 });
  }
}
