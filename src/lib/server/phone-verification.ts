import "server-only";
import { cookies } from "next/headers";
import { sessionCookieOptions, signToken, verifyToken } from "./session";

// After OTP, a brand-new number is remembered for 20 minutes in a signed cookie so the
// registration form can only ever be completed for a phone that was actually verified.

export const PHONE_COOKIE = "sn_phone";
const MAX_AGE_S = 20 * 60;

export function phoneCookie(phone: string) {
  return {
    name: PHONE_COOKIE,
    value: signToken("phone", { phone }, MAX_AGE_S),
    options: { ...sessionCookieOptions, maxAge: MAX_AGE_S },
  };
}

export async function getVerifiedPhone(): Promise<string | null> {
  const token = verifyToken<{ phone: string }>("phone", (await cookies()).get(PHONE_COOKIE)?.value);
  return token?.phone ?? null;
}
