// 마지막 읽은 메시지 ID 기록. 안 읽은 수 계산용.
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { emitChatRead } from "@/lib/chatStream";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const lastReadId = Number(body.lastReadId);
  if (!Number.isFinite(lastReadId) || lastReadId < 0) {
    return NextResponse.json({ error: "bad_id" }, { status: 400 });
  }

  await prisma.chatRead.upsert({
    where: { userId: user.id },
    create: { userId: user.id, lastReadId },
    update: { lastReadId },
  });

  emitChatRead({ userId: user.id, lastReadId });

  return NextResponse.json({ ok: true });
}
