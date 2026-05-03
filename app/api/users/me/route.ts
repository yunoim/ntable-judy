import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ALLOWED_EMOJIS = [
  "🦊", "🐰", "🐻", "🐱", "🐶", "🐯",
  "🦝", "🐼", "🐨", "🐺", "🦄", "🐹",
  "🐧", "🦋", "🌱", "✨",
];

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (typeof body.nickname === "string") {
    const nick = body.nickname.trim();
    if (nick.length < 1 || nick.length > 20) {
      return NextResponse.json({ error: "bad_nickname" }, { status: 400 });
    }
    data.nickname = nick;
  }

  if (typeof body.emoji === "string") {
    const emoji = body.emoji.trim();
    if (emoji && !ALLOWED_EMOJIS.includes(emoji)) {
      return NextResponse.json({ error: "bad_emoji" }, { status: 400 });
    }
    data.emoji = emoji || null;
  }

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
    select: { id: true, nickname: true, emoji: true },
  });
  return NextResponse.json({ user: updated });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });
  return NextResponse.json({
    user: {
      id: user.id,
      nickname: user.nickname,
      emoji: user.emoji,
      role: user.role,
      profileImage: user.profileImage,
    },
    allowedEmojis: ALLOWED_EMOJIS,
  });
}
