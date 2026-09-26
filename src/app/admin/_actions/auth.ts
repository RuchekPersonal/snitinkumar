"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { changeAdminPassword, loginAdmin, logoutAdmin, requireAdmin } from "@/lib/server/admin-auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/server/passwords";
import { rateLimit } from "@/lib/server/rate-limit";

export type FormState = { error?: string; ok?: string } | undefined;

export async function loginAction(_prev: FormState, form: FormData): Promise<FormState> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`admin-login:${ip}`, 10, 15 * 60_000)) {
    return { error: "Too many attempts from this network. Try again in 15 minutes." };
  }
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const result = await loginAdmin(email, password);
  if (!result.ok) return { error: result.error };
  redirect("/admin");
}

export async function logoutAction() {
  await logoutAdmin();
  redirect("/admin/login");
}

const PasswordChange = z
  .object({
    current: z.string().min(1, "Enter your current password"),
    next: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `New password must be at least ${MIN_PASSWORD_LENGTH} characters`)
      .max(200),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { message: "New passwords do not match" });

export async function changePasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = PasswordChange.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const result = await changeAdminPassword(admin, parsed.data.current, parsed.data.next);
  return result.ok ? { ok: "Password changed. Other devices have been signed out." } : { error: result.error };
}
