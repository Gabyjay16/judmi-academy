import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { academicEvents, academicTerms } from "@/db/schema";
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

    const [events, terms] = await Promise.all([
      db.select().from(academicEvents).where(eq(academicEvents.orgId, user.orgId)).orderBy(desc(academicEvents.date)),
      db.select().from(academicTerms).where(eq(academicTerms.orgId, user.orgId)).orderBy(desc(academicTerms.createdAt)),
    ]);

    return NextResponse.json({ events, terms });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.orgId || !STAFF.includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { action } = body;
    const now = new Date().toISOString();

    // Create an event on the calendar
    if (action === "event") {
      const { title, description, date, startTime, endTime, type, venue, audience } = body;
      if (!title?.trim() || !date) return NextResponse.json({ error: "Title and date are required." }, { status: 400 });
      await db.insert(academicEvents).values({
        id: generateId(),
        orgId: user.orgId,
        title: title.trim(),
        description: description?.trim() || null,
        date,
        startTime: startTime || null,
        endTime: endTime || null,
        type: type || "event",
        venue: venue?.trim() || null,
        audience: audience || "all",
        createdBy: user.id,
        createdByName: user.name,
        createdAt: now,
      });
      return NextResponse.json({ success: true });
    }

    // Create a term / session
    if (action === "term") {
      const { name, startDate, endDate, setActive } = body;
      if (!name?.trim()) return NextResponse.json({ error: "Term name is required." }, { status: 400 });
      const id = generateId();
      await db.insert(academicTerms).values({
        id,
        orgId: user.orgId,
        name: name.trim(),
        startDate: startDate || null,
        endDate: endDate || null,
        isActive: setActive ? 1 : 0,
        createdAt: now,
      });
      if (setActive) {
        await db.update(academicTerms).set({ isActive: 0 }).where(and(eq(academicTerms.orgId, user.orgId), eq(academicTerms.isActive, 1)));
        await db.update(academicTerms).set({ isActive: 1 }).where(eq(academicTerms.id, id));
      }
      return NextResponse.json({ success: true, id });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.orgId || !STAFF.includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { action } = body;

    // Set a term as the active/current term
    if (action === "set_active_term") {
      const { id } = body;
      if (!id) return NextResponse.json({ error: "Missing term id" }, { status: 400 });
      await db.update(academicTerms).set({ isActive: 0 }).where(and(eq(academicTerms.orgId, user.orgId), eq(academicTerms.isActive, 1)));
      await db.update(academicTerms).set({ isActive: 1 }).where(eq(academicTerms.id, id));
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
    if (user.role !== "admin" && user.role !== "org_admin") return NextResponse.json({ error: "Only administrators." }, { status: 403 });

    const body = await req.json();
    const { id, kind } = body;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    if (kind === "term") {
      await db.delete(academicTerms).where(and(eq(academicTerms.id, id), eq(academicTerms.orgId, user.orgId!)));
    } else {
      await db.delete(academicEvents).where(and(eq(academicEvents.id, id), eq(academicEvents.orgId, user.orgId!)));
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
