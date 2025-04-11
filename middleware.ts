import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const walletConnected = request.cookies.get("wallet-connected");
  const isPublicPath = request.nextUrl.pathname === "/";

  if (!walletConnected && !isPublicPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/team/create",
    "/team/create/:path*",
    "/workspace/:fileId*",
  ],
};
