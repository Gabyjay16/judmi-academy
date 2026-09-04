import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { clubs, clubMembers, clubAnnouncements } from "@/db/schema";
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

    const clubRows = await db.select().from(clubs).where(eq(clubs.orgId, user.orgId)).orderBy(desc(clubs.createdAt));
    const allMembers = await db.select().from(clubMembers);
    const allAnns = await db.select().from(clubAnnouncements).where(eq(clubAnnouncements.orgId, user.orgId));

    const result = clubRows.map((c) => {
      const members = allMembers.filter((m) => m.clubId === c.id);
      const isMember = members.some((m) => m.memberId === user.id);
      const announcements = allAnns
        .filter((a) => a.clubId === c.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((a) => ({ ...a, isRead: true }));
      return {
        ...c,
        memberCount: members.length,
        isMember,
        isLead: members.some((m) => m.memberId === user.id && m.role === "lead"),
        members: members.map((m) => ({ id: m.memberId, name: m.memberName, role: m.role })),
        announcements,
      };
    });

    return NextResponse.json({ clubs: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    const body = await req.json();
    const { action } = body;
    const now = new Date().toISOString();

    if (action === "create") {
      if (!STAFF.includes(user.role)) return NextResponse.json({ error: "Only staff can create clubs." }, { status: 403 });
      const { name, description, category } = body;
      if (!name?.trim()) return NextResponse.json({ error: "Club name is required." }, { status: 400 });
      const clubId = generateId();
      await db.insert(clubs).values({
        id: clubId,
        orgId: user.orgId,
        name: name.trim(),
        description: description?.trim() || null,
        category: category || "other",
        advisorId: user.id,
        advisorName: user.name,
        createdAt: now,
      });
      return NextResponse.json({ success: true, clubId });
    }

    if (action === "join") {
      const { clubId } = body;
      if (!clubId) return NextResponse.json({ error: "Missing club" }, { status: 400 });
      const dup = await db.select().from(clubMembers).where(and(eq(clubMembers.clubId, clubId), eq(clubMembers.memberId, user.id))).limit(1);
      if (dup.length === 0) {
        await db.insert(clubMembers).values({
          id: generateId(),
          clubId,
          memberId: user.id,
          memberName: user.name,
          role: "member",
          createdAt: now,
        });
      }
      return NextResponse.json({ success: true });
    }

    if (action === "leave") {
      const { clubId } = body;
      if (!clubId) return NextResponse.json({ error: "Missing club" }, { status: 400 });
      await db.delete(clubMembers).where(and(eq(clubMembers.clubId, clubId), eq(clubMembers.memberId, user.id)));
      return NextResponse.json({ success: true });
    }

    if (action === "remove_member") {
      if (!STAFF.includes(user.role)) return NextResponse.json({ error: "Only staff can manage members." }, { status: 403 });
      const { clubId, memberId } = body;
      if (!clubId || !memberId) return NextResponse.json({ error: "Club and member are required." }, { status: 400 });
      await db.delete(clubMembers).where(and(eq(clubMembers.clubId, clubId), eq(clubMembers.memberId, memberId)));
      return NextResponse.json({ success: true });
    }

    if (action === "announce") {
      if (!STAFF.includes(user.role)) return NextResponse.json({ error: "Only staff can post club announcements." }, { status: 403 });
      const { clubId, title, body: annBody } = body;
      if (!clubId || !title?.trim()) return NextResponse.json({ error: "Club and title are required." }, { status: 400 });
      await db.insert(clubAnnouncements).values({
        id: generateId(),
        orgId: user.orgId,
        clubId,
        title: title.trim(),
        body: annBody?.trim() || null,
        postedById: user.id,
        postedByName: user.name,
        createdAt: now,
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
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

    await db.delete(clubs).where(eq(clubs.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
