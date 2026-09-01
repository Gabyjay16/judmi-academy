import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { users, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword, generateSessionToken, getCurrentUser, AUTH_COOKIE_NAME } from "@/lib/auth";
import { generateId } from "@/lib/utils";
import { seedDemoData } from "@/db/seed";

// Persistent login: keep users signed in until they explicitly log out.
const SESSION_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    await seedDemoData();

    // Check header token as fallback
    const headerToken = req.headers.get("x-session-token") || req.headers.get("authorization");
    const user = await getCurrentUser(headerToken);
    
    if (!user) {
      return NextResponse.json({ user: null });
    }

    let organization = null;
    if (user.orgId) {
      const orgRows = await db.select().from(organizations).where(eq(organizations.id, user.orgId)).limit(1);
      if (orgRows.length > 0) organization = orgRows[0];
    }

    const token = generateSessionToken(user.id);
    const { getGlobalSystemSettings } = await import("@/lib/plan-limits");
    const globalSettings = await getGlobalSystemSettings();

    const isProOverride = (globalSettings.freeAllTeachers && (user.role === "teacher" || user.role === "admin")) ||
      (globalSettings.freeAllOrganizations && (user.role === "org_admin" || user.orgId)) ||
      user.planType === "individual" || user.planType === "school_pro" || user.role === "admin";

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        orgId: user.orgId,
        organizationName: organization?.name || null,
        planType: isProOverride && user.planType === "free" ? "individual" : (user.planType || "free"),
        actualPlanType: user.planType || "free",
        isPro: isProOverride,
        globalFreeAllTeachers: globalSettings.freeAllTeachers,
        globalFreeAllOrganizations: globalSettings.freeAllOrganizations,
        examGenerationsUsed: user.examGenerationsUsed || 0,
        scriptScansUsed: user.scriptScansUsed || 0,
        essayGradingsUsed: user.essayGradingsUsed || 0,
        status: user.status,
      },
      token,
      globalSettings,
    });

    // Ensure session cookie is refreshed and persistent (users stay logged in until they log out)
    response.cookies.set(AUTH_COOKIE_NAME, token, {
      path: "/",
      httpOnly: true,
      maxAge: SESSION_MAX_AGE, // persistent login
      sameSite: "lax",
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    try { await seedDemoData(); } catch {}
    const body = await req.json();
    const { action = "login" } = body;

    // 1. LOGOUT
    if (action === "logout") {
      const response = NextResponse.json({ success: true, message: "Logged out successfully" });
      response.cookies.set(AUTH_COOKIE_NAME, "", {
        path: "/",
        maxAge: 0,
        httpOnly: true,
      });
      response.cookies.set("evalai_session", "", {
        path: "/",
        maxAge: 0,
        httpOnly: true,
      });
      return response;
    }

    // 2. LOGIN
    if (action === "login") {
      const identifier = (body.phone || body.email || "").trim().toLowerCase();
      const { password } = body;
      if (!identifier || !password) {
        return NextResponse.json({ error: "Phone number / email and password are required" }, { status: 400 });
      }

      const userRows = await db.select().from(users).where(eq(users.email, identifier)).limit(1);
      if (userRows.length === 0) {
        return NextResponse.json({ error: "Invalid phone number / email or password" }, { status: 401 });
      }

      const user = userRows[0];

      // Branded school login: if an orgId/orgSlug is provided, the account must belong to that organization.
      if (body.orgId || body.orgSlug) {
        let scopedOrgId: string | null = body.orgId || null;
        if (body.orgSlug && !scopedOrgId) {
          const orgRows = await db.select().from(organizations).where(eq(organizations.slug, String(body.orgSlug).toLowerCase())).limit(1);
          if (orgRows.length > 0) scopedOrgId = orgRows[0].id;
        }
        if (!user.orgId || user.orgId !== scopedOrgId) {
          return NextResponse.json({ error: "This account does not belong to this school." }, { status: 403 });
        }
      }

      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return NextResponse.json({ error: "Invalid phone number / email or password" }, { status: 401 });
      }

      if (user.status === "suspended") {
        return NextResponse.json({ error: "Your account is suspended. Please contact the administrator." }, { status: 403 });
      }

      let organization = null;
      if (user.orgId) {
        const orgRows = await db.select().from(organizations).where(eq(organizations.id, user.orgId)).limit(1);
        if (orgRows.length > 0) organization = orgRows[0];
      }

      const token = generateSessionToken(user.id);
      const response = NextResponse.json({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          studentId: user.studentId,
          orgId: user.orgId,
          organizationName: organization?.name || null,
          planType: user.planType || "free",
        },
      });

      response.cookies.set(AUTH_COOKIE_NAME, token, {
        path: "/",
        httpOnly: true,
        maxAge: SESSION_MAX_AGE, // persistent login
        sameSite: "lax",
      });

      return response;
    }

    // 3. SIGNUP
    if (action === "signup") {
      const { name, password, role = "student", organizationName, studentId, schoolCode, departmentId } = body;
      const cleanEmail = (body.phone || body.email || "").trim().toLowerCase();

      if (!name || !cleanEmail || !password) {
        return NextResponse.json({ error: "Name, phone number / email, and password are required" }, { status: 400 });
      }

      const existing = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
      if (existing.length > 0) {
        return NextResponse.json({ error: "An account with this phone number / email already exists" }, { status: 400 });
      }

      const now = new Date().toISOString();
      let createdOrgId: string | null = null;
      let linkedOrgName: string | null = organizationName || null;

      // If signing up as School / Organization Owner
      if (role === "org_admin" && organizationName) {
        createdOrgId = generateId();
        const slug = organizationName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        await db.insert(organizations).values({
          id: createdOrgId,
          name: organizationName.trim(),
          slug: `${slug}-${Math.floor(Math.random() * 899 + 100)}`,
          planType: "school_pro",
          seatLimit: 100,
          ownerEmail: cleanEmail,
          status: "active",
          createdAt: now,
        });
      } else if (schoolCode && schoolCode.trim()) {
        // Student joining an existing school by code/slug
        if (role === "student" && (!studentId || !studentId.trim())) {
          return NextResponse.json({ 
            error: "Student Matricule is strictly required when registering under a School Organization." 
          }, { status: 400 });
        }

        const cleanCode = schoolCode.trim().toLowerCase();
        const orgRows = await db.select().from(organizations).limit(100);
        const orgMatch = orgRows.find((o) => o.slug?.toLowerCase() === cleanCode || o.id?.toLowerCase() === cleanCode || o.name?.toLowerCase() === cleanCode);

        if (!orgMatch) {
          return NextResponse.json({ 
            error: "Invalid School Code. Please verify the code with your school administrator or leave it blank to register as an independent student." 
          }, { status: 400 });
        }

        // Check seat limit
        const currentMembers = await db.select().from(users).where(eq(users.orgId, orgMatch.id));
        if (currentMembers.length >= orgMatch.seatLimit) {
          return NextResponse.json({ 
            error: `School organization '${orgMatch.name}' has reached its member limit (${orgMatch.seatLimit} seats). Please contact your administrator.` 
          }, { status: 403 });
        }

        createdOrgId = orgMatch.id;
        linkedOrgName = orgMatch.name;
      } else if (body.orgId || body.orgSlug) {
        // Signing up via a school's branded page: link directly to that organization.
        if (role === "student" && (!studentId || !studentId.trim())) {
          return NextResponse.json({
            error: "Student Matricule is required when registering under a School."
          }, { status: 400 });
        }
        let directOrgId: string | null = body.orgId || null;
        if (body.orgSlug && !directOrgId) {
          const orgRows = await db.select().from(organizations).where(eq(organizations.slug, String(body.orgSlug).toLowerCase())).limit(1);
          if (orgRows.length > 0) directOrgId = orgRows[0].id;
        }
        if (!directOrgId) {
          return NextResponse.json({ error: "Invalid school link." }, { status: 400 });
        }
        const orgRows = await db.select().from(organizations).where(eq(organizations.id, directOrgId)).limit(1);
        if (orgRows.length === 0) {
          return NextResponse.json({ error: "School not found." }, { status: 404 });
        }
        const currentMembers = await db.select().from(users).where(eq(users.orgId, directOrgId));
        if (currentMembers.length >= orgRows[0].seatLimit) {
          return NextResponse.json({
            error: `School organization '${orgRows[0].name}' has reached its member limit (${orgRows[0].seatLimit} seats). Please contact your administrator.`
          }, { status: 403 });
        }
        createdOrgId = directOrgId;
        linkedOrgName = orgRows[0].name;
      }

      const userId = generateId();
      const passwordHash = await hashPassword(password);
      const planType = (role === "org_admin" || createdOrgId) ? "school_pro" : "free";

      await db.insert(users).values({
        id: userId,
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        role: role as any,
        orgId: createdOrgId,
        departmentId: departmentId || null,
        studentId: role === "student" ? studentId || null : null,
        planType,
        status: "active",
        createdAt: now,
      });

      const token = generateSessionToken(userId);
      const response = NextResponse.json({
        success: true,
        token,
        user: {
          id: userId,
          name: name.trim(),
          email: cleanEmail,
          role,
          studentId: studentId || null,
          orgId: createdOrgId,
          organizationName: linkedOrgName,
          planType,
        },
      });

      response.cookies.set(AUTH_COOKIE_NAME, token, {
        path: "/",
        httpOnly: true,
        maxAge: SESSION_MAX_AGE, // persistent login
        sameSite: "lax",
      });

      return response;
    }

    // 4. UPGRADE PLAN (For already logged-in users)
    if (action === "upgrade_plan" || action === "upgrade") {
      const headerToken = req.headers.get("x-session-token") || req.headers.get("authorization");
      const currentUser = await getCurrentUser(headerToken);

      if (!currentUser) {
        return NextResponse.json({ error: "Please log in to upgrade your account" }, { status: 401 });
      }

      const { plan = "individual", organizationName } = body;
      const targetPlanType = plan === "school_pro" ? "school_pro" : "individual";
      const targetRole = plan === "school_pro" ? "org_admin" : (currentUser.role === "student" ? "teacher" : currentUser.role);

      let createdOrgId = currentUser.orgId;
      let linkedOrgName = organizationName || null;

      if (plan === "school_pro" && organizationName && !currentUser.orgId) {
        createdOrgId = generateId();
        const slug = organizationName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        const now = new Date().toISOString();
        await db.insert(organizations).values({
          id: createdOrgId,
          name: organizationName.trim(),
          slug: `${slug}-${Math.floor(Math.random() * 899 + 100)}`,
          planType: "school_pro",
          seatLimit: 50,
          ownerEmail: currentUser.email,
          status: "active",
          createdAt: now,
        });
      }

      await db.update(users).set({
        planType: targetPlanType,
        role: targetRole as any,
        orgId: createdOrgId,
      }).where(eq(users.id, currentUser.id));

      const updatedUser = {
        ...currentUser,
        planType: targetPlanType,
        role: targetRole,
        orgId: createdOrgId,
        organizationName: linkedOrgName || null,
      };

      const token = generateSessionToken(currentUser.id);
      const response = NextResponse.json({
        success: true,
        message: "Account plan successfully upgraded via Mobile Money!",
        user: updatedUser,
        token,
      });

      response.cookies.set(AUTH_COOKIE_NAME, token, {
        path: "/",
        httpOnly: true,
        maxAge: SESSION_MAX_AGE,
        sameSite: "lax",
      });

      return response;
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Auth API error:", error);
    return NextResponse.json({ error: error.message || "Authentication error" }, { status: 500 });
  }
}
