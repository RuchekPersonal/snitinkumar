import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyFirebasePhone } from "@/lib/server/firebase-verify";
import { db } from "@/lib/server/db";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { encodeRetailerSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/server/session";
import { PHONE_COOKIE, phoneCookie } from "@/lib/server/phone-verification";

const Body = z.object({ idToken: z.string().min(100).max(4096) });

/** Exchanges a Firebase phone-auth ID token for our own session (RFD §2.2, flow diagram 5). */
export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(req.url).host) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!rateLimit(`otp-verify:${clientIp(req)}`, 20, 15 * 60_000)) {
    return Response.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });

  let phone: string;
  try {
    phone = await verifyFirebasePhone(parsed.data.idToken);
  } catch {
    return Response.json({ error: "Could not verify the OTP. Please try again." }, { status: 401 });
  }

  const { data: retailer, error } = await db().from("retailers").select("id").eq("mobile", phone).maybeSingle();
  if (error) return Response.json({ error: "Please try again in a moment." }, { status: 503 });

  if (retailer) {
    const res = NextResponse.json({ next: "/account" });
    res.cookies.set(SESSION_COOKIE, encodeRetailerSession(retailer.id), sessionCookieOptions);
    res.cookies.delete(PHONE_COOKIE);
    return res;
  }

  // New number: remember the verified phone briefly so /register cannot be used with an unverified one.
  const res = NextResponse.json({ next: "/register" });
  const c = phoneCookie(phone);
  res.cookies.set(c.name, c.value, c.options);
  return res;
}
