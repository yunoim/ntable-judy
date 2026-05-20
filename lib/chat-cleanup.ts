// 채팅 사진 TTL — 업로드 24h 지난 사진은 R2 + DB 정리.
// 텍스트 동반 메시지면 사진만 떼어내고 텍스트는 남김. 사진 전용 메시지는 통째 삭제.
import { prisma } from "./db";
import { storage, keyFromUrl } from "./storage";
import { emitChatDelete } from "./chatStream";

const CHAT_PHOTO_TTL_MS = 24 * 60 * 60 * 1000;

export async function cleanupOldChatPhotos(): Promise<{
  scanned: number;
  cleared: number;
  deleted: number;
}> {
  const cutoff = new Date(Date.now() - CHAT_PHOTO_TTL_MS);
  const old = await prisma.chatMessage.findMany({
    where: {
      imageUrl: { not: null },
      createdAt: { lt: cutoff },
    },
    select: { id: true, body: true, imageKey: true, imageUrl: true },
  });
  let cleared = 0;
  let deleted = 0;
  for (const m of old) {
    const key =
      m.imageKey ?? (m.imageUrl ? keyFromUrl(m.imageUrl) : null);
    if (key && storage.isConfigured()) {
      try {
        await storage.del(key);
      } catch (e) {
        console.error("[cleanup] r2 del", m.id, e);
      }
    }
    if (!m.body || !m.body.trim()) {
      // 사진 전용 메시지 → 메시지 통째로 삭제. 연결된 클라이언트도 즉시 반영.
      try {
        await prisma.chatMessage.delete({ where: { id: m.id } });
        emitChatDelete(m.id);
        deleted++;
      } catch (e) {
        console.error("[cleanup] db del", m.id, e);
      }
    } else {
      // 텍스트 동반 → 사진 필드만 정리. 클라이언트는 다음 폴링/재방문 때 갱신.
      try {
        await prisma.chatMessage.update({
          where: { id: m.id },
          data: { imageUrl: null, imageKey: null },
        });
        cleared++;
      } catch (e) {
        console.error("[cleanup] db update", m.id, e);
      }
    }
  }
  return { scanned: old.length, cleared, deleted };
}
