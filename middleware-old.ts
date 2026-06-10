import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(
  request: NextRequest
) {
  const token =
    request.cookies.get(
      "sb-access-token"
    );

  const isLoginPage =
    request.nextUrl.pathname ===
    "/login";

  // NOT LOGGED IN
  if (!token && !isLoginPage) {
    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  // ALREADY LOGGED IN
  if (token && isLoginPage) {
    return NextResponse.redirect(
      new URL("/", request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/leads/:path*",
  ],
};
