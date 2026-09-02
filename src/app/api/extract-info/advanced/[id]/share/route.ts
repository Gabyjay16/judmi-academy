import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { extractAdvancedSets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { resolveSetAccess, resolveShareTarget, parseSharedWith, type ShareRecipient } from "@/lib/extract-advanced";

function canManage(currentUser: any, set: any): boolean {
  if (!currentUser) return false;
  if (currentUser.role === "admin") return true;
  if (set.ownerUserId === currentUser.id) return true;
  if (currentUser.role === "org_admin" && set.orgId && (currentUser.orgId || null) === set.orgId) return true;
  return false;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const access = await resolveSetAccess(currentUser, id);
    if (!access.ok || !access.set) {
      return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    }
    if (!canManage(currentUser, access.set)) {
      return NextResponse.json({ error: "Only the workspace owner can share it." }, { status: 403 });
    }
    const set = access.set;

    const body = await req.json();
    const raw = Array.isArray(body.usernames) ? body.usernames : [body.usernames];
    const identifiers = raw
      .map((s: any) => String(s || "").trim())
      .filter(Boolean)
      .map((s: any) => s.split(/[\s,;]+/))
      .flat()
      .map((s: any) => s.trim())
      .filter(Boolean);

    if (identifiers.length === 0) {
      return NextResponse.json({ error: "Enter at least one teacher username." }, { status: 400 });
    }

    const existing = parseSharedWith(set.sharedWithJson);
    const existingKeys = new Set(
      existing.map((r) => ((r.username || "").trim().toLowerCase() || (r.email || "").trim().toLowerCase()))
    );

    const added: ShareRecipient[] = [];
    const notFound: string[] = [];
    const selfEmail = currentUser.email.toLowerCase();

    for (const idf of identifiers) {
      if (idf.trim().toLowerCase() === (currentUser.username || "").trim().toLowerCase() || idf.trim().toLowerCase() === selfEmail) {
        notFound.push(idf);
        continue;
      }
      const key = idf.trim().toLowerCase();
      if (existingKeys.has(key)) continue;
      const target = await resolveShareTarget(idf);
      if (!target) {
        notFound.push(idf);
        continue;
      }
      const rec: ShareRecipient = {
        username: target.username,
        email: target.email,
        name: target.name,
        sharedAt: new Date().toISOString(),
      };
      existing.push(rec);
      added.push(rec);
      existingKeys.add((rec.username || "").trim().toLowerCase() || (rec.email || "").trim().toLowerCase());
    }

    await db
      .update(extractAdvancedSets)
      .set({ sharedWithJson: JSON.stringify(existing), updatedAt: new Date().toISOString() })
      .where(eq(extractAdvancedSets.id, id));

    return NextResponse.json({
      success: true,
      added,
      notFound,
      recipients: existing,
    });
  } catch (error: any) {
    console.error("Extract advanced share error:", error);
    return NextResponse.json({ error: error?.message || "Failed to share workspace." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDatabase();
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const access = await resolveSetAccess(currentUser, id);
    if (!access.ok || !access.set) {
      return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    }
    if (!canManage(currentUser, access.set)) {
      return NextResponse.json({ error: "Only the workspace owner can change sharing." }, { status: 403 });
    }
    const set = access.set;

    const body = await req.json();
    const username = (body.username || body.email || "").toString().trim().toLowerCase();
    if (!username) {
      return NextResponse.json({ error: "Missing recipient." }, { status: 400 });
    }

    const remaining = parseSharedWith(set.sharedWithJson).filter(
      (r) =>
        (r.username || "").trim().toLowerCase() !== username &&
        (r.email || "").trim().toLowerCase() !== username
    );

    await db
      .update(extractAdvancedSets)
      .set({ sharedWithJson: JSON.stringify(remaining), updatedAt: new Date().toISOString() })
      .where(eq(extractAdvancedSets.id, id));

    return NextResponse.json({ success: true, recipients: remaining });
  } catch (error: any) {
    console.error("Extract advanced unshare error:", error);
    return NextResponse.json({ error: error?.message || "Failed to update sharing." }, { status: 500 });
  }
}