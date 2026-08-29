import { cookies } from "next/headers";
import { db } from "@/db";
import { users, User } from "@/db/schema";
import { eq } from "drizzle-orm";

const AUTH_COOKIE_NAME = "judmi_session";

/**
 * Lightweight deterministic password hashing for demo & production
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "_judmi_salt_2026");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(password);
  return computed === hash;
}

export function generateSessionToken(userId: string): string {
  const payload = {
    userId,
    timestamp: Date.now(),
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

export function decodeSessionToken(token: string): { userId: string } | null {
  try {
    const cleanToken = token.replace(/^Bearer\s+/i, "").trim();
    const jsonStr = Buffer.from(cleanToken, "base64").toString("utf-8");
    const parsed = JSON.parse(jsonStr);
    if (parsed.userId) return parsed;
    return null;
  } catch {
    return null;
  }
}

/**
 * Server-side helper to get currently authenticated user.
 * Checks both incoming customToken and the 30-day session cookie.
 */
export async function getCurrentUser(customToken?: string | null): Promise<User | null> {
  try {
    let token = customToken;
    
    if (!token) {
      const cookieStore = await cookies();
      token = cookieStore.get(AUTH_COOKIE_NAME)?.value || cookieStore.get("evalai_session")?.value;
    }

    if (!token) return null;

    const session = decodeSessionToken(token);
    if (!session?.userId) return null;

    const userRows = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
    if (userRows.length === 0) return null;

    return userRows[0];
  } catch (e) {
    return null;
  }
}

export { AUTH_COOKIE_NAME };
