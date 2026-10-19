import "server-only";
import { z } from "zod";
import { db } from "../db";
import { requireAdmin } from "../admin-auth";
import { hashPassword, MIN_PASSWORD_LENGTH } from "../passwords";
import { must } from "./util";

// Admin portal accounts. Every admin has full access for now (no role-based permissions).

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  lastLoginAt: string | null;
  createdAt: string;
}

export async function listAdminUsers(): Promise<AdminUserRow[]> {
  await requireAdmin();
  const rows = must(
    await db().from("admins").select("id, name, email, last_login_at, created_at").order("created_at"),
    "admins",
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    lastLoginAt: r.last_login_at,
    createdAt: r.created_at,
  }));
}

export const AdminUserInput = z
  .object({
    name: z.string().trim().min(1, "Enter a name").max(80),
    email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
    password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
      .max(200),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords do not match" });

export async function addAdminUser(input: z.infer<typeof AdminUserInput>) {
  await requireAdmin();
  // Insert, never upsert: adding a user must not reset an existing admin's password.
  const { error } = await db()
    .from("admins")
    .insert({ name: input.name, email: input.email, password_hash: await hashPassword(input.password) });
  if (error?.code === "23505") throw new Error("An admin with this email already exists");
  if (error) throw new Error(error.message);
}
