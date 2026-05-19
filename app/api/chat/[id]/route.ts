// 채팅 메시지 삭제. 본인 메시지 또는 admin 만 가능.
// 사진 메시지면 R2 객체도 함께 삭제.
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { storage, keyFromUrl } from "@/lib/storage";
import { emitChatDelete } from "@/lib/chatStream";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });
  if (!["admin", "approved"].includes(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const messageId = Number(id);
  if (!Number.isInteger(messageId) || messageId <= 0) {
    return NextResponse.json({ error: "bad_id" }, { status: 400 });
  }

  const msg = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    select: { id: true, userId: true, imageKey: true, imageUrl: true },
  });
  if (!msg) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (msg.userId !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await prisma.chatMessage.delete({ where: { id: messageId } });

  // R2 객체 best-effort 삭제. DB 는 이미 지워짐 — soft fail.
  const key = msg.imageKey ?? (msg.imageUrl ? keyFromUrl(msg.imageUrl) : null);
  if (key && storage.isConfigured()) {
    storage.del(key).catch((e) => console.error("[chat] del r2", e));
  }

  emitChatDelete(messageId);

  return NextResponse.json({ ok: true, id: messageId });
}
