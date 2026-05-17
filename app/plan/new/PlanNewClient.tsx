// app/plan/new/PlanNewClient.tsx — 자연어 AI 또는 직접 입력 → 코스 → 확정
"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Eyebrow, Pill, TabBar } from "@/components/ui";

const PLACEHOLDER =
  "이번 주 일요일 오후 2시부터 저녁까지, 성수동 근처에서. 비 올 수도 있어서 실내 위주로. 한식 좋아하고 분위기 있는 카페도 가고 싶어.";


type StopOption = {
  emoji: string;
  name: string;
  address: string;
  type: string;
  description: string;
  mapQuery: string;
  estimatedCost: number;
};

type StopSlot = {
  stepOrder: number;
  time: string;
  label: string;
  options: StopOption[];
  selectedIdx: number;
  manual?: boolean;
};

type Course = {
  title: string;
  subtitle: string;
  themeNote: string;
  area: string;
  weather: string;
  stops: StopSlot[];
};

function defaultScheduledAt(): string {
  // 디폴트: 다음날 19:00
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(19, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function pastScheduledAt(): string {
  // 과거 모드 디폴트: 오늘 19:00 (사용자가 날짜만 바꾸면 됨)
  const d = new Date();
  d.setHours(19, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function dateOnlyToLocal(dateStr: string, hour = 19): string {
  // YYYY-MM-DD → 그날 19:00 로컬 input
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return defaultScheduledAt();
  const dt = new Date(y, m - 1, d, hour, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

function emptyCourse(): Course {
  return {
    title: "",
    subtitle: "",
    themeNote: "",
    area: "",
    weather: "",
    stops: [{ ...blankSlot("19:00"), stepOrder: 1 }],
  };
}

function isoToLocalInput(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function blankSlot(time = "18:00"): StopSlot {
  return {
    stepOrder: 0,
    time,
    label: "",
    options: [
      {
        emoji: "📍",
        name: "",
        address: "",
        type: "기타",
        description: "",
        mapQuery: "",
        estimatedCost: 0,
      },
    ],
    selectedIdx: 0,
    manual: true,
  };
}

function pickedTotal(course: Course): number {
  return course.stops.reduce(
    (s, slot) =>
      s + (slot.options[slot.selectedIdx]?.estimatedCost || 0),
    0,
  );
}

export default function PlanNewClient({
  chips = [],
}: {
  chips?: string[];
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const initialMode = (sp.get("mode") as "ai" | "direct" | "past" | null) ?? "ai";
  const initialDate = sp.get("date"); // YYYY-MM-DD
  const [mode, setMode] = useState<"ai" | "direct" | "past">(initialMode);
  const [text, setText] = useState("");
  const [scheduledAt, setScheduledAt] = useState(() =>
    initialDate
      ? dateOnlyToLocal(initialDate)
      : initialMode === "past"
        ? pastScheduledAt()
        : defaultScheduledAt(),
  );
  const [scheduledEndAt, setScheduledEndAt] = useState<string>(""); // 빈 문자열 = 당일
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);
  const [mockNotice, setMockNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // URL ?mode 가 바뀔 때마다 state 동기화 (Phase 1 안 미니 링크 soft-nav 케이스).
  // - direct 모드: 빈 코스로 Phase 2 즉시 진입
  // - past 모드: 자연어 한 줄 입력 Phase 1 에 머무름 (parse 후 Phase 2)
  // - ai 모드: 자연어 입력 Phase 1
  useEffect(() => {
    const newMode =
      (sp.get("mode") as "ai" | "direct" | "past" | null) ?? "ai";
    if (newMode !== mode) {
      setMode(newMode);
    }
    if (newMode === "direct" && !course) {
      setCourse(emptyCourse());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

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
      const raw = data.course;
      if (!raw || !Array.isArray(raw.stops)) {
        setError("코스 생성 실패");
        return;
      }
      const normalized: Course = {
        title: raw.title ?? "",
        subtitle: raw.subtitle ?? "",
        themeNote: raw.themeNote ?? "",
        area: raw.area ?? "",
        weather: raw.weather ?? "cloud",
        stops: raw.stops.map(
          (s: {
            stepOrder?: number;
            time?: string;
            label?: string;
            options?: StopOption[];
          }, i: number) => ({
            stepOrder: i + 1,
            time: s.time ?? "00:00",
            label: s.label ?? "",
            options: (s.options ?? []).slice(0, 3),
            selectedIdx: 0,
          }),
        ),
      };
      setCourse(normalized);
      // 자연어에 날짜·시간 명시 시 폼의 예정일을 덮어씀
      if (raw.scheduledAt) {
        const local = isoToLocalInput(raw.scheduledAt);
        if (local) setScheduledAt(local);
      }
      if (data.mock) setMockNotice(data.message ?? "데모 모드");
    } catch (e: any) {
      setError(e?.message ?? "네트워크 오류");
    } finally {
      setLoading(false);
    }
  }

  function backToInput() {
    setCourse(null);
    setMockNotice(null);
  }

  async function parsePast() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setMockNotice(null);
    try {
      const date = scheduledAt.slice(0, 10); // YYYY-MM-DD
      const res = await fetch("/api/plan/parse-past", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, date }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `실패 (${res.status})`);
        return;
      }
      const raw = data.course;
      if (!raw) {
        setError("정리 실패");
        return;
      }
      const normalized: Course = {
        title: raw.title ?? "",
        subtitle: raw.subtitle ?? "",
        themeNote: raw.themeNote ?? "",
        area: raw.area ?? "",
        weather: raw.weather ?? "cloud",
        stops: (raw.stops ?? []).map(
          (
            s: {
              time?: string;
              label?: string;
              options?: StopOption[];
            },
            i: number,
          ) => {
            const o = (s.options ?? [])[0] ?? {
              emoji: "📍",
              name: "",
              address: "",
              type: "기타",
              description: "",
              mapQuery: "",
              estimatedCost: 0,
            };
            return {
              stepOrder: i + 1,
              time: s.time ?? "",
              label: s.label ?? "",
              options: [
                {
                  emoji: o.emoji ?? "📍",
                  name: o.name ?? "",
                  address: o.address ?? "",
                  type: o.type ?? "기타",
                  description: o.description ?? "",
                  mapQuery: o.mapQuery ?? "",
                  estimatedCost: o.estimatedCost ?? 0,
                },
              ],
              selectedIdx: 0,
              manual: true,
            };
          },
        ),
      };
      // stops 비어있으면 빈 슬롯 하나 두고 시작
      if (normalized.stops.length === 0) {
        normalized.stops = [{ ...blankSlot("19:00"), stepOrder: 1 }];
      }
      setCourse(normalized);
      if (data.mock) setMockNotice(data.message ?? "데모 모드");
    } catch (e: any) {
      setError(e?.message ?? "네트워크 오류");
    } finally {
      setLoading(false);
    }
  }

  function setSlotMeta(idx: number, patch: Partial<StopSlot>) {
    if (!course) return;
    const next = course.stops.map((s, i) =>
      i === idx ? { ...s, ...patch } : s,
    );
    setCourse({ ...course, stops: next });
  }

  function setOption(idx: number, optIdx: number, patch: Partial<StopOption>) {
    if (!course) return;
    const next = course.stops.map((s, i) => {
      if (i !== idx) return s;
      return {
        ...s,
        options: s.options.map((o, j) => (j === optIdx ? { ...o, ...patch } : o)),
      };
    });
    setCourse({ ...course, stops: next });
  }

  function pickOption(idx: number, optIdx: number) {
    if (!course) return;
    const next = course.stops.map((s, i) =>
      i === idx ? { ...s, selectedIdx: optIdx } : s,
    );
    setCourse({ ...course, stops: next });
  }

  function moveSlot(idx: number, dir: -1 | 1) {
    if (!course) return;
    const target = idx + dir;
    if (target < 0 || target >= course.stops.length) return;
    const arr = [...course.stops];
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    setCourse({
      ...course,
      stops: arr.map((s, i) => ({ ...s, stepOrder: i + 1 })),
    });
  }

  function removeSlot(idx: number) {
    if (!course) return;
    const next = course.stops
      .filter((_, i) => i !== idx)
      .map((s, i) => ({ ...s, stepOrder: i + 1 }));
    setCourse({ ...course, stops: next });
  }

  function addSlot() {
    if (!course) return;
    const last = course.stops[course.stops.length - 1];
    const lastTime = last?.time ?? "18:00";
    const [h, m] = lastTime.split(":").map(Number);
    const newH = (h ?? 18) + 1;
    const time = `${String(newH).padStart(2, "0")}:${String(m ?? 0).padStart(2, "0")}`;
    const next = [...course.stops, blankSlot(time)].map((s, i) => ({
      ...s,
      stepOrder: i + 1,
    }));
    setCourse({ ...course, stops: next });
  }

  async function confirm() {
    if (!course) return;
    if (!course.title.trim()) {
      setError("제목을 입력해주세요");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // 장소(stops) 는 선택. 이름/라벨 둘 다 비어 있으면 의미 없는 빈 슬롯이라 제외.
      const meaningful = course.stops.filter((s) => {
        const o = s.options[s.selectedIdx];
        return (o?.name?.trim() || "") !== "" || (s.label?.trim() || "") !== "";
      });
      const stops = meaningful.map((s, i) => {
        const o = s.options[s.selectedIdx];
        const name = o.name?.trim() || s.label?.trim() || "(이름 없음)";
        // AI 모드: 미선택 후보 2개를 alternatives 로 보존 (당일 변경 참고용).
        const alternatives =
          mode === "ai" && s.options.length > 1
            ? s.options
                .filter((_, idx) => idx !== s.selectedIdx)
                .map((alt) => ({
                  emoji: alt.emoji || "📍",
                  name: alt.name,
                  address: alt.address || null,
                  type: alt.type || null,
                  description: alt.description || null,
                  mapQuery: alt.mapQuery || alt.name,
                  estimatedCost: alt.estimatedCost || 0,
                }))
            : null;
        return {
          stepOrder: i + 1,
          time: s.time,
          emoji: o.emoji || "📍",
          name,
          address: o.address,
          type: o.type,
          description: o.description,
          mapQuery: o.mapQuery || name,
          estimatedCost: o.estimatedCost || 0,
          reserved: false,
          alternatives,
        };
      });
      const total = pickedTotal(course);
      // 과거 모드: 명시적으로 status="done", aiInput 비움.
      // 직접 모드: status 백엔드가 scheduledAt 보고 자동 추정, aiInput 비움.
      // AI 모드: status 자동, aiInput 보존.
      const payload: Record<string, unknown> = {
        title: course.title,
        subtitle: course.subtitle,
        area: course.area,
        themeNote: course.themeNote,
        weather: course.weather,
        scheduledAt: new Date(scheduledAt).toISOString(),
        scheduledEndAt: scheduledEndAt
          ? new Date(scheduledEndAt).toISOString()
          : null,
        startTime: stops[0]?.time,
        endTime: stops[stops.length - 1]?.time,
        estimatedTotal: total,
        stops,
      };
      if (mode === "ai") {
        payload.aiInput = text;
      }
      if (mode === "past") {
        payload.status = "done";
      }
      const res = await fetch("/api/dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  if (loading) return <PlanLoading mode={mode} />;

  // ── Phase 2: 코스 + (AI 면 단계별 3안 선택) ─────────────────────
  if (course) {
    const total = pickedTotal(course);
    const phaseLabel =
      mode === "past" ? "과거 데이트 기록" : mode === "direct" ? "직접 입력" : "코스 편집";
    return (
      <div className="min-h-screen flex flex-col">
        <header className="px-5 pt-5 pb-3 safe-top flex items-center justify-between border-b border-fg/10">
          {mode === "ai" ? (
            <button onClick={backToInput} className="tap text-xs text-fg-faint">
              ← 다시 입력
            </button>
          ) : (
            <Link href="/" className="tap text-xs text-fg-faint">
              ← 홈
            </Link>
          )}
          <div className="text-center">
            <Eyebrow>{phaseLabel}</Eyebrow>
            <p className="font-display text-base mt-0.5 truncate max-w-[200px]">
              {course.title || (mode === "past" ? "다녀온 데이트" : "새 데이트")}
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
          {/* 메타 */}
          <section className="editorial-card-warm p-4 space-y-2">
            <input
              value={course.title}
              onChange={(e) =>
                setCourse({ ...course, title: e.target.value.slice(0, 30) })
              }
              placeholder={mode === "past" ? "그 날의 제목 (예: 성수 산책)" : "제목"}
              className="w-full bg-bg border border-fg/15 rounded-card px-3 py-2 text-sm font-display"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                value={course.area}
                onChange={(e) =>
                  setCourse({ ...course, area: e.target.value.slice(0, 20) })
                }
                placeholder="지역"
                className="bg-bg border border-fg/15 rounded-card px-3 py-2 text-sm"
              />
              <input
                value={course.subtitle}
                onChange={(e) =>
                  setCourse({
                    ...course,
                    subtitle: e.target.value.slice(0, 40),
                  })
                }
                placeholder="부제 / 무드"
                className="bg-bg border border-fg/15 rounded-card px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] tracking-widest text-fg-faint uppercase">
                {mode === "past" ? "다녀온 시작일" : "시작일시"}
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => {
                  setScheduledAt(e.target.value);
                  // 종료가 시작보다 이전이면 클리어
                  if (scheduledEndAt && scheduledEndAt < e.target.value) {
                    setScheduledEndAt("");
                  }
                }}
                className="w-full bg-bg border border-fg/15 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-accent"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] tracking-widest text-fg-faint uppercase flex items-center justify-between">
                <span>종료일시 (여행 등 다일)</span>
                {scheduledEndAt && (
                  <button
                    type="button"
                    onClick={() => setScheduledEndAt("")}
                    className="text-[10px] text-fg-faint normal-case tracking-normal hover:text-fg-soft"
                  >
                    당일로
                  </button>
                )}
              </label>
              <input
                type="datetime-local"
                value={scheduledEndAt}
                min={scheduledAt}
                onChange={(e) => setScheduledEndAt(e.target.value)}
                placeholder="비우면 당일"
                className="w-full bg-bg border border-fg/15 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-accent"
              />
            </div>
            <textarea
              value={course.themeNote}
              onChange={(e) =>
                setCourse({
                  ...course,
                  themeNote: e.target.value.slice(0, 200),
                })
              }
              placeholder={mode === "past" ? "그날 메모 (한 줄)" : "테마 메모 (한 줄)"}
              rows={2}
              className="w-full bg-bg border border-fg/15 rounded-card px-3 py-2 text-sm resize-none"
            />
          </section>

          {/* 단계별 3안 */}
          <section className="space-y-4">
            <div className="flex items-baseline justify-between">
              <Eyebrow>단계 · {course.stops.length}</Eyebrow>
              {total > 0 && (
                <span className="text-[11px] text-fg-soft">
                  ~ ₩{total.toLocaleString()}
                </span>
              )}
            </div>
            {course.stops.map((slot, idx) => (
              <SlotEditor
                key={idx}
                slot={slot}
                index={idx}
                lastIndex={course.stops.length - 1}
                onMove={(dir) => moveSlot(idx, dir)}
                onRemove={() => removeSlot(idx)}
                onMeta={(patch) => setSlotMeta(idx, patch)}
                onPick={(optIdx) => pickOption(idx, optIdx)}
                onOptionEdit={(optIdx, patch) =>
                  setOption(idx, optIdx, patch)
                }
              />
            ))}
            <button
              onClick={addSlot}
              className="w-full border border-dashed border-fg/30 rounded-card py-3 text-sm text-fg-soft"
            >
              + 단계 추가 (직접 입력)
            </button>
          </section>
        </main>

        {error && (
          <div className="fixed left-1/2 -translate-x-1/2 bottom-32 bg-rain/10 border border-rain/40 text-rain text-xs px-4 py-2 rounded-full">
            {error}
          </div>
        )}

        <div className="sticky bottom-[72px] bg-bg/95 backdrop-blur border-t border-fg/15 px-4 py-3 z-30">
          <button
            type="button"
            onClick={confirm}
            disabled={saving || !course.title.trim()}
            className="w-full bg-ink-card text-bg rounded-card py-3 font-semibold disabled:opacity-40"
          >
            {saving ? "저장 중..." : "이 코스로 확정 ✓"}
          </button>
        </div>
        <TabBar active="plan" />
      </div>
    );
  }

  // ── Phase 1: 입력 ─────────────────────────────────
  const isPast = mode === "past";
  const placeholder = isPast
    ? "어제 성수동에서 카페 갔다가 한식당에서 저녁 먹음. 비용 약 6만원."
    : PLACEHOLDER;
  return (
    <div className="min-h-screen flex flex-col">
      <div className="safe-top" />

      <main className="px-5 pt-3 pb-28 space-y-3">
        <h1 className="font-display text-xl leading-snug">
          {isPast ? "그날 뭐 했는지" : "자연어로 알려줘요."}
          <br />
          <em className="font-display italic text-accent">
            {isPast ? "한 줄로 적어줘요." : "단계별 3안 짜드려요."}
          </em>
        </h1>

        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 500))}
            placeholder={placeholder}
            className="w-full min-h-[140px] bg-bg-warm/50 border border-fg/20 rounded-card p-4 text-sm leading-relaxed resize-none focus:outline-none focus:border-accent placeholder:text-fg-faint placeholder:italic"
          />
          <span className="absolute bottom-3 right-3 font-display text-sm text-accent">
            {text.length} / 500
          </span>
        </div>

        {!isPast && chips.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] tracking-widest uppercase text-fg-faint">
              자주 쓰는 조건
            </p>
            <div className="flex flex-wrap gap-1.5">
              {chips.map((c) => (
                <button
                  key={c}
                  onClick={() => addChip(c)}
                  aria-label={`${c} 추가`}
                >
                  <Pill>{c}</Pill>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-xs text-rain px-1">{error}</p>}

        <button
          onClick={isPast ? parsePast : generate}
          disabled={!text.trim()}
          className="w-full bg-ink-card text-bg rounded-card py-3 font-semibold disabled:opacity-40"
        >
          {isPast ? "✨ 정리하기" : "✨ 코스 만들기"}
        </button>
      </main>

      <TabBar active="plan" />
    </div>
  );
}

// ── 단계 1개 + 3안 컴포넌트 ────────────────────────────────
function SlotEditor({
  slot,
  index,
  lastIndex,
  onMove,
  onRemove,
  onMeta,
  onPick,
  onOptionEdit,
}: {
  slot: StopSlot;
  index: number;
  lastIndex: number;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onMeta: (patch: Partial<StopSlot>) => void;
  onPick: (optIdx: number) => void;
  onOptionEdit: (optIdx: number, patch: Partial<StopOption>) => void;
}) {
  const isManual = slot.manual === true;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="serif-italic text-fg-faint text-xs">
          no.{String(index + 1).padStart(2, "0")}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="text-xs px-2 py-1 rounded border border-fg/20 disabled:opacity-30"
          >
            ↑
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={index === lastIndex}
            className="text-xs px-2 py-1 rounded border border-fg/20 disabled:opacity-30"
          >
            ↓
          </button>
          <button
            onClick={onRemove}
            className="text-xs px-2 py-1 rounded border border-rain/40 text-rain"
          >
            제거
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[80px_1fr] gap-2">
        <input
          placeholder="14:00"
          value={slot.time}
          onChange={(e) => onMeta({ time: e.target.value })}
          className="bg-bg border border-fg/15 rounded-card px-2 py-1.5 text-sm font-display text-accent text-center"
        />
        <input
          placeholder="라벨 (예: 저녁식사)"
          value={slot.label}
          onChange={(e) => onMeta({ label: e.target.value.slice(0, 20) })}
          className="bg-bg border border-fg/15 rounded-card px-2 py-1.5 text-sm"
        />
      </div>

      {isManual ? (
        <ManualOptionEditor
          option={slot.options[0]}
          onEdit={(patch) => onOptionEdit(0, patch)}
        />
      ) : (
        <div className="space-y-2">
          {slot.options.map((opt, optIdx) => {
            const active = slot.selectedIdx === optIdx;
            return (
              <button
                key={optIdx}
                type="button"
                onClick={() => onPick(optIdx)}
                className={[
                  "w-full text-left rounded-card border px-3.5 py-3 transition-colors",
                  active
                    ? "bg-bg-warm border-accent"
                    : "bg-bg border-fg/15 hover:border-fg/30",
                ].join(" ")}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="text-base shrink-0">{opt.emoji}</span>
                    <span
                      className={[
                        "font-display text-sm truncate",
                        active ? "" : "text-fg-soft",
                      ].join(" ")}
                    >
                      {opt.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {opt.estimatedCost > 0 && (
                      <span className="text-[10px] text-fg-faint">
                        ₩{opt.estimatedCost.toLocaleString()}
                      </span>
                    )}
                    <span
                      className={[
                        "w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center text-[8px]",
                        active
                          ? "bg-accent border-accent text-bg"
                          : "border-fg/30",
                      ].join(" ")}
                    >
                      {active ? "✓" : ""}
                    </span>
                  </div>
                </div>
                {active && opt.description && (
                  <p className="text-[11px] text-fg-soft mt-1.5 italic leading-relaxed">
                    {opt.description}
                  </p>
                )}
                {active && opt.address && (
                  <p className="text-[10px] text-fg-faint mt-1">
                    📍 {opt.address}
                  </p>
                )}
                {!active && opt.type && (
                  <p className="text-[10px] text-fg-faint mt-0.5 ml-7">
                    {opt.type}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ManualOptionEditor({
  option,
  onEdit,
}: {
  option: StopOption;
  onEdit: (patch: Partial<StopOption>) => void;
}) {
  // 직접/수동 입력은 빠른 캡처용. 장소명 한 줄만 노출.
  // 주소/타입/비용/설명/이모지 같은 디테일은 데이트 상세에서 편집 가능.
  return (
    <input
      placeholder="장소명 (선택)"
      value={option.name}
      onChange={(e) => onEdit({ name: e.target.value })}
      className="w-full bg-bg border border-fg/15 rounded-card px-3 py-2 text-sm"
    />
  );
}

function PlanLoading({ mode }: { mode: "ai" | "direct" | "past" }) {
  const isPast = mode === "past";
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
        {isPast ? (
          <>
            그날 메모를
            <br />
            <em className="not-italic italic text-accent">정리하고 있어요...</em>
          </>
        ) : (
          <>
            AI가 단계별 3안을
            <br />
            <em className="not-italic italic text-accent">짜고 있어요...</em>
          </>
        )}
      </h1>
      <ul className="text-left text-sm text-fg-soft space-y-1.5 mt-6">
        {isPast ? (
          <>
            <li>✓ 장소와 시간 추출 중</li>
            <li>✓ 비용과 무드 정리 중</li>
            <li className="text-accent">· 한 줄 회상 다듬는 중...</li>
          </>
        ) : (
          <>
            <li>✓ 동선 효율 계산 중</li>
            <li>✓ 단계별 후보 3개씩 고르는 중</li>
            <li className="text-accent">· 마지막 와인 한 잔 자리 찾는 중...</li>
          </>
        )}
      </ul>
      <p className="text-[11px] text-fg-faint mt-6">
        {isPast ? "평균 5초 정도 걸려요" : "평균 20초 정도 걸려요"}
      </p>
    </div>
  );
}
