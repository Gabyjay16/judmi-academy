import { db } from "@/db";
import { users, systemSettings, User } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export const FREE_PLAN_LIMITS = {
  examGenerations: 3,
  scriptScans: 3,
  essayGradings: 2,
  maxSubmissionsPerExam: 15,
};

export type FeatureType = "examGenerations" | "scriptScans" | "essayGradings";

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
