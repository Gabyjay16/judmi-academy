import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { users, organizations, systemSettings } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();
    
    // Ensure caller is admin
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        username: users.username,
        role: users.role,
        planType: users.planType,
        status: users.status,
        orgId: users.orgId,
        studentId: users.studentId,
        examGenerationsUsed: users.examGenerationsUsed,
        scriptScansUsed: users.scriptScansUsed,
        essayGradingsUsed: users.essayGradingsUsed,
        allowedServices: users.allowedServices,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    const allOrgs = await db
      .select()
      .from(organizations)
      .orderBy(desc(organizations.createdAt));

    const settingsRows = await db.select().from(systemSettings);
    const settingsMap: Record<string, string> = {};
    settingsRows.forEach((r) => {
      settingsMap[r.key] = r.value;
    });

    return NextResponse.json({
      users: allUsers,
      organizations: allOrgs,
      systemSettings: {
        freeAllTeachers: settingsMap["free_all_teachers"] === "true",
        freeAllOrganizations: settingsMap["free_all_organizations"] === "true",
      },
    });
  } catch (error: any) {
    console.error("Admin subscriptions GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const body = await req.json();
    const { action, targetType, targetId, planType, status, settingKey, settingValue, service, remove } = body;
    const now = new Date().toISOString();

    // Action 0: Toggle Global System Switch (Free All Teachers or Free All Organizations)
    if (action === "toggle_system_setting" && settingKey) {
      const stringVal = settingValue ? "true" : "false";
      
      const existing = await db.select().from(systemSettings).where(eq(systemSettings.key, settingKey)).limit(1);
      if (existing.length > 0) {
        await db.update(systemSettings).set({ value: stringVal, updatedAt: now }).where(eq(systemSettings.key, settingKey));
      } else {
        await db.insert(systemSettings).values({
          key: settingKey,
          value: stringVal,
          description: settingKey === "free_all_teachers" ? "Enable 100% Free Full Pro Access for all teachers" : "Enable 100% Free School Pro Access for all organizations",
          updatedAt: now,
        });
      }

      return NextResponse.json({
        success: true,
        message: `Updated global setting ${settingKey} to ${stringVal}`,
        settingKey,
        settingValue: settingValue === true,
      });
    }

    // Action 1: Grant or change access plan for a teacher or student user
    if (action === "update_user_plan" && targetId && planType) {
      await db.update(users).set({ planType }).where(eq(users.id, targetId));
      return NextResponse.json({ success: true, message: `Updated user plan to ${planType}` });
    }

    // Action 2: Grant or change access plan for an entire school organization
    if (action === "update_org_plan" && targetId && planType) {
      await db.update(organizations).set({ planType }).where(eq(organizations.id, targetId));
      // Also update all users belonging to this organization
      await db.update(users).set({ planType }).where(eq(users.orgId, targetId));
      return NextResponse.json({ success: true, message: `Updated organization plan to ${planType}` });
    }

    // Action 3: Reset usage quotas for a user
    if (action === "reset_user_quota" && targetId) {
      await db.update(users).set({
        examGenerationsUsed: 0,
        scriptScansUsed: 0,
        essayGradingsUsed: 0,
      }).where(eq(users.id, targetId));
      return NextResponse.json({ success: true, message: "Reset user quotas to 0" });
    }

    // Action 4: Toggle user status (active/suspended)
    if (action === "toggle_user_status" && targetId && status) {
      await db.update(users).set({ status }).where(eq(users.id, targetId));
      return NextResponse.json({ success: true, message: `Updated user status to ${status}` });
    }

    // Action 5: Grant/limit services for a user. service === "full" → full access (null, bypass gating).
    if (action === "update_user_services" && targetId && typeof service === "string") {
      if (service === "full") {
        await db.update(users).set({ allowedServices: null }).where(eq(users.id, targetId));
        return NextResponse.json({ success: true, message: "Granted full access to all services for this user." });
      }
      const rows = await db.select({ allowedServices: users.allowedServices }).from(users).where(eq(users.id, targetId)).limit(1);
      const current = safeParseServiceList(rows[0]?.allowedServices);
      const next = remove
        ? current.filter((s) => s !== service)
        : current.includes(service)
          ? current
          : [...current, service];
      await db.update(users).set({ allowedServices: next.length > 0 ? JSON.stringify(next) : null }).where(eq(users.id, targetId));
      return NextResponse.json({ success: true, message: remove ? `Revoked service "${service}".` : `Granted service "${service}".`, services: next });
    }

    // Action 6: Grant/limit services for an organization. service === "full" → full access.
    if (action === "update_org_services" && targetId && typeof service === "string") {
      if (service === "full") {
        await db.update(organizations).set({ allowedServices: null }).where(eq(organizations.id, targetId));
        return NextResponse.json({ success: true, message: "Granted full access to all services for this organization." });
      }
      const rows = await db.select({ allowedServices: organizations.allowedServices }).from(organizations).where(eq(organizations.id, targetId)).limit(1);
      const current = safeParseServiceList(rows[0]?.allowedServices);
      const next = remove
        ? current.filter((s) => s !== service)
        : current.includes(service)
          ? current
          : [...current, service];
      await db.update(organizations).set({ allowedServices: next.length > 0 ? JSON.stringify(next) : null }).where(eq(organizations.id, targetId));
      return NextResponse.json({ success: true, message: remove ? `Revoked service "${service}".` : `Granted service "${service}".`, services: next });
    }

    return NextResponse.json({ error: "Invalid action or parameters." }, { status: 400 });
  } catch (error: any) {
    console.error("Admin subscriptions POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function safeParseServiceList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}
