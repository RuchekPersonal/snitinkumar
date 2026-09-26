"use server";

import { refresh } from "next/cache";
import { createManualEnquiry, ManualEnquiry, updateEnquiry, UpdateEnquiry } from "@/lib/server/admin/enquiries";

export async function updateEnquiryAction(
  ref: string,
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = UpdateEnquiry.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (!/^ENQ-\d+$/.test(ref)) return { ok: false, error: "Invalid enquiry" };
  try {
    await updateEnquiry(ref, parsed.data);
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function createEnquiryAction(
  input: unknown,
): Promise<{ ok: true; ref: string } | { ok: false; error: string }> {
  const parsed = ManualEnquiry.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    const ref = await createManualEnquiry(parsed.data);
    refresh();
    return { ok: true, ref };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
