// 하루 한 줄 작성/수정.
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { todayKstStr } from "@/lib/daily";
import { notifyOthers } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });
  if (!["admin", "approved"].includes(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const text = (body.body ?? "").toString().trim();
  if (!text || text.length > 500) {
    return NextResponse.json({ error: "bad_body" }, { status: 400 });
  }
  const emoji = body.emoji
    ? (body.emoji ?? "").toString().trim().slice(0, 4) || null
    : null;
  // 클라이언트가 명시한 날짜 또는 오늘 (KST).
  const date =
    body.date && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
      ? body.date
      : todayKstStr();

  const existed = await prisma.dailyEntry.findUnique({
    where: { userId_date: { userId: user.id, date } },
  });

  const saved = await prisma.dailyEntry.upsert({
    where: { userId_date: { userId: user.id, date } },
    create: { userId: user.id, date, body: text, emoji },
    update: { body: text, emoji },
  });

  revalidatePath("/");

  // 새로 작성한 경우에만 푸시 (수정 시 도배 방지). 답 본문은 노출 X — 양쪽 답 후 공개.
  if (!existed) {
    notifyOthers(user.id, {
      title: `📓 ${user.nickname} 가 답했어요`,
      body: "오늘의 질문에 답하러 가볼까?",
      url: "/",
      tag: `daily-${date}-${user.id}`,
    }).catch((e) => console.error("[push] daily", e));
  }

  return NextResponse.json({
    id: saved.id,
    date: saved.date,
    body: saved.body,
    emoji: saved.emoji,
  });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const date = todayKstStr();
  await prisma.dailyEntry
    .delete({ where: { userId_date: { userId: user.id, date } } })
    .catch(() => {});
  revalidatePath("/");
  return NextResponse.json({ ok: true });
}
