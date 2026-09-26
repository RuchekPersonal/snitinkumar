import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./db";
import { hashPassword, verifyPassword } from "./passwords";
import { signToken, verifyToken } from "./session";

// Staff sessions (RFD §2.1): separate signed cookie, SameSite=Strict, 8 h. Every request
// re-reads the admin row, so deleting a staff member or changing their password ends
// their sessions immediately.

export const ADMIN_COOKIE = "sn_admin";
const MAX_AGE_S = 8 * 60 * 60;
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

export interface Admin {
  id: string;
  email: string;
  name: string;
  role: "owner" | "staff";
}

interface AdminToken {
  id: string;
  pw: string; // fingerprint of the password hash; a password change invalidates old cookies
}

const fingerprint = (hash: string) => createHash("sha256").update(hash).digest("base64url").slice(0, 16);

// A real Argon2id hash of a random string, verified when the email is unknown so both
// paths take the same time (no account enumeration by timing).
const DUMMY_HASH = "$argon2id$v=19$m=19456,t=2,p=1$lQGw2MMaFuyYWWsN8UVUbw$T7wB8W0hput8/vAYeOkt1rb1u+9GZT1zDa94WXyu/bc";

/** The signed-in staff member, or null. Cached per request. */
export const getAdmin = cache(async (): Promise<Admin | null> => {
  const jar = await cookies();
  const token = verifyToken<AdminToken>("admin", jar.get(ADMIN_COOKIE)?.value);
  if (!token) return null;
  const { data } = await db()
    .from("admins")
    .select("id, email, name, role, password_hash")
    .eq("id", token.id)
    .maybeSingle();
  if (!data || fingerprint(data.password_hash) !== token.pw) return null;
  return { id: data.id, email: data.email, name: data.name, role: data.role };
});

/** For admin pages and Server Actions: redirects to the login page when signed out. */
export async function requireAdmin(): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

/** For admin route handlers: rejects cross-site requests and unauthenticated callers. */
export async function requireAdminApi(req: Request): Promise<Admin | Response> {
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(req.url).host) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const admin = await getAdmin();
  return admin ?? Response.json({ error: "Not signed in" }, { status: 401 });
}

export type LoginResult = { ok: true } | { ok: false; error: string };

export async function loginAdmin(emailRaw: string, password: string): Promise<LoginResult> {
  const email = emailRaw.trim().toLowerCase();
  const generic: LoginResult = { ok: false, error: "Email or password is incorrect." };

  const { data: row } = await db()
    .from("admins")
    .select("id, password_hash, failed_logins, locked_until")
    .eq("email", email)
    .maybeSingle();

  if (!row) {
    await verifyPassword(DUMMY_HASH, password);
    return generic;
  }
  if (row.locked_until && new Date(row.locked_until) > new Date()) {
    return { ok: false, error: `Too many attempts. Try again after ${LOCK_MINUTES} minutes.` };
  }

  if (!(await verifyPassword(row.password_hash, password))) {
    const failed = row.failed_logins + 1;
    await db()
      .from("admins")
      .update({
        failed_logins: failed >= MAX_FAILED ? 0 : failed,
        locked_until: failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null,
      })
      .eq("id", row.id);
    return generic;
  }

  await db()
    .from("admins")
    .update({ failed_logins: 0, locked_until: null, last_login_at: new Date().toISOString() })
    .eq("id", row.id);

  const jar = await cookies();
  jar.set(ADMIN_COOKIE, signToken("admin", { id: row.id, pw: fingerprint(row.password_hash) }, MAX_AGE_S), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: MAX_AGE_S,
  });
  return { ok: true };
}

export async function logoutAdmin() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function changeAdminPassword(admin: Admin, current: string, next: string): Promise<LoginResult> {
  const { data } = await db().from("admins").select("password_hash").eq("id", admin.id).single();
  if (!data || !(await verifyPassword(data.password_hash, current))) {
    return { ok: false, error: "Current password is incorrect." };
  }
  const password_hash = await hashPassword(next);
  const { error } = await db().from("admins").update({ password_hash }).eq("id", admin.id);
  if (error) return { ok: false, error: "Could not update password." };
  // Re-issue this device's cookie; every other session is now invalid.
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, signToken("admin", { id: admin.id, pw: fingerprint(password_hash) }, MAX_AGE_S), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: MAX_AGE_S,
  });
  return { ok: true };
}
