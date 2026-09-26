import { NextResponse } from "next/server";
import { demoRolesEnabled, encodeDemoSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/server/session";
import type { Viewer } from "@/lib/types";

// Review-only role switcher so price gating can be checked without a real OTP login.
// Disabled in production unless ENABLE_DEMO_ROLES=true.
const demoViewers: Record<string, Viewer> = {
  approved: {
    role: "approved",
    name: "Priya Shah",
    shopName: "Meera Boutique",
    city: "Surat",
    phone: "+91 99000 11223",
  },
  pending: { role: "pending", name: "Nandini Rao", shopName: "Nandini Fashion House", city: "Hyderabad" },
};

export async function GET(req: Request) {
  if (!demoRolesEnabled()) return new Response("Not found", { status: 404 });

  const url = new URL(req.url);
  const role = url.searchParams.get("role") ?? "guest";
  const back = url.searchParams.get("next") ?? "/";
  const target = new URL(back.startsWith("/") && !back.startsWith("//") ? back : "/", url.origin);

  const res = NextResponse.redirect(target, 303);
  const viewer = demoViewers[role];
  if (viewer) res.cookies.set(SESSION_COOKIE, encodeDemoSession(viewer), sessionCookieOptions);
  else res.cookies.delete(SESSION_COOKIE);
  return res;
}
