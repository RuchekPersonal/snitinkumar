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

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

interface Payload extends Viewer {
  exp: number;
}

export function encodeSession(viewer: Viewer): string {
  const payload: Payload = { ...viewer, exp: Math.floor(Date.now() / 1000) + MAX_AGE_S };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decodeSession(token: string | undefined): Viewer | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as Payload;
    if (p.exp < Date.now() / 1000) return null;
    return { role: p.role, name: p.name, shopName: p.shopName, city: p.city, phone: p.phone };
  } catch {
    return null;
  }
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
