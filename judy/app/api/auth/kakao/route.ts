import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

const KAKAO_AUTH_URL = "https://kauth.kakao.com/oauth/authorize";

export async function GET(req: Request) {
  if (!process.env.KAKAO_REST_API_KEY || !process.env.KAKAO_REDIRECT_URI) {
    return new Response("Kakao OAuth 미설정", { status: 503 });
  }

  const state = crypto.randomBytes(16).toString("hex");
  const c = await cookies();
  c.set("kakao_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const params = new URLSearchParams({
    client_id: process.env.KAKAO_REST_API_KEY,
    redirect_uri: process.env.KAKAO_REDIRECT_URI,
    response_type: "code",
    state,
  });

  return NextResponse.redirect(`${KAKAO_AUTH_URL}?${params.toString()}`);
}
