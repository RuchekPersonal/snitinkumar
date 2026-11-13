"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import {
  addAdminUser,
  AdminRoleInput,
  AdminUserInput,
  PasswordResetInput,
  removeAdminUser,
  resetAdminPassword,
  setAdminRole,
} from "@/lib/server/admin/users";

type Result = { ok: true } | { ok: false; error: string };

async function run(fn: () => Promise<void>): Promise<Result> {
  try {
    await fn();
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function addAdminUserAction(input: unknown): Promise<Result> {
  const parsed = AdminUserInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  return run(() => addAdminUser(parsed.data));
}

export async function setAdminRoleAction(id: string, role: string): Promise<Result> {
  const parsed = z.object({ id: z.uuid(), role: AdminRoleInput }).safeParse({ id, role });
  if (!parsed.success) return { ok: false, error: "Invalid request" };
  return run(() => setAdminRole(parsed.data.id, parsed.data.role));
}

export async function resetAdminPasswordAction(id: string, input: unknown): Promise<Result> {
  const parsed = PasswordResetInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Invalid request" };
  return run(() => resetAdminPassword(id, parsed.data.password));
}

export async function removeAdminUserAction(id: string): Promise<Result> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Invalid request" };
  return run(() => removeAdminUser(id));
}
