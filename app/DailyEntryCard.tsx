"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export type DailyEntryItem = {
  body: string;
  emoji: string | null;
};

export default function DailyEntryCard({
  meId,
  meNickname,
  partnerNickname,
  myEntry,
  partnerEntry,
  streak,
  dateStr,
}: {
  meId: string;
  meNickname: string;
  partnerNickname: string | null;
  myEntry: DailyEntryItem | null;
  partnerEntry: DailyEntryItem | null;
  streak: number;
  dateStr: string;
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

  const both = myEntry && partnerEntry;
  const eitherEmpty = !myEntry || !partnerEntry;

  return (
    <>
      <section className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[11px] text-fg-faint tracking-wider uppercase">
            오늘 한 줄
          </p>
          {streak > 0 && (
            <span className="text-[11px] text-accent font-display">
              🔥 {streak}일 연속
            </span>
          )}
        </div>

        {both ? (
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
            <EntryBubble
              label={partnerNickname ?? "상대"}
              entry={partnerEntry}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setText(myEntry?.body ?? "");
              setEmoji(myEntry?.emoji ?? "");
              setOpen(true);
            }}
            className="tap lift w-full editorial-card-warm px-4 py-3 text-left"
          >
            {myEntry ? (
              <>
                <p className="text-[10px] text-fg-faint">내 한 줄</p>
                <p className="text-sm mt-0.5 line-clamp-2">
                  {myEntry.emoji && <span className="mr-1">{myEntry.emoji}</span>}
                  {myEntry.body}
                </p>
                <p className="text-[10px] text-fg-faint mt-1">
                  {partnerNickname ?? "상대"} 기다리는 중…
                </p>
              </>
            ) : partnerEntry ? (
              <>
                <p className="text-[10px] text-fg-faint">
                  {partnerNickname ?? "상대"} 가 한 줄 남겼어요
                </p>
                <p className="text-sm mt-0.5 line-clamp-2 text-fg-soft italic">
                  {partnerEntry.emoji && (
                    <span className="mr-1">{partnerEntry.emoji}</span>
                  )}
                  {partnerEntry.body}
                </p>
                <p className="text-[11px] text-accent font-display mt-1">
                  + 내 차례
                </p>
              </>
            ) : (
              <>
                <p className="text-[10px] text-fg-faint">오늘 한 줄</p>
                <p className="font-display text-sm mt-0.5">
                  + 오늘 한 줄 남기기
                </p>
                <p className="text-[10px] text-fg-faint mt-1">
                  둘 다 작성하면 스트릭 +1
                </p>
              </>
            )}
          </button>
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
              <p className="font-display text-base">오늘 한 줄</p>
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
                placeholder="오늘은 뭐 했어? 기분 어땠어?"
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
