"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

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

export default function EventsSection({
  events,
  meId,
  meRole,
}: {
  events: EventRow[];
  meId: string;
  meRole: string;
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
  const [date, setDate] = useState(localInput(new Date()).slice(0, 10));
  const [time, setTime] = useState("19:00");
  const [allDay, setAllDay] = useState(false);
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");

  const formOpen = adding || editingId !== null;

  function reset() {
    setTitle("");
    setDate(localInput(new Date()).slice(0, 10));
    setTime("19:00");
    setAllDay(false);
    setCategory("");
    setNote("");
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
    setCategory(e.category ?? "");
    setNote(e.note ?? "");
    setError(null);
  }

  async function save() {
    if (!title.trim() || !date) {
      setError("제목·날짜는 필수");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const startsAt = allDay
        ? new Date(`${date}T00:00:00`).toISOString()
        : new Date(`${date}T${time}:00`).toISOString();
      const payload = {
        title,
        startsAt,
        allDay,
        category: category || null,
        note: note || null,
      };
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
    <section className="px-5 pb-6 space-y-3">
      <div className="flex items-center justify-between">
        <p className="eyebrow">⌗ 개인 약속 · {events.length}</p>
        <button
          onClick={() => {
            if (formOpen) reset();
            else setAdding(true);
          }}
          className="text-sm text-accent"
        >
          {formOpen ? "✕" : "+ 추가"}
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
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 80))}
            placeholder="제목 (예: 회사 회식)"
            className="w-full bg-bg border border-fg/20 rounded-card px-3 py-2.5 text-sm focus:outline-none focus:border-accent"
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
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
          <label className="flex items-center gap-2 text-xs text-fg-soft">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
            />
            하루 종일
          </label>
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
            const isMine = e.user.id === meId;
            const canManage = isMine || meRole === "admin";
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
                    {e.allDay && " · 하루"}
                  </p>
                  {e.note && (
                    <p className="text-[11px] text-fg-soft mt-1 italic">
                      {e.note}
                    </p>
                  )}
                  {canManage && (
                    <div className="flex gap-2.5 mt-1.5">
                      {isMine && (
                        <button
                          onClick={() => startEdit(e)}
                          className="text-[10px] text-fg-faint underline"
                        >
                          수정
                        </button>
                      )}
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
