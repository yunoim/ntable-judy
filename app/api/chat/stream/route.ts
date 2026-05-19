// 채팅 SSE 스트림. EventSource 로 클라이언트가 long-lived 연결 유지.
// 새 메시지 broadcast 가 들어오면 즉시 push.
import { getCurrentUser } from "@/lib/auth";
import {
  subscribeChat,
  subscribeChatDelete,
  subscribeChatRead,
} from "@/lib/chatStream";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("unauth", { status: 401 });
  if (!["admin", "approved"].includes(user.role)) {
    return new Response("forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      function send(data: string) {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          closed = true;
        }
      }

      // 초기 핑.
      send(`: connected ${Date.now()}\n\n`);

      // 25초 마다 heartbeat (idle proxy 차단 방지).
      const hb = setInterval(() => {
        send(`: ping\n\n`);
      }, 25_000);

      const unsubscribeNew = subscribeChat((msg) => {
        send(`event: chat\ndata: ${JSON.stringify(msg)}\n\n`);
      });
      const unsubscribeDel = subscribeChatDelete((id) => {
        send(`event: chat-delete\ndata: ${JSON.stringify({ id })}\n\n`);
      });
      const unsubscribeRead = subscribeChatRead((evt) => {
        send(`event: chat-read\ndata: ${JSON.stringify(evt)}\n\n`);
      });

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(hb);
        unsubscribeNew();
        unsubscribeDel();
        unsubscribeRead();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      req.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // nginx/proxy 의 버퍼링 비활성화.
      "X-Accel-Buffering": "no",
    },
  });
}
