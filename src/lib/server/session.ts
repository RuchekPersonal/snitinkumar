import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { Role, Viewer } from "@/lib/types";

export const SESSION_COOKIE = "sn_session";
const MAX_AGE_S = 60 * 60 * 24 * 30;

// Fixed fallback so every dev server worker verifies the same signature. Never used in production.
const DEV_SECRET = "dev-only-session-secret-not-for-production-use";

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET (32+ chars) must be set in production");
  }
  return DEV_SECRET;
}

// `scope` keys the HMAC per token type, so a retailer token can never pass as an admin one.
function sign(scope: string, data: string): string {
  return createHmac("sha256", `${scope}:${secret()}`).update(data).digest("base64url");
}

/** Signed, expiring token: base64url(JSON payload) + "." + HMAC. */
export function signToken(scope: string, payload: object, maxAgeS: number): string {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + maxAgeS })).toString(
    "base64url",
  );
  return `${body}.${sign(scope, body)}`;
}

export function verifyToken<T>(scope: string, token: string | undefined): T | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(sign(scope, body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as T & { exp: number };
    return p.exp < Date.now() / 1000 ? null : p;
  } catch {
    return null;
  }
}

export function encodeSession(viewer: Viewer): string {
  return signToken("retailer", viewer, MAX_AGE_S);
}

function decodeSession(token: string | undefined): Viewer | null {
  const p = verifyToken<Viewer>("retailer", token);
  return p && { role: p.role, name: p.name, shopName: p.shopName, city: p.city, phone: p.phone };
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE_S,
};

export async function getViewer(): Promise<Viewer> {
  const jar = await cookies();
  return decodeSession(jar.get(SESSION_COOKIE)?.value) ?? { role: "guest" };
}

/** Rates are released only to approved retailers and staff (RFD Q9). */
export function canSeePrices(role: Role): boolean {
  return role === "approved" || role === "admin";
}

/** Demo role switcher for reviewing price gating before real login exists (Phase 4). */
export function demoRolesEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.ENABLE_DEMO_ROLES === "true";
}
