// 채팅 메시지 wire 타입 — 서버/클라이언트 공통.
export type ChatMessageBroadcast = {
  id: number;
  body: string;
  imageUrl: string | null;
  createdAt: string;
  user: { id: string; nickname: string; emoji: string | null };
};
