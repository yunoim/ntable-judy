import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, SESSION_TTL_MS } from "@/lib/auth";

const KAKAO_TOKEN_URL = "https://kauth.kakao.com/oauth/token";
const KAKAO_USERINFO_URL = "https://kapi.kakao.com/v2/user/me";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const kError = url.searchParams.get("error");

  const c = await cookies();
  const cookieState = c.get("kakao_oauth_state")?.value;
  c.delete("kakao_oauth_state");

  if (kError) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(kError)}`, req.url));
  }
  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(new URL("/login?error=state", req.url));
  }

  try {
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.KAKAO_REST_API_KEY!,
      redirect_uri: process.env.KAKAO_REDIRECT_URI!,
      code,
    });
    if (process.env.KAKAO_CLIENT_SECRET) {
      tokenParams.set("client_secret", process.env.KAKAO_CLIENT_SECRET);
    }

    const tokenRes = await fetch(KAKAO_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams,
    });
    if (!tokenRes.ok) {
      const errBody = await tokenRes.text().catch(() => "");
      console.error("[kakao callback] token exchange failed", tokenRes.status, errBody);
      throw new Error("token_exchange");
    }
    const tok = await tokenRes.json();

    const uiRes = await fetch(KAKAO_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tok.access_token}` },
    });
    if (!uiRes.ok) {
      const errBody = await uiRes.text().catch(() => "");
      console.error("[kakao callback] userinfo failed", uiRes.status, errBody);
      throw new Error("userinfo");
    }
    const ui = await uiRes.json();

    const kakaoId = String(ui.id || "");
    if (!kakaoId) throw new Error("no_kakao_id");
    const account = ui.kakao_account || {};
    const profile = account.profile || {};
    const nickname = profile.nickname || "사용자";
    const profileImage = profile.profile_image_url || null;
    const email = account.email || null;

    const isAdmin = !!process.env.ADMIN_KAKAO_ID && process.env.ADMIN_KAKAO_ID === kakaoId;
    const existing = await prisma.user.findUnique({ where: { kakaoId } });

    let user;
    if (existing) {
      user = await prisma.user.update({
        where: { kakaoId },
        data: {
          nickname,
          profileImage,
          email,
          lastLoginAt: new Date(),
          ...(isAdmin && existing.role !== "admin"
            ? { role: "admin", approvedAt: new Date() }
            : {}),
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          kakaoId,
          nickname,
          profileImage,
          email,
          role: isAdmin ? "admin" : "pending",
          approvedAt: isAdmin ? new Date() : null,
          lastLoginAt: new Date(),
        },
      });
    }

    if (user.role === "rejected") {
      return NextResponse.redirect(new URL("/login?error=rejected", req.url));
    }

    const token = crypto.randomBytes(48).toString("hex");
    const ip =
      (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || null;
    const userAgent = (req.headers.get("user-agent") || "").slice(0, 500) || null;

    await prisma.session.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
        ip,
        userAgent,
      },
    });

    c.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: Math.floor(SESSION_TTL_MS / 1000),
      path: "/",
    });

    if (user.role === "pending") {
      return NextResponse.redirect(new URL("/pending", req.url));
    }
    return NextResponse.redirect(new URL("/", req.url));
  } catch (err) {
    console.error("[kakao callback] FATAL", err);
    return NextResponse.redirect(new URL("/login?error=server", req.url));
  }
}
