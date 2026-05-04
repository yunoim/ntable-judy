"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { TabBar } from "@/components/ui";

type Anniversary = {
  id: number;
  label: string;
  date: string;
  emoji: string | null;
  recurring: boolean;
  kind: string | null;
  createdBy: { id: string; nickname: string };
};

type Milestone = {
  key: string;
  label: string;
  emoji: string;
  date: string;
};

const EMOJI_OPTIONS = ["💍", "💝", "🌸", "🎂", "✨", "🥂", "📅", "🎁"];

function daysUntil(target: Date) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

function nextOccurrence(date: string, recurring: boolean): Date {
  const d = new Date(date);
  if (!recurring) return d;
  const now = new Date();
  d.setFullYear(now.getFullYear());
  if (daysUntil(new Date(d)) < 0) d.setFullYear(now.getFullYear() + 1);
  return d;
}

function distanceLabel(dateStr: string, recurring: boolean): {
  text: string;
  highlight: boolean;
} {
  if (recurring) {
    const next = nextOccurrence(dateStr, true);
    const days = daysUntil(next);
    if (days === 0) return { text: "오늘 ★", highlight: true };
    if (days < 0) return { text: `D+${Math.abs(days)}`, highlight: false };
    return { text: `D-${days}`, highlight: days <= 30 };
  } else {
    const days = daysUntil(new Date(dateStr));
    if (days > 0) return { text: `D-${days}`, highlight: days <= 30 };
    if (days === 0) return { text: "오늘 ★", highlight: true };
    return { text: `D+${Math.abs(days)}`, highlight: false };
  }
}

function isoDateOnly(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

export default function UsClient({
  meId,
  meRole,
  anniversaries,
  milestones,
}: {
  meId: string;
  meRole: string;
  anniversaries: Anniversary[];
  milestones: Milestone[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [label, setLabel] = useState("");
  const [date, setDate] = useState("");
  const [emoji, setEmoji] = useState<string>("📅");
  const [recurring, setRecurring] = useState(true);
  const [kind, setKind] = useState<"" | "couple_start">("");
  const [saving, setSaving] = useState(false);

  const hasCoupleStart = anniversaries.some((a) => a.kind === "couple_start");

  const sorted = [...anniversaries].sort((a, b) => {
    const aDays = daysUntil(nextOccurrence(a.date, a.recurring));
    const bDays = daysUntil(nextOccurrence(b.date, b.recurring));
    const aFuture = aDays >= 0;
    const bFuture = bDays >= 0;
    if (aFuture !== bFuture) return aFuture ? -1 : 1;
    if (aFuture) return aDays - bDays;
    return bDays - aDays;
  });

  function resetForm() {
    setLabel("");
    setDate("");
    setEmoji("📅");
    setRecurring(true);
    setKind("");
    setEditingId(null);
  }

  function startEdit(a: Anniversary) {
    setAdding(false);
    setEditingId(a.id);
    setLabel(a.label);
    setDate(isoDateOnly(a.date));
    setEmoji(a.emoji ?? "📅");
    setRecurring(a.recurring);
    setKind(a.kind === "couple_start" ? "couple_start" : "");
    setError(null);
  }

  function chooseKind(next: "" | "couple_start") {
    setKind(next);
    if (next === "couple_start") {
      setRecurring(false);
      if (!label.trim()) setLabel("사귄 날");
      if (emoji === "📅") setEmoji("💝");
    }
  }

  async function add() {
    if (!label.trim() || !date) {
      setError("이름이랑 날짜는 필수");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/anniversaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, date, emoji, recurring, kind }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error === "couple_start_exists"
            ? "이미 만남 시작한 날이 등록되어 있어요"
            : data.error ?? "실패",
        );
        return;
      }
      resetForm();
      setAdding(false);
      startTransition(() => router.refresh());
    } catch (e: any) {
      setError(e?.message ?? "네트워크 오류");
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    if (!editingId) return;
    if (!label.trim() || !date) {
      setError("이름이랑 날짜는 필수");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/anniversaries/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, date, emoji, recurring }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "실패");
        return;
      }
      resetForm();
      startTransition(() => router.refresh());
    } catch (e: any) {
      setError(e?.message ?? "네트워크 오류");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (busyId) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/anniversaries/${id}`, { method: "DELETE" });
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

  const formOpen = adding || editingId !== null;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-bg/95 backdrop-blur border-b border-fg/15 px-4 pt-4 pb-3 safe-top flex items-center justify-between">
        <Link href="/" className="text-sm text-fg-faint">
          ← 홈
        </Link>
        <p className="font-display text-base">
          우리의 <em className="italic text-accent">날들</em>
        </p>
        <button
          onClick={() => {
            if (formOpen) {
              resetForm();
              setAdding(false);
            } else {
              setAdding(true);
            }
          }}
          className="text-sm text-accent"
          aria-label="추가"
        >
          {formOpen ? "✕" : "+"}
        </button>
      </header>

      {error && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-card border border-rain/40 bg-rain/10 text-xs text-rain">
          {error}
        </div>
      )}

      {formOpen && (
        <section className="mx-4 mt-3 p-4 rounded-card bg-bg-warm/50 border border-accent/30 space-y-3">
          <p className="text-[11px] tracking-widest uppercase text-fg-faint">
            {editingId ? "수정" : "추가"}
          </p>
          {!editingId && (
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => chooseKind("")}
                className={[
                  "flex-1 rounded-card text-xs py-2 px-2 border",
                  kind === ""
                    ? "bg-ink-card text-bg border-ink-card"
                    : "bg-bg text-fg-soft border-fg/20",
                ].join(" ")}
              >
                일반 기념일
              </button>
              <button
                type="button"
                onClick={() => chooseKind("couple_start")}
                disabled={hasCoupleStart}
                className={[
                  "flex-1 rounded-card text-xs py-2 px-2 border",
                  kind === "couple_start"
                    ? "bg-ink-card text-bg border-ink-card"
                    : "bg-bg text-fg-soft border-fg/20 disabled:opacity-40",
                ].join(" ")}
              >
                만남 시작한 날
              </button>
            </div>
          )}
          {kind === "couple_start" && !editingId && (
            <p className="text-[10px] text-fg-faint italic">
              저장하면 100일이 자동 등록돼요 (이미 지난 경우 생략).
            </p>
          )}
          {hasCoupleStart && !editingId && kind === "" && (
            <p className="text-[10px] text-fg-faint italic">
              만남 시작한 날은 이미 등록돼 있어요.
            </p>
          )}
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value.slice(0, 30))}
            placeholder="이름 (예: 사귄 날, 100일, 주디 생일)"
            className="w-full bg-bg border border-fg/20 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-accent"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-bg border border-fg/20 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-accent"
          />
          <div className="flex gap-1.5 flex-wrap">
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={[
                  "w-9 h-9 rounded-card text-base flex items-center justify-center",
                  emoji === e ? "bg-accent text-bg" : "bg-bg border border-fg/20",
                ].join(" ")}
              >
                {e}
              </button>
            ))}
          </div>
          {kind !== "couple_start" && (
            <label className="flex items-center gap-2 text-xs text-fg-soft">
              <input
                type="checkbox"
                checked={recurring}
                onChange={(e) => setRecurring(e.target.checked)}
              />
              매년 반복 (생일/기념일이면 ✓)
            </label>
          )}
          <button
            type="button"
            onClick={editingId ? saveEdit : add}
            disabled={saving || !label.trim() || !date}
            className="w-full bg-ink-card text-bg rounded-card py-2.5 text-sm font-semibold disabled:opacity-40"
          >
            {saving ? "저장 중..." : editingId ? "수정 ✓" : "추가 ✓"}
          </button>
        </section>
      )}

      <main className="flex-1 px-4 py-4 pb-24 space-y-3">
        {milestones.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] tracking-widest uppercase text-fg-faint">
              마일스톤 (자동)
            </p>
            <ul className="space-y-1.5">
              {milestones.map((m) => {
                const days = daysUntil(new Date(m.date));
                const dist =
                  days === 0
                    ? { text: "오늘 ★", highlight: true }
                    : days > 0
                    ? { text: `D-${days}`, highlight: days <= 30 }
                    : { text: `D+${Math.abs(days)}`, highlight: false };
                return (
                  <li
                    key={m.key}
                    className={[
                      "rounded-card border p-3 flex items-center gap-3",
                      dist.highlight
                        ? "bg-bg-warm border-accent"
                        : "bg-bg border-fg/15",
                    ].join(" ")}
                  >
                    <span className="text-xl shrink-0">{m.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-sm truncate">{m.label}</p>
                      <p className="text-[10px] text-fg-faint">
                        {new Date(m.date).toLocaleDateString("ko", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <span
                      className={[
                        "font-display text-xs shrink-0",
                        dist.highlight ? "text-accent" : "text-fg-soft",
                      ].join(" ")}
                    >
                      {dist.text}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {sorted.length === 0 ? (
          <div className="text-center pt-12">
            <span className="text-5xl">📅</span>
            <p className="font-display text-base mt-3">
              아직 등록된 <em className="italic text-accent">날</em>이 없어요
            </p>
            <p className="text-xs text-fg-faint mt-2">
              + 버튼으로 첫 기념일 추가
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {sorted.map((a) => {
              const dist = distanceLabel(a.date, a.recurring);
              const baseDate = new Date(a.date);
              const isMine = a.createdBy.id === meId;
              const canManage = isMine || meRole === "admin";
              const autoManaged = a.kind === "birthday";
              const kindBadge =
                a.kind === "birthday"
                  ? "프로필 생일"
                  : a.kind === "couple_start"
                  ? "만남 시작"
                  : null;
              return (
                <li
                  key={a.id}
                  className={[
                    "rounded-card border p-4 flex items-center gap-3",
                    dist.highlight
                      ? "bg-bg-warm border-accent"
                      : "bg-bg border-fg/15",
                  ].join(" ")}
                >
                  <span className="text-2xl shrink-0">{a.emoji ?? "📅"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-base truncate">
                      {a.label}
                      {kindBadge && (
                        <span className="ml-1.5 text-[10px] text-fg-faint align-middle">
                          ({kindBadge})
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-fg-faint">
                      {baseDate.toLocaleDateString("ko", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                      {a.recurring && " · 매년"}
                    </p>
                  </div>
                  <span
                    className={[
                      "font-display text-sm shrink-0",
                      dist.highlight ? "text-accent" : "text-fg-soft",
                    ].join(" ")}
                  >
                    {dist.text}
                  </span>
                  {canManage && !autoManaged && (
                    <div className="flex flex-col items-end gap-1 shrink-0 ml-1">
                      <button
                        onClick={() => startEdit(a)}
                        className="text-[10px] text-fg-faint underline"
                        aria-label="수정"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => remove(a.id)}
                        disabled={busyId === a.id}
                        className="text-[10px] text-fg-faint underline"
                        aria-label="삭제"
                      >
                        삭제
                      </button>
                    </div>
                  )}
                  {autoManaged && a.kind === "birthday" && (
                    <Link
                      href="/settings/profile"
                      className="text-[10px] text-fg-faint underline shrink-0 ml-1"
                    >
                      프로필
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <TabBar active="us" />
    </div>
  );
}
