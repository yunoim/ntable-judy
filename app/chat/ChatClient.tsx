"use client";

import { useEffect, useRef, useState } from "react";

export type ChatMessageItem = {
  id: number;
  body: string;
  imageUrl?: string | null;
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

// SSE 가 우선. 연결 끊김 대비로 폴링도 30초마다 (놓친 메시지 catch up).
const POLL_MS = 30_000;

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

  // 새 메시지 도착 처리 — SSE / 폴링 / 보내기 후 공통.
  const handleIncoming = (incoming: ChatMessageItem[]) => {
    if (!incoming.length) return;
    setMessages((prev) => {
      const known = new Set(prev.map((m) => m.id));
      const newOnes = incoming.filter((m) => !known.has(m.id));
      if (newOnes.length === 0) return prev;
      const merged = [...prev, ...newOnes].sort((a, b) => a.id - b.id);
      const last = merged[merged.length - 1];
      lastIdRef.current = last.id;
      fetch("/api/chat/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastReadId: last.id }),
      }).catch(() => {});
      return merged;
    });
    requestAnimationFrame(() => {
      const el = scrollerRef.current;
      if (!el) return;
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
      if (nearBottom) {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      }
    });
  };

  // SSE — 새 메시지 즉시 push. EventSource 가 자동 재연결.
  useEffect(() => {
    if (typeof window === "undefined" || !("EventSource" in window)) return;
    const es = new EventSource("/api/chat/stream");
    es.addEventListener("chat", (evt) => {
      try {
        const data = JSON.parse((evt as MessageEvent).data) as ChatMessageItem;
        handleIncoming([data]);
      } catch {
        /* ignore */
      }
    });
    return () => {
      es.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 폴링 fallback — SSE 가 끊긴 사이의 놓친 메시지 catch up.
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
          handleIncoming(incoming);
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

  function appendMessage(msg: ChatMessageItem) {
    setMessages((prev) => [...prev, msg]);
    lastIdRef.current = msg.id;
    requestAnimationFrame(() => {
      scrollerRef.current?.scrollTo({
        top: scrollerRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }

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
      appendMessage(created);
      setText("");
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

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  async function uploadPhoto(file: File) {
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (text.trim()) fd.append("body", text.trim());
      const res = await fetch("/api/chat/photo", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          data.error === "too_large"
            ? "8MB 이하 이미지만"
            : data.error === "bad_mime"
              ? "이미지 파일만"
              : data.error === "storage_not_configured"
                ? "사진 저장소 미설정"
                : data.error ?? "업로드 실패",
        );
        return;
      }
      appendMessage(data as ChatMessageItem);
      setText("");
    } catch (e: any) {
      setError(e?.message ?? "네트워크 오류");
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
                      <div
                        className={[
                          "flex flex-col gap-1 max-w-full",
                          isMine ? "items-end" : "items-start",
                        ].join(" ")}
                      >
                        {m.imageUrl && (
                          <button
                            type="button"
                            onClick={() => setLightbox(m.imageUrl!)}
                            className="tap block rounded-2xl overflow-hidden border border-fg/10"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={m.imageUrl}
                              alt=""
                              className="max-w-[220px] max-h-[280px] object-cover block"
                            />
                          </button>
                        )}
                        {m.body && (
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
                        )}
                      </div>
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
        style={{
          marginBottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <label
          className={[
            "tap shrink-0 w-10 h-10 rounded-full flex items-center justify-center border border-fg/20 text-fg-soft cursor-pointer",
            sending ? "opacity-40 cursor-wait" : "hover:bg-bg-warm",
          ].join(" ")}
          aria-label="사진 첨부"
        >
          📷
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            disabled={sending}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadPhoto(f);
            }}
            className="hidden"
          />
        </label>
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

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-fg/95 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt=""
            className="max-w-full max-h-full object-contain rounded-card"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox(null);
            }}
          />
        </div>
      )}
    </>
  );
}
