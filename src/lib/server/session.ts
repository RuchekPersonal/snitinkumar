import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import type { Role, Viewer } from "@/lib/types";
import { db } from "./db";

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

interface RetailerToken {
  rid?: string; // real retailer session: status is always read fresh from the database
  demo?: Viewer; // review-only demo session (dev / ENABLE_DEMO_ROLES)
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE_S,
};

export function encodeRetailerSession(retailerId: string): string {
  return signToken("retailer", { rid: retailerId } satisfies RetailerToken, MAX_AGE_S);
}

export function encodeDemoSession(viewer: Viewer): string {
  return signToken("retailer", { demo: viewer } satisfies RetailerToken, MAX_AGE_S);
}

const ROLE_BY_STATUS: Record<string, Role> = { approved: "approved", pending: "pending" };

/** The current storefront visitor. Cached per request; blocked/rejected shops browse as guests. */
export const getViewer = cache(async (): Promise<Viewer> => {
  const jar = await cookies();
  const token = verifyToken<RetailerToken>("retailer", jar.get(SESSION_COOKIE)?.value);
  if (!token) return { role: "guest" };

  if (token.rid) {
    const { data } = await db()
      .from("retailers")
      .select("id, shop_name, owner_name, city, mobile, status")
      .eq("id", token.rid)
      .maybeSingle();
    if (!data) return { role: "guest" };
    return {
      role: ROLE_BY_STATUS[data.status] ?? "guest",
      retailerId: data.id,
      status: data.status,
      name: data.owner_name,
      shopName: data.shop_name,
      city: data.city,
      phone: data.mobile,
    };
  }

  if (token.demo && demoRolesEnabled()) {
    const d = token.demo;
    return { role: d.role, name: d.name, shopName: d.shopName, city: d.city, phone: d.phone };
  }
  return { role: "guest" };
});

/** Rates are released only to approved retailers and staff (RFD Q9). */
export function canSeePrices(role: Role): boolean {
  return role === "approved" || role === "admin";
}

/** Demo role switcher for reviewing price gating without a real login. */
export function demoRolesEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.ENABLE_DEMO_ROLES === "true";
}
