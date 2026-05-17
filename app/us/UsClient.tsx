"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Eyebrow, SectionTitle, TabBar } from "@/components/ui";

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
    if (days === 0) return { text: "오늘", highlight: true, past: false };
    if (days < 0)
      return { text: `D+${Math.abs(days)}`, highlight: false, past: true };
    return { text: `D-${days}`, highlight: days <= 30, past: false };
  } else {
    const days = daysUntil(new Date(dateStr));
    if (days > 0) return { text: `D-${days}`, highlight: days <= 30, past: false };
    if (days === 0) return { text: "오늘", highlight: true, past: false };
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

  // 기념일 + 마일스톤 통합 타임라인. 같은 정렬 규칙 (다가올 순, 지난 건 뒤).
  type Row =
    | { type: "anniv"; key: string; data: Anniversary; occurrence: Date }
    | { type: "miles"; key: string; data: Milestone; occurrence: Date };
  const timelineRows: Row[] = [
    ...anniversaries.map<Row>((a) => ({
      type: "anniv",
      key: `a${a.id}`,
      data: a,
      occurrence: nextOccurrence(a.date, a.recurring),
    })),
    ...milestones.map<Row>((m) => ({
      type: "miles",
      key: m.key,
      data: m,
      occurrence: new Date(m.date),
    })),
  ].sort((a, b) => {
    const aDays = daysUntil(new Date(a.occurrence));
    const bDays = daysUntil(new Date(b.occurrence));
    const aFuture = aDays >= 0;
    const bFuture = bDays >= 0;
    if (aFuture !== bFuture) return aFuture ? -1 : 1;
    if (aFuture) return aDays - bDays;
    return bDays - aDays;
  });
  // 추가/수정 UI 의 갯수 hint 는 기념일만 카운트 (마일스톤은 자동이라 사용자 입력 아님)
  const anniversaryCount = anniversaries.length;

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

  const toggleAdd = () => {
    if (formOpen) {
      resetForm();
      setAdding(false);
    } else {
      setAdding(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="safe-top" />

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
        {/* ─── 기념일 + 마일스톤 통합 timeline ─────────────────── */}
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-2 pt-1">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[17px] text-fg">기념일</span>
              <span className="text-[10px] text-fg-faint">
                {anniversaryCount}개 + 마일스톤 {milestones.length}
              </span>
            </div>
            <button
              onClick={toggleAdd}
              className={[
                "tap rounded-full px-3 py-1 text-[12px] font-display border transition-colors",
                formOpen
                  ? "border-fg/20 text-fg-faint"
                  : "border-accent text-accent hover:bg-accent hover:text-bg",
              ].join(" ")}
            >
              {formOpen ? "✕ 닫기" : "+ 추가"}
            </button>
          </div>
          {timelineRows.length === 0 ? (
            <div className="text-center pt-8 pb-4">
              <span className="text-4xl">📅</span>
              <p className="font-display text-base mt-3">
                아직 등록된 <em className="italic text-accent">날</em>이 없어요
              </p>
              <p className="text-[11px] text-fg-faint mt-2">
                위 + 버튼으로 첫 기념일 추가
              </p>
            </div>
          ) : (
            <ul className="relative pl-6">
              {/* timeline rule */}
              <span className="absolute left-[7px] top-2 bottom-2 w-px bg-fg/15" />
              {timelineRows.map((row, idx) => {
                const isMiles = row.type === "miles";
                const a = !isMiles ? row.data : null;
                const m = isMiles ? row.data : null;
                const dist = isMiles
                  ? distanceLabel(row.occurrence.toISOString(), false)
                  : distanceLabel(a!.date, a!.recurring);
                const baseDate = isMiles
                  ? new Date(m!.date)
                  : new Date(a!.date);
                const isMine = !isMiles && a!.createdBy.id === meId;
                const canManage = !isMiles && (isMine || meRole === "admin");
                const autoManaged = !isMiles && a!.kind === "birthday";
                const kindBadge = isMiles
                  ? "자동 · 마일스톤"
                  : a!.kind === "birthday"
                    ? "프로필 생일"
                    : a!.kind === "couple_start"
                      ? "만남 시작"
                      : null;
                return (
                  <li key={row.key} className="relative pb-4 last:pb-0">
                    {/* dot */}
                    <span
                      className={[
                        "absolute -left-6 top-3.5 w-3 h-3 rounded-full border-2 border-bg",
                        dist.highlight
                          ? "bg-accent"
                          : isMiles
                            ? "bg-fg/15 border-fg/30"
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
                          : isMiles
                            ? "bg-bg-warm/30 border-fg/10 border-dashed"
                            : "bg-bg border-fg/15",
                        dist.past ? "opacity-70" : "",
                      ].join(" ")}
                    >
                      <span className="text-xl shrink-0 leading-none pt-0.5">
                        {isMiles ? m!.emoji : a!.emoji ?? "📅"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="font-display text-base truncate">
                            {isMiles ? m!.label : a!.label}
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
                          {!isMiles && a!.recurring && " · 매년"}
                          {kindBadge && (
                            <>
                              <span className="mx-1.5 text-fg-faint/50">·</span>
                              <span className="serif-italic">{kindBadge}</span>
                            </>
                          )}
                        </p>
                        {!isMiles &&
                        ((canManage && !autoManaged) || autoManaged) ? (
                          <div className="flex gap-3 mt-1.5">
                            {canManage && !autoManaged && (
                              <>
                                <button
                                  onClick={() => startEdit(a!)}
                                  className="text-[10px] text-fg-faint underline"
                                >
                                  수정
                                </button>
                                <button
                                  onClick={() => remove(a!.id)}
                                  disabled={busyId === a!.id}
                                  className="text-[10px] text-fg-faint underline"
                                >
                                  삭제
                                </button>
                              </>
                            )}
                            {autoManaged && a!.kind === "birthday" && (
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
                    {idx < timelineRows.length - 1 && (
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
