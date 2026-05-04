// app/plan/new/PlanNewClient.tsx — 자연어 → 3안 → 선택 → 편집 → 확정
"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Eyebrow, Pill, Rule, TabBar } from "@/components/ui";

const QUICK_CHIPS = [
  "#성수동",
  "#홍대",
  "#실내",
  "#한식",
  "#₩10만↓",
  "#차없이",
  "#비올때",
];

const PLACEHOLDER =
  "이번 주 일요일 오후 2시부터 저녁까지, 성수동 근처에서. 비 올 수도 있어서 실내 위주로. 한식 좋아하고 분위기 있는 카페도 가고 싶어.";

const STOP_TYPES = ["카페", "식당", "전시", "산책", "와인바", "쇼핑", "기타"];

type StopPreview = {
  stepOrder: number;
  time: string;
  emoji: string;
  name: string;
  address: string;
  type: string;
  description: string;
  mapQuery: string;
  estimatedCost: number;
  reserved: boolean;
};

type Preview = {
  title: string;
  subtitle: string;
  themeNote: string;
  area: string;
  weather: string;
  stops: StopPreview[];
  estimatedTotal: number;
};

const VARIANT_LABELS = ["정석", "다른 무드", "의외성"];

function defaultScheduledAt(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(14, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function blankStop(time = "18:00"): StopPreview {
  return {
    stepOrder: 0,
    time,
    emoji: "📍",
    name: "",
    address: "",
    type: "기타",
    description: "",
    mapQuery: "",
    estimatedCost: 0,
    reserved: false,
  };
}

function recomputeTotal(stops: StopPreview[]): number {
  return stops.reduce((s, x) => s + (x.estimatedCost || 0), 0);
}

export default function PlanNewClient() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [scheduledAt, setScheduledAt] = useState(defaultScheduledAt());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [options, setOptions] = useState<Preview[] | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [editing, setEditing] = useState<Preview | null>(null);

  const [mockNotice, setMockNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function addChip(chip: string) {
    setText((t) => (t ? `${t} ${chip}` : chip));
  }

  async function generate() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setMockNotice(null);
    try {
      const res = await fetch("/api/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: text, scheduledAt }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `실패 (${res.status})`);
        return;
      }
      const previews: Preview[] = (data.previews ?? []).slice(0, 3);
      if (previews.length === 0) {
        setError("코스 생성 실패");
        return;
      }
      setOptions(previews);
      setSelectedIdx(null);
      setEditing(null);
      if (data.mock) setMockNotice(data.message ?? "데모 모드");
    } catch (e: any) {
      setError(e?.message ?? "네트워크 오류");
    } finally {
      setLoading(false);
    }
  }

  function pickOption(idx: number) {
    if (!options) return;
    setSelectedIdx(idx);
    // mutable copy
    const p = options[idx];
    setEditing({
      ...p,
      stops: p.stops.map((s, i) => ({ ...s, stepOrder: i + 1 })),
    });
  }

  function backToOptions() {
    setSelectedIdx(null);
    setEditing(null);
  }

  function backToInput() {
    setOptions(null);
    setSelectedIdx(null);
    setEditing(null);
    setMockNotice(null);
  }

  function updateStop(idx: number, patch: Partial<StopPreview>) {
    if (!editing) return;
    const next = editing.stops.map((s, i) =>
      i === idx ? { ...s, ...patch } : s,
    );
    setEditing({ ...editing, stops: next, estimatedTotal: recomputeTotal(next) });
  }

  function moveStop(idx: number, dir: -1 | 1) {
    if (!editing) return;
    const next = idx + dir;
    if (next < 0 || next >= editing.stops.length) return;
    const arr = [...editing.stops];
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    setEditing({
      ...editing,
      stops: arr.map((s, i) => ({ ...s, stepOrder: i + 1 })),
    });
  }

  function removeStop(idx: number) {
    if (!editing) return;
    const next = editing.stops
      .filter((_, i) => i !== idx)
      .map((s, i) => ({ ...s, stepOrder: i + 1 }));
    setEditing({ ...editing, stops: next, estimatedTotal: recomputeTotal(next) });
  }

  function addStop() {
    if (!editing) return;
    const last = editing.stops[editing.stops.length - 1];
    const lastTime = last?.time ?? "18:00";
    const [h, m] = lastTime.split(":").map(Number);
    const newH = (h ?? 18) + 1;
    const newTime = `${String(newH).padStart(2, "0")}:${String(m ?? 0).padStart(2, "0")}`;
    const next = [...editing.stops, blankStop(newTime)].map((s, i) => ({
      ...s,
      stepOrder: i + 1,
    }));
    setEditing({ ...editing, stops: next, estimatedTotal: recomputeTotal(next) });
  }

  async function confirm() {
    if (!editing) return;
    if (editing.stops.length === 0) {
      setError("최소 1개 이상의 단계가 필요해요");
      return;
    }
    if (editing.stops.some((s) => !s.name.trim())) {
      setError("이름이 비어있는 단계가 있어요");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editing.title,
          subtitle: editing.subtitle,
          area: editing.area,
          themeNote: editing.themeNote,
          weather: editing.weather,
          scheduledAt: new Date(scheduledAt).toISOString(),
          startTime: editing.stops[0]?.time,
          endTime: editing.stops[editing.stops.length - 1]?.time,
          estimatedTotal: editing.estimatedTotal,
          aiInput: text,
          stops: editing.stops,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `저장 실패 (${res.status})`);
        return;
      }
      router.push(`/dates/${data.id}`);
    } catch (e: any) {
      setError(e?.message ?? "네트워크 오류");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PlanLoading />;

  // ── Phase 3: 편집 모드 ─────────────────────────────────
  if (editing && selectedIdx !== null) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="px-5 pt-5 pb-3 safe-top flex items-center justify-between border-b border-fg/10">
          <button
            onClick={backToOptions}
            className="text-xs text-fg-faint"
          >
            ← 다른 안 보기
          </button>
          <div className="text-center">
            <Eyebrow>편집 · 안 {selectedIdx + 1}</Eyebrow>
            <p className="font-display text-sm mt-0.5">{editing.title}</p>
          </div>
          <span className="w-16" />
        </header>

        <main className="flex-1 px-5 py-4 pb-32 space-y-4">
          {/* 메타 */}
          <section className="editorial-card-warm p-4 space-y-2">
            <input
              value={editing.title}
              onChange={(e) =>
                setEditing({ ...editing, title: e.target.value.slice(0, 30) })
              }
              placeholder="제목"
              className="w-full bg-bg border border-fg/15 rounded-card px-3 py-2 text-sm font-display"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                value={editing.area}
                onChange={(e) =>
                  setEditing({ ...editing, area: e.target.value.slice(0, 20) })
                }
                placeholder="지역"
                className="bg-bg border border-fg/15 rounded-card px-3 py-2 text-sm"
              />
              <input
                value={editing.subtitle}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    subtitle: e.target.value.slice(0, 40),
                  })
                }
                placeholder="부제 / 무드"
                className="bg-bg border border-fg/15 rounded-card px-3 py-2 text-sm"
              />
            </div>
            <textarea
              value={editing.themeNote}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  themeNote: e.target.value.slice(0, 200),
                })
              }
              placeholder="테마 메모 (한 줄)"
              rows={2}
              className="w-full bg-bg border border-fg/15 rounded-card px-3 py-2 text-sm resize-none"
            />
          </section>

          {/* 스탑 리스트 */}
          <section>
            <div className="flex items-baseline justify-between mb-2">
              <Eyebrow>단계 · {editing.stops.length}</Eyebrow>
              {editing.estimatedTotal > 0 && (
                <span className="text-[11px] text-fg-soft">
                  ~ ₩{editing.estimatedTotal.toLocaleString()}
                </span>
              )}
            </div>
            <ul className="space-y-2.5">
              {editing.stops.map((s, idx) => (
                <li
                  key={idx}
                  className="editorial-card p-3 space-y-2"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="serif-italic text-fg-faint text-xs">
                      no.{String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => moveStop(idx, -1)}
                        disabled={idx === 0}
                        className="text-xs px-2 py-1 rounded border border-fg/20 disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveStop(idx, 1)}
                        disabled={idx === editing.stops.length - 1}
                        className="text-xs px-2 py-1 rounded border border-fg/20 disabled:opacity-30"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => removeStop(idx)}
                        className="text-xs px-2 py-1 rounded border border-rain/40 text-rain"
                      >
                        제거
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-[80px_60px_1fr] gap-2">
                    <input
                      placeholder="14:00"
                      value={s.time}
                      onChange={(e) => updateStop(idx, { time: e.target.value })}
                      className="bg-bg border border-fg/15 rounded-card px-2 py-1.5 text-sm"
                    />
                    <input
                      placeholder="🍵"
                      value={s.emoji}
                      onChange={(e) =>
                        updateStop(idx, { emoji: e.target.value.slice(0, 4) })
                      }
                      className="bg-bg border border-fg/15 rounded-card px-2 py-1.5 text-sm text-center"
                    />
                    <input
                      placeholder="장소명"
                      value={s.name}
                      onChange={(e) => updateStop(idx, { name: e.target.value })}
                      className="bg-bg border border-fg/15 rounded-card px-2 py-1.5 text-sm"
                    />
                  </div>
                  <input
                    placeholder="주소"
                    value={s.address}
                    onChange={(e) =>
                      updateStop(idx, { address: e.target.value })
                    }
                    className="w-full bg-bg border border-fg/15 rounded-card px-2 py-1.5 text-sm"
                  />
                  <div className="grid grid-cols-[1fr_120px] gap-2">
                    <select
                      value={s.type}
                      onChange={(e) => updateStop(idx, { type: e.target.value })}
                      className="bg-bg border border-fg/15 rounded-card px-2 py-1.5 text-sm"
                    >
                      {STOP_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="비용"
                      value={s.estimatedCost}
                      onChange={(e) =>
                        updateStop(idx, {
                          estimatedCost: Number(e.target.value) || 0,
                        })
                      }
                      className="bg-bg border border-fg/15 rounded-card px-2 py-1.5 text-sm"
                    />
                  </div>
                  <textarea
                    placeholder="설명 (한 줄)"
                    value={s.description}
                    onChange={(e) =>
                      updateStop(idx, { description: e.target.value })
                    }
                    rows={2}
                    className="w-full bg-bg border border-fg/15 rounded-card px-2 py-1.5 text-sm resize-none"
                  />
                </li>
              ))}
            </ul>
            <button
              onClick={addStop}
              className="w-full mt-3 border border-dashed border-fg/30 rounded-card py-3 text-sm text-fg-soft"
            >
              + 단계 추가
            </button>
          </section>
        </main>

        {error && (
          <div className="fixed left-1/2 -translate-x-1/2 bottom-32 bg-rain/10 border border-rain/40 text-rain text-xs px-4 py-2 rounded-full">
            {error}
          </div>
        )}

        <div className="sticky bottom-[72px] bg-bg/95 backdrop-blur border-t border-fg/15 px-4 py-3 z-30">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={backToOptions}
              className="px-4 rounded-card border border-fg/30 text-sm"
              disabled={saving}
            >
              ↻ 안 변경
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={saving || editing.stops.length === 0}
              className="flex-1 bg-ink-card text-bg rounded-card py-3 font-semibold disabled:opacity-40"
            >
              {saving ? "저장 중..." : "이 코스로 확정 ✓"}
            </button>
          </div>
        </div>
        <TabBar active="plan" />
      </div>
    );
  }

  // ── Phase 2: 3안 선택 ─────────────────────────────────
  if (options) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="px-5 pt-5 pb-3 safe-top flex items-center justify-between border-b border-fg/10">
          <button onClick={backToInput} className="text-xs text-fg-faint">
            ← 다시 입력
          </button>
          <div className="text-center">
            <Eyebrow>안 선택 · {options.length}개</Eyebrow>
            <p className="font-display text-base mt-0.5">
              <em className="italic">셋 중 하나</em> 골라요
            </p>
          </div>
          <span className="w-16" />
        </header>

        {mockNotice && (
          <div className="mx-5 mt-3 px-3 py-2 rounded-card border border-rain/40 bg-rain/10 text-xs text-rain">
            {mockNotice}
          </div>
        )}

        <main className="flex-1 px-5 py-4 pb-32 space-y-4">
          {options.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => pickOption(idx)}
              className="block w-full text-left editorial-card p-5 hover:border-accent transition-colors"
            >
              <div className="flex items-baseline justify-between mb-1.5">
                <Eyebrow>안 {idx + 1} · {VARIANT_LABELS[idx] ?? ""}</Eyebrow>
                {p.estimatedTotal > 0 && (
                  <span className="text-[11px] text-fg-soft">
                    ~ ₩{p.estimatedTotal.toLocaleString()}
                  </span>
                )}
              </div>
              <h2 className="font-display text-xl leading-tight">{p.title}</h2>
              {p.subtitle && (
                <p className="text-[11px] text-fg-faint mt-0.5">
                  {p.subtitle}
                </p>
              )}
              {p.themeNote && (
                <p className="serif-italic text-fg-soft text-sm mt-2">
                  &ldquo;{p.themeNote}&rdquo;
                </p>
              )}
              <Rule variant="dot" className="my-3" />
              <ol className="space-y-1.5">
                {p.stops.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-baseline gap-2 text-[12px]"
                  >
                    <span className="font-display text-accent w-12 shrink-0">
                      {s.time}
                    </span>
                    <span className="shrink-0">{s.emoji}</span>
                    <span className="font-display truncate">{s.name}</span>
                    {s.type && (
                      <span className="text-[10px] text-fg-faint shrink-0">
                        · {s.type}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
              <p className="text-[10px] text-accent mt-3 text-right">
                고르고 편집 →
              </p>
            </button>
          ))}
        </main>

        <TabBar active="plan" />
      </div>
    );
  }

  // ── Phase 1: 입력 ─────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-5 pt-5 pb-3 safe-top flex items-center justify-between">
        <Link href="/" className="text-xs text-fg-faint">
          ← 홈
        </Link>
        <div className="text-center">
          <Eyebrow>計 · plan</Eyebrow>
          <p className="font-display text-base mt-0.5">새 데이트</p>
        </div>
        <button
          onClick={() => setText("")}
          className="text-xs text-fg-faint w-12 text-right"
          aria-label="초기화"
        >
          ⌫
        </button>
      </header>

      <main className="flex-1 px-5 space-y-4 pb-32">
        <h1 className="font-display text-2xl leading-snug pt-3">
          자연어로 알려줘요.
          <br />
          <em className="font-display italic text-accent">
            AI가 3안 짜드릴게요.
          </em>
        </h1>

        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 500))}
            placeholder={PLACEHOLDER}
            className="w-full min-h-[180px] bg-bg-warm/50 border border-fg/20 rounded-card p-4 text-sm leading-relaxed resize-none focus:outline-none focus:border-accent placeholder:text-fg-faint placeholder:italic"
          />
          <span className="absolute bottom-3 right-3 font-display text-sm text-accent">
            {text.length} / 500
          </span>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] tracking-widest uppercase text-fg-faint">
            예정일
          </label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full bg-bg-warm/50 border border-fg/20 rounded-card p-3 text-sm focus:outline-none focus:border-accent"
          />
        </div>

        <div className="space-y-2">
          <p className="text-[11px] tracking-widest uppercase text-fg-faint">
            자주 쓰는 조건
          </p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_CHIPS.map((c) => (
              <button key={c} onClick={() => addChip(c)} aria-label={`${c} 추가`}>
                <Pill>{c}</Pill>
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-rain px-1">{error}</p>}
      </main>

      <div className="sticky bottom-[72px] bg-bg/95 backdrop-blur border-t border-fg/15 px-4 py-3 z-30">
        <div className="flex gap-2">
          <button
            type="button"
            className="w-12 h-12 rounded-card border border-fg/20 text-lg shrink-0"
            aria-label="음성 입력 (v2)"
            disabled
          >
            🎙
          </button>
          <button
            onClick={generate}
            disabled={!text.trim()}
            className="flex-1 bg-ink-card text-bg rounded-card py-3 font-semibold disabled:opacity-40"
          >
            ✨ 3안 만들기
          </button>
        </div>
      </div>
      <TabBar active="plan" />
    </div>
  );
}

function PlanLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center safe-top">
      <div className="relative w-32 h-32 mb-6">
        <div
          className="absolute inset-0 rounded-full border-2 border-dashed border-fg animate-spin"
          style={{ animationDuration: "8s" }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-4 h-4 rounded-full bg-accent border border-fg" />
        <div className="absolute inset-0 flex items-center justify-center font-display text-3xl text-accent">
          ✨
        </div>
      </div>
      <h1 className="font-display text-2xl leading-tight">
        AI가 코스 3안을
        <br />
        <em className="not-italic italic text-accent">짜고 있어요...</em>
      </h1>
      <ul className="text-left text-sm text-fg-soft space-y-1.5 mt-6">
        <li>✓ 정석 코스</li>
        <li>✓ 다른 무드</li>
        <li className="text-accent">· 의외성 카드 굴리는 중...</li>
      </ul>
      <p className="text-[11px] text-fg-faint mt-6">평균 20초 정도 걸려요</p>
    </div>
  );
}
