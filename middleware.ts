import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  

  const accessToken = req.cookies.get("token")?.value ?? null;
  const refreshToken = req.cookies.get("refreshToken")?.value ?? null;

  
  if (!accessToken && !refreshToken) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|register|api/auth|api/login|_next|favicon.ico).*)"],
};
