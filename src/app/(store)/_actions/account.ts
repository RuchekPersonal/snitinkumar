"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/server/db";
import { encodeRetailerSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/server/session";
import { getVerifiedPhone, PHONE_COOKIE } from "@/lib/server/phone-verification";

const Registration = z.object({
  shopName: z.string().trim().min(2, "Shop name is required").max(120),
  ownerName: z.string().trim().min(2, "Your name is required").max(80),
  city: z.string().trim().min(2, "City is required").max(80),
  state: z.string().trim().max(40),
  pincode: z
    .string()
    .trim()
    .refine((v) => v === "" || /^[1-9]\d{5}$/.test(v), "Pincode should be 6 digits"),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === "" || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v), "GSTIN format looks wrong"),
  address: z.string().trim().max(300),
  transportPref: z.string().trim().max(80),
});

export type RegisterState = { error?: string; fields?: Record<string, string> } | undefined;

export async function registerAction(_prev: RegisterState, form: FormData): Promise<RegisterState> {
  const phone = await getVerifiedPhone();
  if (!phone) return { error: "Your OTP verification has expired. Please verify your mobile again." };

  const fields = Object.fromEntries(
    ["shopName", "ownerName", "city", "state", "pincode", "gstin", "address", "transportPref"].map((k) => [
      k,
      String(form.get(k) ?? ""),
    ]),
  );
  const parsed = Registration.safeParse(fields);
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };
  const v = parsed.data;

  const { data, error } = await db()
    .from("retailers")
    .insert({
      mobile: phone,
      shop_name: v.shopName,
      owner_name: v.ownerName,
      city: v.city,
      state: v.state,
      pincode: v.pincode || null,
      gstin: v.gstin || null,
      address: v.address,
      transport_pref: v.transportPref,
      status: "pending",
    })
    .select("id")
    .single();

  // Registered in the meantime (e.g. another tab): just sign them in.
  const id =
    data?.id ??
    (error?.code === "23505"
      ? (await db().from("retailers").select("id").eq("mobile", phone).single()).data?.id
      : undefined);
  if (!id) return { error: "Could not register right now. Please try again.", fields };

  const jar = await cookies();
  jar.set(SESSION_COOKIE, encodeRetailerSession(id), sessionCookieOptions);
  jar.delete(PHONE_COOKIE);
  redirect("/account?registered=1");
}

export async function logoutAction() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/");
}
