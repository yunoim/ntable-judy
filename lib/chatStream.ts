// 단일 Node 인스턴스 내 채팅 메시지 pub/sub. SSE 클라이언트들에게 push.
// Railway 는 보통 인스턴스 1개로 운영하므로 외부 큐 불필요. 다중 인스턴스
// 환경 갈 때 Redis pub/sub 등으로 교체.

import type { ChatMessageBroadcast } from "./chatTypes";

type NewListener = (msg: ChatMessageBroadcast) => void;
type DeleteListener = (id: number) => void;

const newListeners = new Set<NewListener>();
const delListeners = new Set<DeleteListener>();

export function emitChat(msg: ChatMessageBroadcast) {
  for (const l of newListeners) {
    try {
      l(msg);
    } catch {
      /* ignore */
    }
  }
}

export function subscribeChat(l: NewListener): () => void {
  newListeners.add(l);
  return () => {
    newListeners.delete(l);
  };
}

export function emitChatDelete(id: number) {
  for (const l of delListeners) {
    try {
      l(id);
    } catch {
      /* ignore */
    }
  }
}

export function subscribeChatDelete(l: DeleteListener): () => void {
  delListeners.add(l);
  return () => {
    delListeners.delete(l);
  };
}
