import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const token = req.cookies.get("refreshToken")?.value ?? req.cookies.get("token")?.value;


  if (!token) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("from", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!login|register|api/auth|api/login|_next|favicon.ico).*)",
  ],
};
