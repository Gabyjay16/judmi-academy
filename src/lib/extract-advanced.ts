import { db } from "@/db";
import { users, extractDocuments, extractAdvancedSets, type ExtractAdvancedSet, type ExtractDocument, type User } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import type { ExtractField } from "@/lib/openrouter";

/**
 * Advanced extraction workspaces: a set of documents that all share one field
 * setting + one routing field. Each routing value owns one document inside the
 * set, and a record is filed into the document matching its routing value.
 */

export function normalizeRouteValue(value: string): string {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export interface ShareRecipient {
  username?: string | null;
  email?: string | null;
  name?: string | null;
  sharedAt: string;
}

export function parseSharedWith(json: string | null | undefined): ShareRecipient[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.filter((r) => r && (r.username || r.email)) : [];
  } catch {
    return [];
  }
}

export function routeOptionsOf(set: ExtractAdvancedSet): string[] {
  try {
    const arr = JSON.parse(set.routeOptionsJson || "[]");
    return Array.isArray(arr) ? arr.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function routeFieldOf(set: ExtractAdvancedSet): string {
  return set.routingField || "";
}

export function fieldsOf(set: ExtractAdvancedSet): ExtractField[] {
  try {
    const arr = JSON.parse(set.fieldDefinitionsJson || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function isUsernameShared(
  set: ExtractAdvancedSet,
  username: string,
  email: string
): boolean {
  const list = parseSharedWith(set.sharedWithJson);
  const u = (username || "").trim().toLowerCase();
  const e = (email || "").trim().toLowerCase();
  return list.some(
    (r) =>
      (r.username && r.username.trim().toLowerCase() === u) ||
      (r.email && r.email.trim().toLowerCase() === e)
  );
}

export function isDocArchived(doc: ExtractDocument, activeValues: string[]): boolean {
  return Boolean(doc.routeValue) && !activeValues.includes(doc.routeValue as string);
}

/**
 * Resolve whether the current user may work with a document. Grants access to
 * the owner, super/school admins of the owning org, and teachers the set was
 * shared with (by username or email). Loads the owning set when required.
 */
export async function resolveSetDocAccess(
  currentUser: User | null,
  doc: ExtractDocument
): Promise<{ ok: boolean; set?: ExtractAdvancedSet | null }> {
  if (!currentUser || !doc) return { ok: false };
  if (currentUser.role === "admin") return { ok: true };
  if (currentUser.role === "org_admin" && doc.orgId) {
    if ((currentUser.orgId || null) === doc.orgId) return { ok: true };
  }
  if (doc.ownerUserId === currentUser.id) return { ok: true };
  if (doc.advancedSetId) {
    const rows = await db
      .select()
      .from(extractAdvancedSets)
      .where(eq(extractAdvancedSets.id, doc.advancedSetId))
      .limit(1);
    if (rows.length && isUsernameShared(rows[0], currentUser.username || "", currentUser.email)) {
      return { ok: true, set: rows[0] };
    }
  }
  return { ok: false };
}

export async function resolveSetAccess(
  currentUser: User | null,
  setId: string
): Promise<{ ok: boolean; set?: ExtractAdvancedSet | null; shared?: boolean }> {
  if (!currentUser) return { ok: false };
  const rows = await db.select().from(extractAdvancedSets).where(eq(extractAdvancedSets.id, setId)).limit(1);
  if (rows.length === 0) return { ok: false };
  const set = rows[0];
  if (currentUser.role === "admin") return { ok: true, set };
  if (currentUser.role === "org_admin" && set.orgId && (currentUser.orgId || null) === set.orgId) {
    return { ok: true, set };
  }
  if (set.ownerUserId === currentUser.id) return { ok: true, set };
  if (isUsernameShared(set, currentUser.username || "", currentUser.email)) {
    return { ok: true, set, shared: true };
  }
  return { ok: false };
}

/**
 * Make sure one document exists per routing value. Creates any missing
 * document (with the set's shared field setting), updates labels, never
 * deletes documents (data safety). Returns all documents of the set.
 */
export async function ensureSetDocs(
  set: ExtractAdvancedSet,
  options: string[]
): Promise<ExtractDocument[]> {
  const existing = await db
    .select()
    .from(extractDocuments)
    .where(eq(extractDocuments.advancedSetId, set.id));

  const byValue = new Map<string, ExtractDocument>();
  for (const d of existing) {
    if (d.routeValue) byValue.set(d.routeValue, d);
  }

  const now = new Date().toISOString();
  const fieldsJson = set.fieldDefinitionsJson || "[]";

  for (const option of options) {
    const label = option.trim();
    const value = normalizeRouteValue(label);
    if (!value) continue;
    const doc = byValue.get(value);
    if (doc) {
      const setObj: Record<string, unknown> = {
        routeLabel: label,
        title: label,
        fieldDefinitionsJson: fieldsJson,
        updatedAt: now,
      };
      await db.update(extractDocuments).set(setObj).where(eq(extractDocuments.id, doc.id));
    } else {
      await db.insert(extractDocuments).values({
        id: generateId(),
        ownerUserId: set.ownerUserId,
        orgId: set.orgId,
        title: label,
        fieldDefinitionsJson: fieldsJson,
        extractedRowsJson: "[]",
        pageCount: 0,
        exportFormat: "xlsx",
        status: "ready",
        advancedSetId: set.id,
        routeValue: value,
        routeLabel: label,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  return db.select().from(extractDocuments).where(eq(extractDocuments.advancedSetId, set.id));
}

export interface DocFileInfo {
  docId: string;
  label: string;
  added: number;
  total: number;
}

/**
 * File AI-extracted rows into the set's documents. In "auto" mode each row is
 * filed by its routing-field value (creating a document for brand new values).
 * In "pick" mode every row goes to the chosen target document.
 */
export async function fileRowsIntoSet(
  set: ExtractAdvancedSet,
  rows: Record<string, string>[],
  images: string[],
  opts: { mode: "auto" | "pick"; targetId?: string }
): Promise<{ perDoc: DocFileInfo[]; unclassified: number }> {
  const options = routeOptionsOf(set);
  const docs = await ensureSetDocs(set, options);

  const byValue = new Map<string, ExtractDocument>();
  const byId = new Map<string, ExtractDocument>();
  for (const d of docs) {
    if (d.routeValue) byValue.set(d.routeValue, d);
    byId.set(d.id, d);
  }

  const additions = new Map<string, { doc: ExtractDocument; rows: Record<string, string>[] }>();

  const push = (doc: ExtractDocument, row: Record<string, string>) => {
    const entry = additions.get(doc.id) || { doc, rows: [] };
    entry.rows.push(row);
    additions.set(doc.id, entry);
  };

  let unclassified = 0;
  const routingField = routeFieldOf(set);

  for (const row of rows) {
    if (opts.mode === "pick") {
      const doc = byId.get(opts.targetId || "");
      if (doc) push(doc, row);
      else unclassified += 1;
      continue;
    }

    const rawValue = row[routingField] || "";
    const value = normalizeRouteValue(rawValue);
    let doc = value ? byValue.get(value) : null;

    if (!doc && value) {
      // New routing value: create a document for it and add it to the set.
      const label = rawValue.trim() || value;
      doc = await ensureSingleDoc(set, value, label);
      byValue.set(value, doc);
      byId.set(doc.id, doc);
      await db
        .update(extractAdvancedSets)
        .set({ routeOptionsJson: JSON.stringify([...options, label]), updatedAt: new Date().toISOString() })
        .where(eq(extractAdvancedSets.id, set.id));
      options.push(label);
    }

    if (!doc) {
      // Empty routing value — file under an "Uncategorised" bucket.
      doc = byValue.get("uncategorised") || null;
      if (!doc) {
        doc = await ensureSingleDoc(set, "uncategorised", "Uncategorised");
        byValue.set("uncategorised", doc);
        byId.set(doc.id, doc);
      }
    }

    push(doc, row);
    if (!value) unclassified += 1;
  }

  const now = new Date().toISOString();
  const perDoc: DocFileInfo[] = [];

  for (const entry of additions.values()) {
    const doc = entry.doc;
    const prevRows = JSON.parse(doc.extractedRowsJson || "[]") as Record<string, string>[];
    const prevImages = doc.sourceImagesJson ? (JSON.parse(doc.sourceImagesJson) as string[]) : [];
    const newRows = [...prevRows, ...entry.rows];

    await db
      .update(extractDocuments)
      .set({
        extractedRowsJson: JSON.stringify(newRows),
        sourceImagesJson: JSON.stringify([...prevImages, ...images]),
        pageCount: prevImages.length + images.length,
        status: "ready",
        error: null,
        updatedAt: now,
      })
      .where(eq(extractDocuments.id, doc.id));

    perDoc.push({ docId: doc.id, label: doc.routeLabel || doc.title, added: entry.rows.length, total: newRows.length });
  }

  return { perDoc, unclassified };
}

async function ensureSingleDoc(
  set: ExtractAdvancedSet,
  value: string,
  label: string
): Promise<ExtractDocument> {
  const now = new Date().toISOString();
  const id = generateId();
  await db.insert(extractDocuments).values({
    id,
    ownerUserId: set.ownerUserId,
    orgId: set.orgId,
    title: label,
    fieldDefinitionsJson: set.fieldDefinitionsJson || "[]",
    extractedRowsJson: "[]",
    pageCount: 0,
    exportFormat: "xlsx",
    status: "ready",
    advancedSetId: set.id,
    routeValue: value,
    routeLabel: label,
    createdAt: now,
    updatedAt: now,
  });
  const rows = await db.select().from(extractDocuments).where(eq(extractDocuments.id, id)).limit(1);
  return rows[0];
}

/**
 * Resolve a share target by username (case-insensitive) or, failing that, by
 * email (solo teachers commonly use their phone number as the email).
 */
export async function resolveShareTarget(identifier: string): Promise<User | null> {
  const clean = identifier.trim().toLowerCase();
  if (!clean) return null;
  const byUsername = await db.select().from(users).where(eq(users.username, clean)).limit(1);
  if (byUsername.length > 0) return byUsername[0];
  const byEmail = await db.select().from(users).where(eq(users.email, clean)).limit(1);
  if (byEmail.length > 0) return byEmail[0];
  return null;
}

export function docToSummary(d: ExtractDocument) {
  return {
    id: d.id,
    title: d.title,
    status: d.status,
    error: d.error,
    exportFormat: d.exportFormat,
    pageCount: d.pageCount,
    routeValue: d.routeValue || null,
    routeLabel: d.routeLabel || null,
    fieldDefinitions: JSON.parse(d.fieldDefinitionsJson || "[]") as ExtractField[],
    rowCount: (JSON.parse(d.extractedRowsJson || "[]") as any[]).length,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}