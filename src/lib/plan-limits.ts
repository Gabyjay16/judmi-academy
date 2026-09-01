import { db } from "@/db";
import { users, systemSettings, organizations, User } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export const FREE_PLAN_LIMITS = {
  examGenerations: 3,
  scriptScans: 3,
  essayGradings: 2,
  maxSubmissionsPerExam: 15,
};

export type FeatureType = "examGenerations" | "scriptScans" | "essayGradings";

// Per-service access control set by the super admin.
// A service list that is null (or empty) means FULL ACCESS: the specific
// service gate is bypassed and the user/org may use everything.
export const SERVICE_IDS = [
  "generateQuestions",
  "scanScripts",
  "gradeEssays",
  "extractInfo",
  "complaints",
  "departments",
  "branding",
  "members",
] as const;

export type ServiceId = (typeof SERVICE_IDS)[number];

export const SERVICE_LABELS: Record<ServiceId, string> = {
  generateQuestions: "AI Exam Generator",
  scanScripts: "Scan & Grade Scripts",
  gradeEssays: "AI Essay Grader",
  extractInfo: "Extract Info",
  complaints: "Complaints",
  departments: "Departments",
  branding: "Branding & Access Link",
  members: "Members & Seats",
};

function parseServiceList(raw: string | null | undefined): string[] | null {
  if (!raw) return null; // null = full access
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) && arr.length > 0 ? arr.map(String) : null;
  } catch {
    return null;
  }
}

export type ServiceAccess = { full: boolean; services: string[] };

/**
 * Effective per-service access for a user.
 * - Super admin always gets full access.
 * - The global "free_all_teachers" / "free_all_organizations" master switches
 *   grant full (bypassed) access to the matching roles.
 * - A user-level list wins over the org's list.
 * - Otherwise the org's list is used.
 * - Otherwise full access (null) → every service gate is bypassed.
 */
export function getServiceAccess(
  user: User | null,
  organization?: { allowedServices?: string | null } | null,
  globalSettings?: { freeAllTeachers?: boolean; freeAllOrganizations?: boolean }
): ServiceAccess {
  if (!user) return { full: true, services: [] };
  if (user.role === "admin") return { full: true, services: [] };
  if (globalSettings?.freeAllTeachers && (user.role === "teacher" || user.role === "admin")) {
    return { full: true, services: [] };
  }
  if (globalSettings?.freeAllOrganizations && (user.role === "org_admin" || user.orgId)) {
    return { full: true, services: [] };
  }
  const userList = parseServiceList(user.allowedServices);
  if (userList) return { full: false, services: userList };
  const orgList = parseServiceList(organization?.allowedServices ?? null);
  if (orgList) return { full: false, services: orgList };
  return { full: true, services: [] };
}

export function isServiceAllowed(
  serviceId: ServiceId,
  user: User | null,
  organization?: { allowedServices?: string | null } | null,
  globalSettings?: { freeAllTeachers?: boolean; freeAllOrganizations?: boolean }
): boolean {
  const access = getServiceAccess(user, organization, globalSettings);
  return access.full || access.services.includes(serviceId);
}

/**
 * Fetch a user's organization (only id + allowed_services are needed for gating).
 * Returns null when the user has no org or the lookup fails.
 */
export async function getOrgForGating(user: User | null): Promise<{ allowedServices: string | null } | null> {
  if (!user?.orgId) return null;
  try {
    const rows = await db
      .select({ allowedServices: organizations.allowedServices })
      .from(organizations)
      .where(eq(organizations.id, user.orgId))
      .limit(1);
    return rows[0] ?? null;
  } catch (e) {
    console.error("Failed to load org for service gating:", e);
    return null;
  }
}

/**
 * Full service gate for a route: returns null when allowed, or a 403 response
 * when the user/org has been restricted from this service.
 */
export async function enforceServiceAccess(
  serviceId: ServiceId,
  user: User | null
): Promise<NextResponse | null> {
  if (!user) return null; // anonymous/unauthenticated routes are not gated here
  const [org, globalSettings] = await Promise.all([
    getOrgForGating(user),
    getGlobalSystemSettings(),
  ]);
  if (isServiceAllowed(serviceId, user, org, globalSettings)) return null;
  return NextResponse.json(
    {
      error: `You do not have access to ${SERVICE_LABELS[serviceId]}. Your administrator has not granted this service.`,
      serviceDenied: true,
    },
    { status: 403 }
  );
}

/**
 * Fetch global system settings switches
 */
export async function getGlobalSystemSettings() {
  try {
    const rows = await db.select().from(systemSettings);
    const settingsMap: Record<string, string> = {};
    rows.forEach((r) => {
      settingsMap[r.key] = r.value;
    });
    return {
      freeAllTeachers: settingsMap["free_all_teachers"] === "true",
      freeAllOrganizations: settingsMap["free_all_organizations"] === "true",
    };
  } catch {
    return {
      freeAllTeachers: false,
      freeAllOrganizations: false,
    };
  }
}

export function isPaidUser(user: User | null, globalSettings?: { freeAllTeachers?: boolean; freeAllOrganizations?: boolean }): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;

  // Master switches enabled by Super Admin
  if (globalSettings?.freeAllTeachers && (user.role === "teacher" || user.role === "admin")) {
    return true;
  }
  if (globalSettings?.freeAllOrganizations && (user.role === "org_admin" || user.orgId)) {
    return true;
  }

  return user.planType === "individual" || user.planType === "school_pro" || user.role === "org_admin";
}

export async function checkUserQuota(user: User | null, feature: FeatureType) {
  const globalSettings = await getGlobalSystemSettings();

  if (!user) {
    return {
      allowed: true,
      limit: FREE_PLAN_LIMITS[feature],
      used: 0,
      remaining: FREE_PLAN_LIMITS[feature],
      isPro: false,
      planType: "free",
      globalFreeAllTeachers: globalSettings.freeAllTeachers,
      globalFreeAllOrgs: globalSettings.freeAllOrganizations,
    };
  }

  const isPro = isPaidUser(user, globalSettings);
  if (isPro) {
    return {
      allowed: true,
      limit: Infinity,
      used: feature === "examGenerations" ? user.examGenerationsUsed : feature === "scriptScans" ? user.scriptScansUsed : user.essayGradingsUsed,
      remaining: Infinity,
      isPro: true,
      planType: globalSettings.freeAllTeachers ? "pro_free_access" : (user.planType || "individual"),
      globalFreeAllTeachers: globalSettings.freeAllTeachers,
      globalFreeAllOrgs: globalSettings.freeAllOrganizations,
    };
  }

  const limit = FREE_PLAN_LIMITS[feature];
  const used = feature === "examGenerations" ? user.examGenerationsUsed || 0 : feature === "scriptScans" ? user.scriptScansUsed || 0 : user.essayGradingsUsed || 0;
  const remaining = Math.max(0, limit - used);

  return {
    allowed: used < limit,
    limit,
    used,
    remaining,
    isPro: false,
    planType: "free",
    globalFreeAllTeachers: globalSettings.freeAllTeachers,
    globalFreeAllOrgs: globalSettings.freeAllOrganizations,
  };
}

export async function incrementUserQuota(userId: string, feature: FeatureType) {
  try {
    if (feature === "examGenerations") {
      await db.update(users).set({ examGenerationsUsed: sql`${users.examGenerationsUsed} + 1` }).where(eq(users.id, userId));
    } else if (feature === "scriptScans") {
      await db.update(users).set({ scriptScansUsed: sql`${users.scriptScansUsed} + 1` }).where(eq(users.id, userId));
    } else if (feature === "essayGradings") {
      await db.update(users).set({ essayGradingsUsed: sql`${users.essayGradingsUsed} + 1` }).where(eq(users.id, userId));
    }
  } catch (e) {
    console.error("Failed to increment quota:", e);
  }
}
