// app/plan/new/PlanNewClient.tsx — 자연어 → AI 코스 preview → 확정
"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Pill } from "@/components/ui";

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

function defaultScheduledAt(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(14, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PlanNewClient() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [scheduledAt, setScheduledAt] = useState(defaultScheduledAt());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
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
      setPreview(data.preview);
      if (data.mock) setMockNotice(data.message ?? "데모 모드");
    } catch (e: any) {
      setError(e?.message ?? "네트워크 오류");
    } finally {
      setLoading(false);
    }
  }

  async function confirm() {
    if (!preview) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: preview.title,
          subtitle: preview.subtitle,
          area: preview.area,
          themeNote: preview.themeNote,
          weather: preview.weather,
          scheduledAt: new Date(scheduledAt).toISOString(),
          startTime: preview.stops[0]?.time,
          endTime: preview.stops[preview.stops.length - 1]?.time,
          estimatedTotal: preview.estimatedTotal,
          aiInput: text,
          stops: preview.stops,
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

  if (preview) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="px-4 pt-4 pb-3 border-b border-fg/15 safe-top flex items-center justify-between">
          <button
            onClick={() => setPreview(null)}
            className="text-sm text-fg-faint"
          >
            ← 다시
          </button>
          <p className="font-display text-base">미리보기</p>
          <span className="w-8" />
        </header>

        {mockNotice && (
          <div className="mx-4 mt-3 px-3 py-2 rounded-card border border-rain/40 bg-rain/10 text-xs text-rain">
            {mockNotice}
          </div>
        )}

        <main className="flex-1 px-4 py-4 pb-32 space-y-4">
          <section className="text-center pt-3">
            <p className="text-[10px] tracking-[3px] uppercase text-accent mb-2">
              {new Date(scheduledAt).toLocaleDateString("ko", {
                month: "long",
                day: "numeric",
                weekday: "long",
              })}{" "}
              · {preview.area}
            </p>
            <h1 className="font-display text-2xl leading-tight">
              {preview.title}
            </h1>
            {preview.subtitle && (
              <p className="text-xs text-fg-soft mt-1">{preview.subtitle}</p>
            )}
            {preview.themeNote && (
              <p className="text-sm italic text-fg-soft mt-3 leading-loose">
                {preview.themeNote}
              </p>
            )}
          </section>

          <ol className="relative pl-6 space-y-4 mt-2">
            <span
              className="absolute left-[7px] top-2 bottom-2 w-px"
              style={{
                background:
                  "repeating-linear-gradient(to bottom, var(--accent) 0 4px, transparent 4px 8px)",
              }}
              aria-hidden
            />
            {preview.stops.map((stop, idx) => (
              <li key={idx} className="relative">
                <span
                  className="absolute left-[-21px] top-3 w-3 h-3 rounded-full border-2 border-bg"
                  style={{ background: "var(--accent)" }}
                  aria-hidden
                />
                <div className="bg-bg-warm/70 rounded-card p-3 border border-fg/10">
                  <div className="flex items-baseline justify-between">
                    <span className="font-display text-sm text-accent tracking-wider">
                      {stop.time}
                    </span>
                    <span className="text-base">{stop.emoji}</span>
                  </div>
                  <p className="font-display text-base mt-0.5">{stop.name}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {stop.type && (
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-fg/30 text-fg-faint">
                        {stop.type}
                      </span>
                    )}
                    {stop.estimatedCost > 0 && (
                      <span className="text-[10px] text-fg-soft">
                        ₩{stop.estimatedCost.toLocaleString()}
                      </span>
                    )}
                  </div>
                  {stop.description && (
                    <p className="text-xs text-fg-soft mt-2 leading-relaxed italic">
                      {stop.description}
                    </p>
                  )}
                  {stop.address && (
                    <p className="text-[11px] text-fg-faint mt-1.5">
                      📍 {stop.address}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>

          {preview.estimatedTotal > 0 && (
            <p className="text-center text-xs text-fg-soft mt-4">
              예상 비용 ~ ₩{preview.estimatedTotal.toLocaleString()}
            </p>
          )}
        </main>

        {error && (
          <div className="fixed left-1/2 -translate-x-1/2 bottom-24 bg-rain/10 border border-rain/40 text-rain text-xs px-4 py-2 rounded-full">
            {error}
          </div>
        )}

        <div className="sticky bottom-0 bg-bg/95 backdrop-blur border-t border-fg/15 px-4 py-3 safe-bottom">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="px-4 rounded-card border border-fg/30 text-sm"
              disabled={saving}
            >
              ↻ 다시
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={saving}
              className="flex-1 bg-ink-card text-bg rounded-card py-3 font-semibold disabled:opacity-40"
            >
              {saving ? "저장 중..." : "이 코스로 확정 ✓"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-4 pt-4 pb-3 flex items-center justify-between safe-top">
        <Link href="/" className="text-sm text-fg-faint">
          ← 홈
        </Link>
        <p className="font-display text-base">새 데이트</p>
        <button
          onClick={() => setText("")}
          className="text-sm text-fg-faint"
          aria-label="초기화"
        >
          ⌫
        </button>
      </header>

      <main className="flex-1 px-4 space-y-4 pb-32">
        <h1 className="font-display text-2xl leading-snug pt-2">
          자연어로 알려줘요.
          <br />
          <em className="font-display italic text-accent">AI가 짜드릴게요.</em>
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

        {error && (
          <p className="text-xs text-rain px-1">{error}</p>
        )}
      </main>

      <div className="sticky bottom-0 bg-bg/95 backdrop-blur border-t border-fg/15 px-4 py-3 safe-bottom">
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
            ✨ 코스 만들기
          </button>
        </div>
      </div>
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
        AI가 코스를
        <br />
        <em className="not-italic italic text-accent">짜고 있어요...</em>
      </h1>
      <ul className="text-left text-sm text-fg-soft space-y-1.5 mt-6">
        <li>✓ 동선 효율 계산 중</li>
        <li>✓ 분위기 어울리는 곳 골라보는 중</li>
        <li className="text-accent">· 마지막 와인 한 잔 자리 찾는 중...</li>
      </ul>
      <p className="text-[11px] text-fg-faint mt-6">평균 12초 정도 걸려요</p>
    </div>
  );
}
