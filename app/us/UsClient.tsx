"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Eyebrow, Rule, SectionTitle, TabBar } from "@/components/ui";

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
  past: boolean;
} {
  if (recurring) {
    const next = nextOccurrence(dateStr, true);
    const days = daysUntil(next);
    if (days === 0) return { text: "오늘 ★", highlight: true, past: false };
    if (days < 0)
      return { text: `D+${Math.abs(days)}`, highlight: false, past: true };
    return { text: `D-${days}`, highlight: days <= 30, past: false };
  } else {
    const days = daysUntil(new Date(dateStr));
    if (days > 0) return { text: `D-${days}`, highlight: days <= 30, past: false };
    if (days === 0) return { text: "오늘 ★", highlight: true, past: false };
    return { text: `D+${Math.abs(days)}`, highlight: false, past: true };
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
        body: JSON.stringify({ label, date, emoji, recurring, kind }),
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
      {/* Masthead */}
      <header className="px-5 pt-5 pb-4 safe-top flex items-start justify-between">
        <Link href="/" className="text-xs text-fg-faint pt-1">
          ← 홈
        </Link>
        <div className="text-center">
          <Eyebrow>倆 · our days</Eyebrow>
          <p className="font-display text-2xl mt-1">
            우리의 <em className="italic">날들</em>
          </p>
        </div>
        <button
          onClick={() => {
            if (formOpen) {
              resetForm();
              setAdding(false);
            } else {
              setAdding(true);
            }
          }}
          className="text-fg-faint text-base pt-1 w-8 text-right"
          aria-label="추가"
        >
          {formOpen ? "✕" : "+"}
        </button>
      </header>

      <Rule variant="dot" className="mx-5" />

      {error && (
        <div className="mx-5 mt-3 px-3 py-2 rounded-card border border-rain/40 bg-rain/10 text-xs text-rain">
          {error}
        </div>
      )}

      {formOpen && (
        <section className="mx-5 mt-4 p-5 editorial-card-warm space-y-3">
          <Eyebrow>{editingId ? "edit" : "new entry"}</Eyebrow>
          {!editingId && (
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => chooseKind("")}
                className={[
                  "flex-1 rounded-card text-xs py-2 px-2 border transition-colors",
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
                  "flex-1 rounded-card text-xs py-2 px-2 border transition-colors",
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
              저장하면 100일·N주년 마일스톤이 자동 계산돼요.
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
            className="w-full bg-bg border border-fg/20 rounded-card px-3 py-2.5 text-sm focus:outline-none focus:border-accent"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-bg border border-fg/20 rounded-card px-3 py-2.5 text-sm focus:outline-none focus:border-accent"
          />
          <div className="flex gap-1.5 flex-wrap">
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={[
                  "w-9 h-9 rounded-card text-base flex items-center justify-center transition-colors",
                  emoji === e
                    ? "bg-accent text-bg"
                    : "bg-bg border border-fg/20",
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

      <main className="flex-1 px-5 pt-5 pb-28 space-y-7">
        {/* Quick links */}
        <section className="grid grid-cols-2 gap-2.5">
          <Link
            href="/buckets"
            className="editorial-card px-4 py-3 flex items-center gap-2.5"
          >
            <span className="text-base">🌱</span>
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm">버킷리스트</p>
              <p className="text-[10px] text-fg-faint">같이 가고싶은</p>
            </div>
          </Link>
          <Link
            href="/capsules"
            className="editorial-card px-4 py-3 flex items-center gap-2.5"
          >
            <span className="text-base">📜</span>
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm">타임캡슐</p>
              <p className="text-[10px] text-fg-faint">미래에 보내는</p>
            </div>
          </Link>
        </section>

        {/* ─── 마일스톤 ─────────────────────── */}
        {milestones.length > 0 && (
          <section className="space-y-3">
            <SectionTitle index="壹" title="마일스톤" hint="자동 계산" />
            <div className="-mx-5 px-5 overflow-x-auto no-scrollbar">
              <ul className="flex gap-2.5 pb-1 min-w-max">
                {milestones.map((m) => {
                  const days = daysUntil(new Date(m.date));
                  const past = days < 0;
                  const today = days === 0;
                  return (
                    <li
                      key={m.key}
                      className={[
                        "shrink-0 w-[140px] editorial-card px-4 py-3.5",
                        today ? "!border-accent !bg-bg-warm" : "",
                        past ? "opacity-60" : "",
                      ].join(" ")}
                    >
                      <div className="text-base">{m.emoji}</div>
                      <p className="font-display text-sm mt-1.5 truncate">
                        {m.label}
                      </p>
                      <p className="text-[10px] text-fg-faint mt-0.5">
                        {new Date(m.date).toLocaleDateString("ko", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <p
                        className={[
                          "font-display text-sm mt-2",
                          today ? "text-accent" : "text-fg-soft",
                        ].join(" ")}
                      >
                        {today ? "오늘 ★" : past ? `D+${Math.abs(days)}` : `D-${days}`}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        )}

        {/* ─── 기념일 timeline ─────────────────── */}
        <section className="space-y-3">
          <SectionTitle
            index="貳"
            title="기념일"
            hint={`${sorted.length} entries`}
          />
          {sorted.length === 0 ? (
            <div className="text-center pt-8 pb-4">
              <span className="text-4xl">📅</span>
              <p className="font-display text-base mt-3">
                아직 등록된 <em className="italic text-accent">날</em>이 없어요
              </p>
              <p className="text-[11px] text-fg-faint mt-2">
                + 버튼으로 첫 기념일 추가
              </p>
            </div>
          ) : (
            <ul className="relative pl-6">
              {/* timeline rule */}
              <span className="absolute left-[7px] top-2 bottom-2 w-px bg-fg/15" />
              {sorted.map((a, idx) => {
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
                  <li key={a.id} className="relative pb-4 last:pb-0">
                    {/* dot */}
                    <span
                      className={[
                        "absolute -left-6 top-3.5 w-3 h-3 rounded-full border-2 border-bg",
                        dist.highlight
                          ? "bg-accent"
                          : dist.past
                            ? "bg-fg-faint/40"
                            : "bg-fg/30",
                      ].join(" ")}
                    />
                    <div
                      className={[
                        "px-4 py-3 rounded-card border flex items-start gap-3",
                        dist.highlight
                          ? "bg-bg-warm border-accent"
                          : "bg-bg border-fg/15",
                        dist.past ? "opacity-70" : "",
                      ].join(" ")}
                    >
                      <span className="text-xl shrink-0 leading-none pt-0.5">
                        {a.emoji ?? "📅"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="font-display text-base truncate">
                            {a.label}
                          </p>
                          <span
                            className={[
                              "font-display text-sm shrink-0",
                              dist.highlight
                                ? "text-accent"
                                : dist.past
                                  ? "text-fg-faint"
                                  : "text-fg-soft",
                            ].join(" ")}
                          >
                            {dist.text}
                          </span>
                        </div>
                        <p className="text-[10px] text-fg-faint mt-0.5">
                          {baseDate.toLocaleDateString("ko", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                          {a.recurring && " · 매년"}
                          {kindBadge && (
                            <>
                              <span className="mx-1.5 text-fg-faint/50">·</span>
                              <span className="serif-italic">{kindBadge}</span>
                            </>
                          )}
                        </p>
                        {(canManage && !autoManaged) || autoManaged ? (
                          <div className="flex gap-3 mt-1.5">
                            {canManage && !autoManaged && (
                              <>
                                <button
                                  onClick={() => startEdit(a)}
                                  className="text-[10px] text-fg-faint underline"
                                >
                                  수정
                                </button>
                                <button
                                  onClick={() => remove(a.id)}
                                  disabled={busyId === a.id}
                                  className="text-[10px] text-fg-faint underline"
                                >
                                  삭제
                                </button>
                              </>
                            )}
                            {autoManaged && a.kind === "birthday" && (
                              <Link
                                href="/settings/profile"
                                className="text-[10px] text-fg-faint underline"
                              >
                                프로필에서 수정
                              </Link>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    {idx < sorted.length - 1 && (
                      <div className="ml-2 mt-3 dot-rule" />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      <TabBar active="us" />
    </div>
  );
}
