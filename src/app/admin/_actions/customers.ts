"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { addRetailer, RetailerInput, setRetailerStatus } from "@/lib/server/admin/customers";

type Result = { ok: true } | { ok: false; error: string };

export async function setRetailerStatusAction(id: string, status: string, reason = ""): Promise<Result> {
  const parsed = z
    .object({
      id: z.uuid(),
      status: z.enum(["approved", "rejected", "blocked", "pending"]),
      reason: z.string().trim().max(200),
    })
    .safeParse({ id, status, reason });
  if (!parsed.success) return { ok: false, error: "Invalid request" };
  await setRetailerStatus(parsed.data.id, parsed.data.status, parsed.data.reason);
  refresh();
  return { ok: true };
}

export async function addRetailerAction(input: unknown): Promise<Result> {
  const parsed = RetailerInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    await addRetailer(parsed.data);
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
