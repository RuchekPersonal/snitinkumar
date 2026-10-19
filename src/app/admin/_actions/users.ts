"use server";

import { refresh } from "next/cache";
import { addAdminUser, AdminUserInput } from "@/lib/server/admin/users";

type Result = { ok: true } | { ok: false; error: string };

export async function addAdminUserAction(input: unknown): Promise<Result> {
  const parsed = AdminUserInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    await addAdminUser(parsed.data);
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
