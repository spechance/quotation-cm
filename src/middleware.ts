import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Public routes
  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth") || pathname.startsWith("/change-password")) {
    return NextResponse.next();
  }

  // Check authentication
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Force password change
  if (req.auth.user.mustChangePassword && !pathname.startsWith("/api/")) {
    return NextResponse.redirect(new URL("/change-password", req.url));
  }

  const role = req.auth.user.role;

  // Admin-only routes
  if (pathname.startsWith("/users") || pathname.startsWith("/templates") || pathname.startsWith("/settings")) {
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  // Finance + Admin only
  if (pathname.startsWith("/approvals") || pathname.startsWith("/approved")) {
    if (role !== "ADMIN" && role !== "FINANCE") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts|logo.png).*)"],
};
