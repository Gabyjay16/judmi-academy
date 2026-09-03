import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { chatChannels, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import {
  ensureUserChannels,
  listUserChannels,
  canMonitor,
} from "@/lib/forum";

// GET /api/forum/channels — ensure channels exist and list the ones the user
// can access. A monitor returns ALL channels of the org (org_admin) or ALL
// channels of every org (super admin `admin`).
export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isMonitor = canMonitor(user);

    // Super admin: see every forum across all schools.
    if (user.role === "admin") {
      const all = await db
        .select({
          id: chatChannels.id,
          type: chatChannels.type,
          name: chatChannels.name,
          departmentId: chatChannels.departmentId,
          orgName: organizations.name,
        })
        .from(chatChannels)
        .innerJoin(organizations, eq(organizations.id, chatChannels.orgId));
      const channels = all.map((c) => ({
        id: c.id,
        type: c.type,
        name: c.type === "general" ? `${c.name} · ${c.orgName}` : `${c.name} · ${c.orgName}`,
        departmentId: c.departmentId,
        departmentName: null,
      }));
      return NextResponse.json({ channels, isMonitor: true, role: user.role, orgId: null });
    }

    if (!user.orgId) {
      return NextResponse.json({ error: "You must belong to a school to use the forum." }, { status: 403 });
    }

    await ensureUserChannels(user.orgId, user.departmentId || null);
    const orgId = user.orgId;

    if (isMonitor) {
      const all = await db
        .select({ id: chatChannels.id, type: chatChannels.type, name: chatChannels.name, departmentId: chatChannels.departmentId })
        .from(chatChannels)
        .where(eq(chatChannels.orgId, orgId));
      return NextResponse.json({ channels: all, isMonitor, role: user.role, orgId });
    }

    const channels = await listUserChannels(user);
    return NextResponse.json({ channels, isMonitor: false, role: user.role, orgId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
