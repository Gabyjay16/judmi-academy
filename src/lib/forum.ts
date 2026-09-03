import { db, initDatabase } from "@/db";
import { chatChannels, departments, organizations } from "@/db/schema";
import { eq, and, asc, or, isNull } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import type { User } from "@/db/schema";

export const GENERAL = "general";
export const DEPARTMENT = "department";

// A school admin (org_admin) or super admin (admin) can silently view forums.
export function canMonitor(user: User): boolean {
  return user.role === "org_admin" || user.role === "admin";
}

// A user may read a channel if: they share the same org and the channel is the
// org's general forum OR the user's department forum. Monitors (org_admin /
// admin) may read every channel within the org. Super admin (admin) may read
// any org's channels too.
export async function canReadChannel(user: any, channel: {
  id: string;
  orgId: string;
  type: string;
  departmentId: string | null;
}): Promise<{ ok: boolean; reason?: string }> {
  if (user.role === "admin") return { ok: true }; // super admin: all forums
  if (user.role === "org_admin") {
    return channel.orgId === user.orgId ? { ok: true } : { ok: false, reason: "Outside your school" };
  }
  if (!user.orgId || channel.orgId !== user.orgId) {
    return { ok: false, reason: "You must belong to this school." };
  }
  if (channel.type === GENERAL) return { ok: true };
  if (channel.type === DEPARTMENT) {
    return channel.departmentId === user.departmentId
      ? { ok: true }
      : { ok: false, reason: "Not a member of this department." };
  }
  return { ok: false, reason: "Unknown forum." };
}

// Super admin can post in any forum; org_admin monitors silently (no reply).
export function canPostInForum(user: User): boolean {
  return user.role !== "org_admin"; // students, teachers, super admin (admin)
}

export interface ForumChannelView {
  id: string;
  type: string;
  name: string;
  departmentId: string | null;
  departmentName: string | null;
  memberCount: number;
}

// Ensure the org has its general channel and a department channel for each of
// the caller's departments (general + department channels the user belongs to).
export async function ensureUserChannels(orgId: string, departmentId: string | null) {
  await initDatabase();

  const ensure = async (type: string, depId: string | null, name: string) => {
    const existing = await db
      .select({ id: chatChannels.id })
      .from(chatChannels)
      .where(
        and(
          eq(chatChannels.orgId, orgId),
          eq(chatChannels.type, type),
          depId ? eq(chatChannels.departmentId, depId) : isNull(chatChannels.departmentId)
        )
      )
      .limit(1);
    if (existing[0]) return existing[0].id;

    const id = generateId();
    await db.insert(chatChannels).values({
      id,
      orgId,
      type,
      departmentId: depId || null,
      name,
      createdAt: new Date().toISOString(),
    });
    return id;
  };

  // General forum (will use org name later)
  await ensure(GENERAL, null, "General Forum");

  // Department forum
  if (departmentId) {
    const depRows = await db
      .select({ id: departments.id, name: departments.name })
      .from(departments)
      .where(eq(departments.id, departmentId))
      .limit(1);
    if (depRows[0]) {
      await ensure(DEPARTMENT, departmentId, `Department Forum · ${depRows[0].name}`);
    }
  }
}

// List the channels a user can see: general (org-wide) + their own department.
export async function listUserChannels(user: User): Promise<ForumChannelView[]> {
  await initDatabase();

  const channels = await db
    .select({
      id: chatChannels.id,
      type: chatChannels.type,
      name: chatChannels.name,
      departmentId: chatChannels.departmentId,
      departmentName: departments.name,
      orgName: organizations.name,
      createdAt: chatChannels.createdAt,
    })
    .from(chatChannels)
    .leftJoin(departments, eq(departments.id, chatChannels.departmentId))
    .innerJoin(organizations, eq(organizations.id, chatChannels.orgId))
    .where(
      and(
        eq(chatChannels.orgId, user.orgId || ""),
        user.departmentId
          ? or(eq(chatChannels.type, GENERAL), eq(chatChannels.departmentId, user.departmentId))
          : eq(chatChannels.type, GENERAL)
      )
    )
    .orderBy(asc(chatChannels.type), asc(chatChannels.createdAt));

  // The forum switcher always shows exactly two forums: the General forum and
  // (for students with a department) their own Department forum. If duplicate
  // channels exist (e.g. from earlier creation bugs), keep only the newest
  // General and the newest Department channel.
  const byType = new Map<string, typeof channels[number]>();
  for (const c of channels) {
    byType.set(c.type, c);
  }

  const views: ForumChannelView[] = Array.from(byType.values()).map((c) => ({
    id: c.id,
    type: c.type,
    name: c.type === GENERAL ? `${c.name} · ${c.orgName || ""}`.trim() : c.name,
    departmentId: c.departmentId,
    departmentName: c.departmentName,
    memberCount: 0,
  }));
  return views;
}
