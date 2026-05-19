"use client";

import { useEffect, useRef, useState } from "react";

export type ChatMessageItem = {
  id: number;
  body: string;
  createdAt: string;
  user: { id: string; nickname: string; emoji: string | null };
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ko", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function dateLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dStart = new Date(d);
  dStart.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (today.getTime() - dStart.getTime()) / 86400000,
  );
  if (diffDays === 0) return "오늘";
  if (diffDays === 1) return "어제";
  return d.toLocaleDateString("ko", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

const POLL_MS = 4000;

export default function ChatClient({
  initial,
  meId,
}: {
  initial: ChatMessageItem[];
  meId: string;
}) {
  const [messages, setMessages] = useState<ChatMessageItem[]>(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const lastIdRef = useRef<number>(
    initial.length ? initial[initial.length - 1].id : 0,
  );

  // 마운트 시 lastReadId 갱신 + 스크롤 하단으로.
  useEffect(() => {
    if (lastIdRef.current > 0) {
      fetch("/api/chat/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastReadId: lastIdRef.current }),
      }).catch(() => {});
    }
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "auto",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 폴링 — POLL_MS 마다 새 메시지 가져오기.
  useEffect(() => {
    let alive = true;
    let t: ReturnType<typeof setTimeout>;
    async function tick() {
      if (!alive) return;
      try {
        const res = await fetch(`/api/chat?take=50`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const incoming = (data.messages ?? []) as ChatMessageItem[];
          if (incoming.length) {
            setMessages((prev) => {
              const known = new Set(prev.map((m) => m.id));
              const newOnes = incoming.filter((m) => !known.has(m.id));
              if (newOnes.length === 0) return prev;
              const merged = [...prev, ...newOnes];
              const last = merged[merged.length - 1];
              lastIdRef.current = last.id;
              // 새 메시지 마지막 ID 읽음 처리.
              fetch("/api/chat/read", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lastReadId: last.id }),
              }).catch(() => {});
              return merged;
            });
            // 새 메시지 들어오면 하단으로 스크롤 (사용자가 이미 거의 하단이면).
            requestAnimationFrame(() => {
              const el = scrollerRef.current;
              if (!el) return;
              const nearBottom =
                el.scrollHeight - el.scrollTop - el.clientHeight < 200;
              if (nearBottom) {
                el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
              }
            });
          }
        }
      } catch {
        /* ignore */
      }
      t = setTimeout(tick, POLL_MS);
    }
    t = setTimeout(tick, POLL_MS);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, []);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "전송 실패");
        return;
      }
      const created = (await res.json()) as ChatMessageItem;
      setMessages((prev) => [...prev, created]);
      lastIdRef.current = created.id;
      setText("");
      // 다음 paint 이후 스크롤.
      requestAnimationFrame(() => {
        scrollerRef.current?.scrollTo({
          top: scrollerRef.current.scrollHeight,
          behavior: "smooth",
        });
      });
    } catch (e: any) {
      setError(e?.message ?? "네트워크 오류");
    } finally {
      setSending(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <>
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto px-4 pt-3 pb-3 space-y-2"
      >
        {messages.length === 0 ? (
          <div className="text-center pt-16 text-fg-faint text-sm italic">
            아직 메시지가 없어요.
            <br />첫 메시지를 보내보세요.
          </div>
        ) : (
          messages.map((m, idx) => {
            const prev = idx > 0 ? messages[idx - 1] : null;
            const showDate =
              !prev || !sameDay(prev.createdAt, m.createdAt);
            const showAuthor =
              !prev ||
              prev.user.id !== m.user.id ||
              !sameDay(prev.createdAt, m.createdAt);
            const isMine = m.user.id === meId;
            return (
              <div key={m.id}>
                {showDate && (
                  <div className="text-center my-3">
                    <span className="text-[10px] text-fg-faint bg-bg-warm/60 rounded-full px-3 py-0.5 serif-italic">
                      {dateLabel(m.createdAt)}
                    </span>
                  </div>
                )}
                <div
                  className={[
                    "flex gap-2",
                    isMine ? "justify-end" : "justify-start",
                  ].join(" ")}
                >
                  {!isMine && showAuthor && (
                    <span className="text-base shrink-0 pt-1">
                      {m.user.emoji ?? "👤"}
                    </span>
                  )}
                  {!isMine && !showAuthor && <span className="w-6 shrink-0" />}
                  <div
                    className={[
                      "max-w-[78%] flex flex-col",
                      isMine ? "items-end" : "items-start",
                    ].join(" ")}
                  >
                    {!isMine && showAuthor && (
                      <span className="text-[10px] text-fg-faint mb-0.5 px-1">
                        {m.user.nickname}
                      </span>
                    )}
                    <div className="flex items-end gap-1.5">
                      {isMine && (
                        <span className="text-[10px] text-fg-faint pb-0.5">
                          {formatTime(m.createdAt)}
                        </span>
                      )}
                      <p
                        className={[
                          "rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words leading-relaxed",
                          isMine
                            ? "bg-accent text-bg rounded-br-md"
                            : "bg-bg-warm text-fg rounded-bl-md",
                        ].join(" ")}
                      >
                        {m.body}
                      </p>
                      {!isMine && (
                        <span className="text-[10px] text-fg-faint pb-0.5">
                          {formatTime(m.createdAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {error && (
        <p className="px-4 pb-1 text-[11px] text-rain">{error}</p>
      )}

      <div
        className="border-t border-fg/10 bg-bg/95 backdrop-blur px-3 py-2 flex items-end gap-2"
        style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 2000))}
          onKeyDown={handleKey}
          rows={1}
          placeholder="메시지"
          className="flex-1 resize-none bg-bg-warm/40 border border-fg/15 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:border-accent max-h-32"
          style={{ minHeight: "40px" }}
        />
        <button
          type="button"
          onClick={send}
          disabled={!text.trim() || sending}
          className="tap shrink-0 bg-ink-card text-bg rounded-full w-10 h-10 flex items-center justify-center font-display text-base disabled:opacity-40"
          aria-label="보내기"
        >
          ↑
        </button>
      </div>
    </>
  );
}
