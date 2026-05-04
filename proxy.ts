// proxy.ts — 세션 쿠키 기반 가드 (role 체크는 페이지/API 단위)
// Next.js 16: middleware → proxy 로 file convention 변경
import { NextRequest, NextResponse } from "next/server";
import { publicOrigin } from "@/lib/origin";

export function proxy(req: NextRequest) {
  const APP_URL = publicOrigin(req);
  const session = req.cookies.get("session")?.value;
  const { pathname } = req.nextUrl;

  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt";

  if (!session && !isPublic) {
    return NextResponse.redirect(new URL("/login", APP_URL));
  }
  if (session && pathname === "/login") {
    return NextResponse.redirect(new URL("/", APP_URL));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)"],
};
