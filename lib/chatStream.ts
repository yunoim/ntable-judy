// 단일 Node 인스턴스 내 채팅 메시지 pub/sub. SSE 클라이언트들에게 push.
// Railway 는 보통 인스턴스 1개로 운영하므로 외부 큐 불필요. 다중 인스턴스
// 환경 갈 때 Redis pub/sub 등으로 교체.

import type { ChatMessageBroadcast } from "./chatTypes";

type Listener = (msg: ChatMessageBroadcast) => void;
const listeners = new Set<Listener>();

export function emitChat(msg: ChatMessageBroadcast) {
  for (const l of listeners) {
    try {
      l(msg);
    } catch {
      /* ignore listener errors */
    }
  }
}

export function subscribeChat(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
