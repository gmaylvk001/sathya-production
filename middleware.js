import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/register", "/admin/unauthorized"];

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // Only protect /admin routes
  if (pathname.startsWith("/admin")) {
    // Allow static assets under /admin (images, icons, etc.)
    if (/\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|map)$/i.test(pathname)) {
      return NextResponse.next();
    }

    // Allow public admin pages
    if (PUBLIC_ADMIN_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
      return NextResponse.next();
    }

    // Extract token from cookies or Authorization header
    const token =
      req.cookies.get("admin_token")?.value ||
      req.cookies.get("token")?.value ||
      (req.headers.get("authorization")?.startsWith("Bearer ")
        ? req.headers.get("authorization").slice(7).trim()
        : null);

    if (!token) {
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not set");
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);

      // Verify user_type is admin
      const userType = payload.user_type || payload.role;
      if (userType === "admin") {
        return NextResponse.next();
      }

      // If user_type is not on token, verify via internal auth check
      if (!userType && payload.userId) {
        try {
          const authCheckUrl = new URL("/api/auth/check", req.url);
          const authRes = await fetch(authCheckUrl, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (authRes.ok) {
            const authData = await authRes.json();
            if (authData.loggedIn && authData.role === "admin") {
              return NextResponse.next();
            }
          }
        } catch {
          // Verification fallback failed
        }
      }

      // Non-admin token -> redirect to login with error
      const unauthorizedUrl = new URL("/admin/login", req.url);
      unauthorizedUrl.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(unauthorizedUrl);
    } catch {
      // Invalid or expired token -> redirect to login
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("from", pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete("admin_token");
      response.cookies.delete("token");
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/admin"],
};
