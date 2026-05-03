import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ authed: false });
  return NextResponse.json({
    authed: true,
    user: {
      id: user.id,
      kakaoId: user.kakaoId,
      nickname: user.nickname,
      emoji: user.emoji,
      profileImage: user.profileImage,
      role: user.role,
    },
  });
}
