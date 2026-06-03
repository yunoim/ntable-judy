"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import DrawingCanvas from "./DrawingCanvas";

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
  initialPartnerLastReadId,
}: {
  initial: ChatMessageItem[];
  meId: string;
  initialPartnerLastReadId: number;
}) {
  const [messages, setMessages] = useState<ChatMessageItem[]>(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partnerLastReadId, setPartnerLastReadId] = useState<number>(
    initialPartnerLastReadId,
  );
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const lastIdRef = useRef<number>(
    initial.length ? initial[initial.length - 1].id : 0,
  );

  // 마운트 시 즉시 하단 스크롤 (paint 전). 사용자가 맨 위를 안 보게.
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);
  // 이미지 등 비동기 로드로 높이 변하면 다시 하단. + lastReadId 갱신.
  useEffect(() => {
    if (lastIdRef.current > 0) {
      fetch("/api/chat/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastReadId: lastIdRef.current }),
      }).catch(() => {});
    }
    const jump = () => {
      const el = scrollerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    };
    const timers = [50, 200, 500, 1000].map((d) => setTimeout(jump, d));
    return () => timers.forEach(clearTimeout);
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
    es.addEventListener("chat-delete", (evt) => {
      try {
        const { id } = JSON.parse((evt as MessageEvent).data) as { id: number };
        setMessages((prev) => prev.filter((m) => m.id !== id));
      } catch {
        /* ignore */
      }
    });
    es.addEventListener("chat-read", (evt) => {
      try {
        const data = JSON.parse((evt as MessageEvent).data) as {
          userId: string;
          lastReadId: number;
        };
        // 상대방의 읽음 진행만 추적 (본인 device 끼리 sync 도 들어오지만 무해).
        if (data.userId === meId) return;
        setPartnerLastReadId((prev) =>
          data.lastReadId > prev ? data.lastReadId : prev,
        );
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

  // 본인이 보낸 직후 + SSE echo 가 race 로 같은 id 두 번 추가되는 걸 막기 위해
  // dedup. setMessages 가 functional 이라 같은 batch 내에서도 안전.
  function appendMessage(msg: ChatMessageItem) {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
    lastIdRef.current = msg.id;
    requestAnimationFrame(() => {
      scrollerRef.current?.scrollTo({
        top: scrollerRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }

  // setState 기반 sending 가드는 더블 탭 race 에 약함 (setState 가 비동기
  // 라 같은 React batch 내 두 번째 read 도 false 봄). ref 로 즉시 차단.
  const sendingRef = useRef(false);

  async function send() {
    const body = text.trim();
    if (!body || sendingRef.current) return;
    sendingRef.current = true;
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
      sendingRef.current = false;
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
  const [showCanvas, setShowCanvas] = useState(false);

  async function sendDrawing(blob: Blob) {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setError(null);
    try {
      const fd = new FormData();
      const file = new File([blob], "drawing.png", { type: "image/png" });
      fd.append("file", file);
      fd.append("body", "🎨");
      const res = await fetch("/api/chat/photo", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "전송 실패");
        return;
      }
      appendMessage(data as ChatMessageItem);
      setShowCanvas(false);
    } catch (e: any) {
      setError(e?.message ?? "네트워크 오류");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  // long-press 삭제. 본인 메시지 말풍선을 500ms 누르면 confirm 후 삭제.
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressTriggered = useRef(false);

  function cancelPress() {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }

  async function deleteMessage(id: number) {
    // 낙관적 제거. 실패 시 폴링/SSE 가 다음 tick 때 복원하지는 않으므로
    // 실패하면 alert 후 새로고침 안내.
    const snapshot = messages;
    setMessages((prev) => prev.filter((m) => m.id !== id));
    try {
      const res = await fetch(`/api/chat/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setMessages(snapshot);
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "삭제 실패");
      }
    } catch (e: any) {
      setMessages(snapshot);
      setError(e?.message ?? "네트워크 오류");
    }
  }

  function startPress(id: number) {
    cancelPress();
    pressTriggered.current = false;
    pressTimer.current = setTimeout(() => {
      pressTriggered.current = true;
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          (navigator as Navigator).vibrate?.(40);
        } catch {
          /* ignore */
        }
      }
      if (confirm("이 메시지를 삭제할까요?")) {
        deleteMessage(id);
      }
    }, 500);
  }

  async function uploadPhoto(file: File) {
    if (sendingRef.current) return;
    sendingRef.current = true;
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
      sendingRef.current = false;
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
                        <span className="flex flex-col items-end pb-0.5 leading-tight">
                          {m.id > partnerLastReadId && (
                            <span
                              className="text-[10px] text-accent font-display"
                              aria-label="안 읽음"
                            >
                              1
                            </span>
                          )}
                          <span className="text-[10px] text-fg-faint">
                            {formatTime(m.createdAt)}
                          </span>
                        </span>
                      )}
                      <div
                        className={[
                          "flex flex-col gap-1 max-w-full select-none",
                          isMine ? "items-end" : "items-start",
                        ].join(" ")}
                        onPointerDown={
                          isMine ? () => startPress(m.id) : undefined
                        }
                        onPointerUp={isMine ? cancelPress : undefined}
                        onPointerLeave={isMine ? cancelPress : undefined}
                        onPointerCancel={isMine ? cancelPress : undefined}
                        onContextMenu={
                          isMine
                            ? (e) => {
                                // 데스크탑 우클릭 = 삭제 단축.
                                e.preventDefault();
                                if (confirm("이 메시지를 삭제할까요?")) {
                                  deleteMessage(m.id);
                                }
                              }
                            : undefined
                        }
                      >
                        {m.imageUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              // long-press 가 발동했으면 click 무시.
                              if (pressTriggered.current) {
                                pressTriggered.current = false;
                                return;
                              }
                              setLightbox(m.imageUrl!);
                            }}
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
        className="border-t border-fg/10 bg-bg/95 backdrop-blur px-3 py-2 flex items-end gap-2 shrink-0"
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
            accept="image/*,.gif"
            disabled={sending}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadPhoto(f);
            }}
            className="hidden"
          />
        </label>
        <button
          type="button"
          onClick={() => setShowCanvas(true)}
          disabled={sending}
          className={[
            "tap shrink-0 w-10 h-10 rounded-full flex items-center justify-center border border-fg/20 text-fg-soft",
            sending ? "opacity-40 cursor-wait" : "hover:bg-bg-warm",
          ].join(" ")}
          aria-label="낙서"
        >
          🎨
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 2000))}
          onKeyDown={handleKey}
          rows={1}
          placeholder="메시지"
          className="flex-1 resize-none bg-bg-warm/40 border border-fg/15 rounded-full px-4 text-sm leading-tight focus:outline-none focus:border-accent max-h-32 py-[10px]"
          style={{ minHeight: "40px", height: "40px" }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "40px";
            el.style.height = Math.min(128, el.scrollHeight) + "px";
          }}
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

      {showCanvas && (
        <DrawingCanvas
          onSend={sendDrawing}
          onClose={() => setShowCanvas(false)}
          sending={sending}
        />
      )}

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
