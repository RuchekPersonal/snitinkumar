import { NextResponse, type NextRequest } from "next/server";

// Optimistic gate for the admin portal: bounce visitors without an admin cookie to the
// login page. This is NOT the security check — every admin page, action and API route
// verifies the signed session against the database (requireAdmin / requireAdminApi).
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isLogin = pathname === "/admin/login";

  if (!isLogin && pathname.startsWith("/admin") && !req.cookies.has("sn_admin")) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
