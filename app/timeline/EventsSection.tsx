"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

export type EventRow = {
  id: number;
  title: string;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  category: string | null;
  emoji: string | null;
  note: string | null;
  user: { id: string; nickname: string; emoji: string | null };
};

const CATEGORIES = ["회식", "가족", "약속", "출장", "운동", "기타"];

function localInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Owner = { id: string; nickname: string; color: "accent" | "rain" };

export default function EventsSection({
  events,
  meId,
  owners,
  initialDate,
}: {
  events: EventRow[];
  meId: string;
  owners: Owner[];
  initialDate?: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // form state
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(
    initialDate ?? localInput(new Date()).slice(0, 10),
  );
  const [time, setTime] = useState("19:00");
  const [allDay, setAllDay] = useState(false);
  const [multiDay, setMultiDay] = useState(false);
  const [endDate, setEndDate] = useState(
    initialDate ?? localInput(new Date()).slice(0, 10),
  );
  const [endTime, setEndTime] = useState("21:00");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [ownerId, setOwnerId] = useState<string>(meId);

  const formOpen = adding || editingId !== null;
  const addAnchorRef = useRef<HTMLDivElement | null>(null);

  // #add-event 해시 + initialDate 가 들어오면 자동 열기 + 스크롤.
  // hashchange 도 감지 — 같은 selectedDay 상태에서 "+ 개인 일정 등록" 링크를
  // 다시 클릭해도 URL hash 만 바뀌어 mount 가 안 일어나는 케이스 대응.
  useEffect(() => {
    if (typeof window === "undefined") return;
    function open() {
      if (window.location.hash !== "#add-event") return;
      if (!initialDate) return;
      setAdding(true);
      setDate(initialDate);
      setTimeout(() => {
        addAnchorRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 60);
    }
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, [initialDate]);

  function reset() {
    setTitle("");
    setDate(initialDate ?? localInput(new Date()).slice(0, 10));
    setTime("19:00");
    setAllDay(false);
    setMultiDay(false);
    setEndDate(initialDate ?? localInput(new Date()).slice(0, 10));
    setEndTime("21:00");
    setCategory("");
    setNote("");
    setOwnerId(meId);
    setEditingId(null);
    setAdding(false);
  }

  async function save() {
    if (!title.trim() || !date) {
      setError("제목·날짜는 필수");
      return;
    }
    if (multiDay && endDate < date) {
      setError("종료일이 시작일보다 빠를 수 없어요");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // allDay: UTC noon 으로 저장. 어느 timezone 서버에서도 같은 day 로 잡힘.
      // (이전: T00:00:00 로컬 → UTC 변환 시 KST→UTC 가 9시간 이전 = 전날로 밀려나는 버그)
      const startsAt = allDay
        ? `${date}T12:00:00.000Z`
        : new Date(`${date}T${time}:00`).toISOString();
      let endsAtVal: string | null = null;
      if (multiDay) {
        endsAtVal = allDay
          ? `${endDate}T12:00:00.000Z`
          : new Date(`${endDate}T${endTime}:00`).toISOString();
      }
      const payload: Record<string, unknown> = {
        title,
        startsAt,
        endsAt: endsAtVal,
        allDay,
        category: category || null,
        note: note || null,
      };
      // 신규 등록 시에만 owner 지정 (수정은 원래 owner 유지)
      if (!editingId && ownerId !== meId) {
        payload.userId = ownerId;
      }
      const url = editingId
        ? `/api/personal-events/${editingId}`
        : "/api/personal-events";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "실패");
        return;
      }
      reset();
      startTransition(() => router.refresh());
    } catch (e: any) {
      setError(e?.message ?? "네트워크 오류");
    } finally {
      setSaving(false);
    }
  }

  // 폼/에러가 없으면 빈 박스만 남으므로 렌더 자체를 건너뛴다.
  // (캘린더 날짜의 "+ 개인 일정 등록" 버튼 → #add-event 해시 + initialDate 로 form 자동 오픈.)
  if (!formOpen && !error) {
    return <div ref={addAnchorRef} id="add-event" />;
  }

  return (
    <section className="px-5 pb-6 space-y-3 pt-5">
      <div ref={addAnchorRef} id="add-event" className="scroll-mt-4" />
      {formOpen && (
        <div className="flex items-center justify-end">
          <button
            onClick={() => reset()}
            className="tap rounded-full px-3.5 py-1.5 text-[12px] font-display border border-fg/20 text-fg-faint"
          >
            ✕ 닫기
          </button>
        </div>
      )}
      {error && (
        <p className="text-xs text-rain bg-rain/10 px-3 py-2 rounded-card">
          {error}
        </p>
      )}

      {formOpen && (
        <div className="editorial-card-warm p-4 space-y-3">
          <p className="eyebrow">{editingId ? "수정" : "새 개인 일정"}</p>
          {!editingId && owners.length > 1 && (
            <div className="space-y-1.5">
              <p className="eyebrow !text-[9px]">누구 일정</p>
              <div className="flex gap-1.5">
                {owners.map((o) => {
                  const active = ownerId === o.id;
                  const isMe = o.id === meId;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setOwnerId(o.id)}
                      className={[
                        "flex-1 rounded-card text-xs py-2 px-2 border flex items-center justify-center gap-1.5 transition-colors",
                        active
                          ? "bg-ink-card text-bg border-ink-card"
                          : "bg-bg text-fg-soft border-fg/20",
                      ].join(" ")}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{
                          background:
                            o.color === "accent"
                              ? "var(--accent)"
                              : "var(--rain)",
                        }}
                      />
                      {isMe ? `내 일정 (${o.nickname})` : `${o.nickname} 일정`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {editingId && (
            <p className="text-[10px] text-fg-faint italic">
              {events.find((e) => e.id === editingId)?.user.nickname} 의 일정
            </p>
          )}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 80))}
            placeholder="제목 (예: 회사 회식)"
            className="w-full bg-bg border border-fg/20 rounded-card px-3 py-2.5 text-sm focus:outline-none focus:border-accent"
          />
          <div className="space-y-1.5">
            <p className="eyebrow !text-[9px]">{multiDay ? "시작" : "날짜"}</p>
            <div className="flex gap-2">
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  if (!multiDay || endDate < e.target.value) setEndDate(e.target.value);
                }}
                className="flex-1 bg-bg border border-fg/20 rounded-card px-3 py-2.5 text-sm focus:outline-none focus:border-accent"
              />
              {!allDay && (
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="bg-bg border border-fg/20 rounded-card px-3 py-2.5 text-sm focus:outline-none focus:border-accent"
                />
              )}
            </div>
          </div>
          {multiDay && (
            <div className="space-y-1.5">
              <p className="eyebrow !text-[9px]">종료</p>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={endDate}
                  min={date}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="flex-1 bg-bg border border-fg/20 rounded-card px-3 py-2.5 text-sm focus:outline-none focus:border-accent"
                />
                {!allDay && (
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="bg-bg border border-fg/20 rounded-card px-3 py-2.5 text-sm focus:outline-none focus:border-accent"
                  />
                )}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="grid grid-cols-2 rounded-card border border-fg/20 overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setAllDay(false)}
                className={[
                  "py-2 text-center transition-colors",
                  !allDay ? "bg-ink-card text-bg" : "bg-bg text-fg-soft",
                ].join(" ")}
              >
                ⏰ 시간
              </button>
              <button
                type="button"
                onClick={() => setAllDay(true)}
                className={[
                  "py-2 text-center transition-colors",
                  allDay ? "bg-ink-card text-bg" : "bg-bg text-fg-soft",
                ].join(" ")}
              >
                📅 하루
              </button>
            </div>
            <div className="grid grid-cols-2 rounded-card border border-fg/20 overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setMultiDay(false)}
                className={[
                  "py-2 text-center transition-colors",
                  !multiDay ? "bg-ink-card text-bg" : "bg-bg text-fg-soft",
                ].join(" ")}
              >
                당일
              </button>
              <button
                type="button"
                onClick={() => setMultiDay(true)}
                className={[
                  "py-2 text-center transition-colors",
                  multiDay ? "bg-ink-card text-bg" : "bg-bg text-fg-soft",
                ].join(" ")}
              >
                여러 날
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(category === c ? "" : c)}
                className={[
                  "rounded-full text-xs px-3 py-1 border",
                  category === c
                    ? "bg-ink-card text-bg border-ink-card"
                    : "bg-bg text-fg-soft border-fg/20",
                ].join(" ")}
              >
                {c}
              </button>
            ))}
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 500))}
            placeholder="메모 (선택)"
            rows={2}
            className="w-full bg-bg border border-fg/20 rounded-card px-3 py-2.5 text-sm focus:outline-none focus:border-accent resize-none"
          />
          <button
            type="button"
            onClick={save}
            disabled={saving || !title.trim() || !date}
            className="w-full bg-ink-card text-bg rounded-card py-2.5 text-sm font-semibold disabled:opacity-40"
          >
            {saving ? "저장 중..." : editingId ? "수정 ✓" : "추가 ✓"}
          </button>
        </div>
      )}

    </section>
  );
}
