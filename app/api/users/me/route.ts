import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ALLOWED_EMOJIS = [
  "🦊", "🐰", "🐻", "🐱", "🐶", "🐯",
  "🦝", "🐼", "🐨", "🐺", "🦄", "🐹",
  "🐧", "🦋", "🌱", "✨",
];

const BIRTHDAY_KIND = "birthday";

function parseBirthday(input: unknown): Date | null | undefined {
  if (input === undefined) return undefined;
  if (input === null || input === "") return null;
  if (typeof input !== "string") return undefined;
  const m = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return undefined;
  const d = new Date(`${input}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

function parseBirthTime(input: unknown): string | null | undefined {
  if (input === undefined) return undefined;
  if (input === null || input === "") return null;
  if (typeof input !== "string") return undefined;
  if (!/^\d{2}:\d{2}$/.test(input)) return undefined;
  return input;
}

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

  let birthday: Date | null | undefined = undefined;
  if ("birthday" in body) {
    birthday = parseBirthday(body.birthday);
    if (birthday === undefined && body.birthday !== undefined) {
      return NextResponse.json({ error: "bad_birthday" }, { status: 400 });
    }
    data.birthday = birthday;
  }

  if ("birthTime" in body) {
    const bt = parseBirthTime(body.birthTime);
    if (bt === undefined && body.birthTime !== undefined && body.birthTime !== null && body.birthTime !== "") {
      return NextResponse.json({ error: "bad_birth_time" }, { status: 400 });
    }
    data.birthTime = bt ?? null;
  }

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
    select: {
      id: true,
      nickname: true,
      emoji: true,
      birthday: true,
      birthTime: true,
    },
  });

  if (birthday !== undefined) {
    const existing = await prisma.anniversary.findUnique({
      where: { userId_kind: { userId: user.id, kind: BIRTHDAY_KIND } },
    });
    if (birthday === null) {
      if (existing) {
        await prisma.anniversary.delete({ where: { id: existing.id } });
      }
    } else {
      const label = `${updated.nickname} 생일`;
      if (existing) {
        await prisma.anniversary.update({
          where: { id: existing.id },
          data: { date: birthday, label, recurring: true },
        });
      } else {
        await prisma.anniversary.create({
          data: {
            label,
            date: birthday,
            emoji: "🎂",
            recurring: true,
            createdById: user.id,
            userId: user.id,
            kind: BIRTHDAY_KIND,
          },
        });
      }
    }
  }

  revalidatePath("/");
  revalidatePath("/us");
  revalidatePath("/us/saju");
  revalidatePath("/settings/profile");
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
      birthday: user.birthday,
      birthTime: user.birthTime,
    },
    allowedEmojis: ALLOWED_EMOJIS,
  });
}
