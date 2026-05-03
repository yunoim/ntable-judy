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
  createdBy: { id: string; nickname: string };
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

export default function UsClient({
  meId,
  meRole,
  anniversaries,
}: {
  meId: string;
  meRole: string;
  anniversaries: Anniversary[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [label, setLabel] = useState("");
  const [date, setDate] = useState("");
  const [emoji, setEmoji] = useState<string>("📅");
  const [recurring, setRecurring] = useState(true);
  const [saving, setSaving] = useState(false);

  // 정렬: 다가오는 (D-N>=0) 먼저, D-N 작은 것부터; 그 다음 D+N
  const sorted = [...anniversaries].sort((a, b) => {
    const aDays = daysUntil(nextOccurrence(a.date, a.recurring));
    const bDays = daysUntil(nextOccurrence(b.date, b.recurring));
    const aFuture = aDays >= 0;
    const bFuture = bDays >= 0;
    if (aFuture !== bFuture) return aFuture ? -1 : 1;
    if (aFuture) return aDays - bDays;
    return bDays - aDays; // 과거는 가까운 것부터
  });

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
        body: JSON.stringify({ label, date, emoji, recurring }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "실패");
        return;
      }
      setLabel("");
      setDate("");
      setEmoji("📅");
      setRecurring(true);
      setAdding(false);
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
          onClick={() => setAdding((v) => !v)}
          className="text-sm text-accent"
          aria-label="추가"
        >
          {adding ? "✕" : "+"}
        </button>
      </header>

      {error && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-card border border-rain/40 bg-rain/10 text-xs text-rain">
          {error}
        </div>
      )}

      {adding && (
        <section className="mx-4 mt-3 p-4 rounded-card bg-bg-warm/50 border border-accent/30 space-y-3">
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
          <label className="flex items-center gap-2 text-xs text-fg-soft">
            <input
              type="checkbox"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
            />
            매년 반복 (생일/기념일이면 ✓)
          </label>
          <button
            type="button"
            onClick={add}
            disabled={saving || !label.trim() || !date}
            className="w-full bg-ink-card text-bg rounded-card py-2.5 text-sm font-semibold disabled:opacity-40"
          >
            {saving ? "추가 중..." : "추가 ✓"}
          </button>
        </section>
      )}

      <main className="flex-1 px-4 py-4 pb-24 space-y-3">
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
              const canDelete = isMine || meRole === "admin";
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
                    <p className="font-display text-base truncate">{a.label}</p>
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
                  {canDelete && (
                    <button
                      onClick={() => remove(a.id)}
                      disabled={busyId === a.id}
                      className="text-[10px] text-fg-faint underline shrink-0 ml-1"
                      aria-label="삭제"
                    >
                      ✕
                    </button>
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
