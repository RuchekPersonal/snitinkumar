import "server-only";
import { z } from "zod";
import { db } from "../db";
import { requireOwner } from "../admin-auth";
import { hashPassword, MIN_PASSWORD_LENGTH } from "../passwords";
import { must } from "./util";

// Admin portal accounts, managed by owners only. Owners and staff otherwise have the same
// access. An owner cannot change, reset or remove their own account here (they use Change
// password), so there is always at least one owner left.

export type AdminRole = "owner" | "staff";

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  locked: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export async function listAdminUsers(): Promise<AdminUserRow[]> {
  await requireOwner();
  const rows = must(
    await db()
      .from("admins")
      .select("id, name, email, role, locked_until, last_login_at, created_at")
      .order("created_at"),
    "admins",
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role,
    locked: !!r.locked_until && new Date(r.locked_until) > new Date(),
    lastLoginAt: r.last_login_at,
    createdAt: r.created_at,
  }));
}

const password = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  .max(200);

export const AdminRoleInput = z.enum(["owner", "staff"]);

export const AdminUserInput = z
  .object({
    name: z.string().trim().min(1, "Enter a name").max(80),
    email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
    role: AdminRoleInput,
    password,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords do not match" });

export const PasswordResetInput = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "Passwords do not match" });

export async function addAdminUser(input: z.infer<typeof AdminUserInput>) {
  await requireOwner();
  // Insert, never upsert: adding a user must not reset an existing admin's password.
  const { error } = await db()
    .from("admins")
    .insert({
      name: input.name,
      email: input.email,
      role: input.role,
      password_hash: await hashPassword(input.password),
    });
  if (error?.code === "23505") throw new Error("An admin with this email already exists");
  if (error) throw new Error(error.message);
}

/** Loads another admin for an owner to change; refuses the owner's own account. */
async function otherAdmin(id: string) {
  const me = await requireOwner();
  if (id === me.id) throw new Error("You can't change your own account here. Use Change password instead.");
  const { data } = await db().from("admins").select("id").eq("id", id).maybeSingle();
  if (!data) throw new Error("This admin user no longer exists");
}

export async function setAdminRole(id: string, role: AdminRole) {
  await otherAdmin(id);
  must(await db().from("admins").update({ role }).eq("id", id), "update role");
}

/** New password; their current sessions end (the session cookie is tied to the hash) and any lock is lifted. */
export async function resetAdminPassword(id: string, newPassword: string) {
  await otherAdmin(id);
  must(
    await db()
      .from("admins")
      .update({ password_hash: await hashPassword(newPassword), failed_logins: 0, locked_until: null })
      .eq("id", id),
    "reset password",
  );
}

/** Deleting the row signs them out everywhere; history they touched keeps an empty "by". */
export async function removeAdminUser(id: string) {
  await otherAdmin(id);
  must(await db().from("admins").delete().eq("id", id), "remove admin");
}
