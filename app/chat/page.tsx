// app/chat/page.tsx — 1:1 채팅
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireApproved } from "@/lib/auth";
import { TabBar } from "@/components/ui";
import ChatClient, { type ChatMessageItem } from "./ChatClient";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const me = await requireApproved();

  // 최근 200 개 메시지 (오래된 → 최신) + 파트너 lastReadId.
  const [rows, partnerReads] = await Promise.all([
    prisma.chatMessage.findMany({
      orderBy: { id: "desc" },
      take: 200,
      include: { user: { select: { id: true, nickname: true, emoji: true } } },
    }),
    prisma.chatRead.findMany({
      where: { NOT: { userId: me.id } },
      select: { userId: true, lastReadId: true },
    }),
  ]);
  const messages: ChatMessageItem[] = rows
    .reverse()
    .map((m) => ({
      id: m.id,
      body: m.body,
      imageUrl: m.imageUrl,
      createdAt: m.createdAt.toISOString(),
      user: m.user,
    }));
  // 1:1 채팅 — 파트너 한 명. 여러 명 있어도 가장 최근 읽음 ID 사용.
  const partnerLastReadId = partnerReads.reduce(
    (max, r) => Math.max(max, r.lastReadId ?? 0),
    0,
  );

  // 열자마자 lastReadId 갱신 (서버측 처리는 클라이언트가 마운트 후 호출).

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-4 pt-3 pb-2 safe-top flex items-center justify-between border-b border-fg/10">
        <Link href="/" className="tap text-xs text-fg-faint">
          ← 홈
        </Link>
        <p className="font-display text-base">채팅</p>
        <span className="w-8" />
      </header>

      <ChatClient
        initial={messages}
        meId={me.id}
        initialPartnerLastReadId={partnerLastReadId}
      />

      <TabBar active="chat" />
    </div>
  );
}
