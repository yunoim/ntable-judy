"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export type DailyEntryItem = {
  body: string;
  emoji: string | null;
};

export default function DailyEntryCard({
  meNickname,
  partnerNickname,
  myEntry,
  partnerEntry,
  partnerHasAnswered,
  streak,
  dateStr,
  question,
}: {
  meId: string;
  meNickname: string;
  partnerNickname: string | null;
  myEntry: DailyEntryItem | null;
  // 내가 아직 답 안했을 때는 null 로 들어옴 (서버에서 가림).
  partnerEntry: DailyEntryItem | null;
  // 파트너가 실제로 답을 했는지 (가렸어도 메타정보는 노출).
  partnerHasAnswered: boolean;
  streak: number;
  dateStr: string;
  question: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(myEntry?.body ?? "");
  const [emoji, setEmoji] = useState<string>(myEntry?.emoji ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setError(null);
  }

  async function save() {
    if (!text.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: text.trim(),
          emoji: emoji || null,
          date: dateStr,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "저장 실패");
        return;
      }
      close();
      startTransition(() => router.refresh());
    } catch (e: any) {
      setError(e?.message ?? "네트워크 오류");
    } finally {
      setSaving(false);
    }
  }

  const both = !!myEntry && !!partnerEntry;
  const partnerLabel = partnerNickname ?? "상대";

  return (
    <>
      <section className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[11px] text-fg-faint tracking-wider uppercase">
            오늘의 질문
          </p>
          {streak > 0 && (
            <span className="text-[11px] text-accent font-display">
              🔥 {streak}일 연속
            </span>
          )}
        </div>

        {/* 질문 — 항상 노출. 둘 다 같은 질문에 답함. */}
        {question && (
          <div className="editorial-card-warm px-4 py-3">
            <p className="font-display text-[15px] leading-snug">
              {question}
            </p>
          </div>
        )}

        {both ? (
          <div className="grid grid-cols-2 gap-2">
            <EntryBubble
              label={meNickname}
              entry={myEntry!}
              accent
              onClick={() => {
                setText(myEntry!.body);
                setEmoji(myEntry!.emoji ?? "");
                setOpen(true);
              }}
            />
            <EntryBubble label={partnerLabel} entry={partnerEntry!} />
          </div>
        ) : myEntry ? (
          // 내가 답했고 파트너는 아직.
          <div className="grid grid-cols-2 gap-2">
            <EntryBubble
              label={meNickname}
              entry={myEntry}
              accent
              onClick={() => {
                setText(myEntry.body);
                setEmoji(myEntry.emoji ?? "");
                setOpen(true);
              }}
            />
            <div className="editorial-card px-3 py-2.5 flex flex-col gap-1 text-left bg-bg-warm/30">
              <p className="text-[10px] text-fg-faint">{partnerLabel}</p>
              <p className="text-[13px] text-fg-faint italic leading-snug">
                답을 기다리는 중…
              </p>
            </div>
          </div>
        ) : (
          // 미응답 — 카드가 아니라 진짜 CTA 버튼처럼 진한 배경 + 큰 라벨.
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => {
                setText("");
                setEmoji("");
                setOpen(true);
              }}
              className="tap lift w-full bg-ink-card text-bg rounded-card px-5 py-4 font-display text-[15px] flex items-center justify-between shadow-sm"
            >
              <span>
                ✏️{" "}
                {partnerHasAnswered
                  ? "답하고 서로 답 보기"
                  : "오늘의 답 쓰기"}
              </span>
              <span className="text-accent-soft text-base">→</span>
            </button>
            <p className="text-[11px] text-fg-faint text-center italic px-2">
              {partnerHasAnswered
                ? `${partnerLabel} 가 먼저 답했어요 · 둘 다 답해야 공개`
                : "둘 다 답하면 🔥 연속 +1일"}
            </p>
          </div>
        )}
      </section>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30 bg-fg/60"
            onClick={close}
          />
          <div
            className="fixed left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-bg rounded-t-card overflow-y-auto animate-slide-up-centered z-30"
            style={{
              bottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
              maxHeight: "70vh",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 bg-bg/95 backdrop-blur px-5 pt-3 pb-2 border-b border-fg/10 flex items-center justify-between">
              <p className="font-display text-base">오늘의 답</p>
              <button
                type="button"
                onClick={close}
                aria-label="닫기"
                className="text-fg-faint text-sm"
              >
                ✕
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              {question && (
                <p className="text-[13px] text-fg-soft leading-snug font-display">
                  Q. {question}
                </p>
              )}
              <div className="flex gap-1.5 flex-wrap">
                {["", "😊", "🥰", "😴", "🍜", "☕", "🎬", "✨", "💭"].map(
                  (e) => (
                    <button
                      key={e || "blank"}
                      type="button"
                      onClick={() => setEmoji(e)}
                      className={[
                        "w-9 h-9 rounded-card text-base flex items-center justify-center",
                        emoji === e
                          ? "bg-accent text-bg"
                          : "bg-bg-warm/40 border border-fg/15",
                      ].join(" ")}
                    >
                      {e || "—"}
                    </button>
                  ),
                )}
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 500))}
                placeholder="여기에 답을 적어보세요"
                rows={4}
                autoFocus
                className="w-full bg-bg-warm/40 border border-fg/15 rounded-card px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-accent placeholder:italic placeholder:text-fg-faint"
              />
              {error && <p className="text-xs text-rain">{error}</p>}
              <button
                type="button"
                onClick={save}
                disabled={!text.trim() || saving}
                className="w-full bg-ink-card text-bg rounded-card py-2.5 text-sm font-semibold disabled:opacity-40"
              >
                {saving ? "저장 중…" : myEntry ? "수정 ✓" : "저장 ✓"}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function EntryBubble({
  label,
  entry,
  accent,
  onClick,
}: {
  label: string;
  entry: DailyEntryItem;
  accent?: boolean;
  onClick?: () => void;
}) {
  const cls = [
    "editorial-card px-3 py-2.5 flex flex-col gap-1 text-left",
    accent ? "border-accent" : "",
    onClick ? "tap lift" : "",
  ].join(" ");
  const inner = (
    <>
      <p className="text-[10px] text-fg-faint">{label}</p>
      <p className="text-[13px] line-clamp-3 leading-snug">
        {entry.emoji && <span className="mr-1">{entry.emoji}</span>}
        {entry.body}
      </p>
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        {inner}
      </button>
    );
  }
  return <div className={cls}>{inner}</div>;
}
