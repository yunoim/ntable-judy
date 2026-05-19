// app/api/chat/route.ts — 채팅 메시지 페이지 조회 + 새 메시지 작성.
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notifyOthers } from "@/lib/push";

export const dynamic = "force-dynamic";

// 메시지 목록 (오래된 순, 최대 200).
// cursor 가 있으면 그 id 이전 메시지 100개 더 로드.
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });
  if (!["admin", "approved"].includes(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const beforeStr = url.searchParams.get("before");
  const take = Math.min(Number(url.searchParams.get("take") ?? "200"), 500);
  const where = beforeStr ? { id: { lt: Number(beforeStr) } } : undefined;

  const rows = await prisma.chatMessage.findMany({
    where,
    orderBy: { id: "desc" },
    take,
    include: { user: { select: { id: true, nickname: true, emoji: true } } },
  });

  // 응답은 오래된 → 최신.
  const messages = rows
    .reverse()
    .map((m) => ({
      id: m.id,
      body: m.body,
      imageUrl: m.imageUrl,
      createdAt: m.createdAt.toISOString(),
      user: m.user,
    }));

  return NextResponse.json({ messages });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });
  if (!["admin", "approved"].includes(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const text = (body.body ?? "").toString().trim();
  if (!text || text.length > 2000) {
    return NextResponse.json({ error: "bad_body" }, { status: 400 });
  }

  const created = await prisma.chatMessage.create({
    data: { userId: user.id, body: text },
    include: { user: { select: { id: true, nickname: true, emoji: true } } },
  });

  // 자기 자신은 보낸 직후 lastReadId 갱신 (안 읽은 수 0 유지).
  await prisma.chatRead
    .upsert({
      where: { userId: user.id },
      create: { userId: user.id, lastReadId: created.id },
      update: { lastReadId: created.id },
    })
    .catch(() => {});

  notifyOthers(user.id, {
    title: `💬 ${user.nickname}`,
    body: text.length > 80 ? text.slice(0, 80) + "…" : text,
    url: "/chat",
    tag: "chat",
  }).catch((e) => console.error("[push] chat", e));

  return NextResponse.json({
    id: created.id,
    body: created.body,
    imageUrl: null,
    createdAt: created.createdAt.toISOString(),
    user: created.user,
  });
}
