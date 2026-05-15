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
  meRole,
  owners,
  initialDate,
}: {
  events: EventRow[];
  meId: string;
  meRole: string;
  owners: Owner[];
  initialDate?: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
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

  // initialDate 가 들어오고 #add-event 해시면 자동 열기 + 스크롤
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#add-event" && initialDate && !formOpen) {
      setAdding(true);
      setDate(initialDate);
      setTimeout(() => {
        addAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 60);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  function startEdit(e: EventRow) {
    setAdding(false);
    setEditingId(e.id);
    setTitle(e.title);
    const d = new Date(e.startsAt);
    setDate(localInput(d).slice(0, 10));
    setTime(localInput(d).slice(11, 16));
    setAllDay(e.allDay);
    if (e.endsAt) {
      const ed = new Date(e.endsAt);
      const startStr = localInput(d).slice(0, 10);
      const endStr = localInput(ed).slice(0, 10);
      setMultiDay(endStr !== startStr);
      setEndDate(endStr);
      setEndTime(localInput(ed).slice(11, 16));
    } else {
      setMultiDay(false);
      setEndDate(localInput(d).slice(0, 10));
      setEndTime("21:00");
    }
    setCategory(e.category ?? "");
    setNote(e.note ?? "");
    setOwnerId(e.user.id);
    setError(null);
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

  async function remove(id: number) {
    if (busyId) return;
    if (!confirm("삭제할까요?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/personal-events/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "실패");
        return;
      }
      startTransition(() => router.refresh());
    } catch (e: any) {
      setError(e?.message ?? "네트워크 오류");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="px-5 pb-6 space-y-3 pt-5">
      <div ref={addAnchorRef} id="add-event" className="scroll-mt-4" />
      <div className="flex items-center justify-between">
        <p className="eyebrow">개인 약속 · {events.length}개</p>
        <button
          onClick={() => {
            if (formOpen) reset();
            else setAdding(true);
          }}
          className={[
            "tap rounded-full px-3.5 py-1.5 text-[12px] font-display border transition-colors",
            formOpen
              ? "border-fg/20 text-fg-faint"
              : "border-accent text-accent hover:bg-accent hover:text-bg",
          ].join(" ")}
        >
          {formOpen ? "✕ 닫기" : "+ 약속 추가"}
        </button>
      </div>
      {error && (
        <p className="text-xs text-rain bg-rain/10 px-3 py-2 rounded-card">
          {error}
        </p>
      )}

      {formOpen && (
        <div className="editorial-card-warm p-4 space-y-3">
          <p className="eyebrow">{editingId ? "수정" : "새 약속"}</p>
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

      {events.length === 0 ? (
        <p className="text-[11px] text-fg-faint serif-italic px-1 py-3">
          아직 등록된 약속이 없어요.
        </p>
      ) : (
        <ul className="space-y-2">
          {events.map((e) => {
            const start = new Date(e.startsAt);
            const end = e.endsAt ? new Date(e.endsAt) : null;
            const isMulti = end && end.toDateString() !== start.toDateString();
            const canManage = ["admin", "approved"].includes(meRole);
            return (
              <li
                key={e.id}
                className="editorial-card px-4 py-3 flex items-start gap-3"
              >
                <span className="text-base shrink-0 leading-tight pt-0.5">
                  {e.emoji ?? e.user.emoji ?? "·"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-sm truncate">
                      {e.title}
                    </span>
                    {isMulti && (
                      <span className="text-[9px] tracking-wider text-accent border border-accent/40 rounded-full px-1.5 py-0.5">
                        {Math.round((end.getTime() - start.getTime()) / 86400000) + 1}일
                      </span>
                    )}
                    {e.category && (
                      <span className="text-[9px] tracking-wider uppercase text-fg-faint border border-fg/15 rounded-full px-1.5 py-0.5">
                        {e.category}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-fg-faint mt-0.5">
                    <span className="serif-italic">{e.user.nickname}</span>
                    <span className="mx-1.5 text-fg-faint/50">·</span>
                    {start.toLocaleDateString("ko", {
                      month: "long",
                      day: "numeric",
                      weekday: "short",
                    })}
                    {!e.allDay &&
                      " · " +
                        start.toLocaleTimeString("ko", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                    {isMulti && (
                      <>
                        {" → "}
                        {end.toLocaleDateString("ko", {
                          month: "long",
                          day: "numeric",
                          weekday: "short",
                        })}
                        {!e.allDay &&
                          " " +
                            end.toLocaleTimeString("ko", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                      </>
                    )}
                    {!isMulti && e.allDay && " · 하루"}
                  </p>
                  {e.note && (
                    <p className="text-[11px] text-fg-soft mt-1 italic">
                      {e.note}
                    </p>
                  )}
                  {canManage && (
                    <div className="flex gap-2.5 mt-1.5">
                      <button
                        onClick={() => startEdit(e)}
                        className="text-[10px] text-fg-faint underline"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => remove(e.id)}
                        disabled={busyId === e.id}
                        className="text-[10px] text-fg-faint underline"
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
