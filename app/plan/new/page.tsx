// app/plan/new/page.tsx — 04 A 자유 텍스트 입력
"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Pill } from "@/components/ui";

const QUICK_CHIPS = ["#성수동", "#홍대", "#실내", "#한식", "#₩10만↓", "#차없이"];
const PLACEHOLDER =
  "이번 주 일요일 오후 2시부터 저녁까지, 성수동 근처에서. 비 올 수도 있어서 실내 위주로. 한식 좋아하고 분위기 있는 카페도 가고 싶어.";

export default function NewPlanPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  function addChip(chip: string) {
    setText((t) => (t ? `${t} ${chip}` : chip));
  }

  async function generate() {
    if (!text.trim()) return;
    setLoading(true);
    const res = await fetch("/api/plan/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: text }),
    });
    const data = await res.json();
    if (data.id) router.push(`/plan/${data.id}`);
    else setLoading(false);
  }

  if (loading) return <PlanLoading />;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-4 pt-4 pb-3 flex items-center justify-between safe-top">
        <Link href="/" className="text-sm text-fg-faint">
          ← 홈
        </Link>
        <p className="font-display text-base">새 데이트 #13</p>
        <button
          onClick={() => setText("")}
          className="text-sm text-fg-faint"
          aria-label="초기화"
        >
          ⌫
        </button>
      </header>

      <main className="flex-1 px-4 space-y-4 pb-32">
        <h1 className="font-display text-2xl leading-snug">
          자연어로 알려줘요.
          <br />
          <em className="font-display italic text-accent">AI가 짜드릴게요.</em>
        </h1>

        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 500))}
            placeholder={PLACEHOLDER}
            className="w-full min-h-[200px] bg-bg-warm/50 border border-fg/20 rounded-card p-4 text-sm leading-relaxed resize-none focus:outline-none focus:border-accent placeholder:text-fg-faint placeholder:italic"
          />
          <span className="absolute bottom-3 right-3 font-display text-sm text-accent">
            {text.length} / 500
          </span>
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
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-fg animate-spin" style={{ animationDuration: "8s" }} />
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
        <li>✓ 성수동 카페 16곳 살펴보는 중</li>
        <li>✓ 비 안 맞는 동선 짜는 중</li>
        <li className="text-accent">· 분위기 좋은 한식당 찾는 중...</li>
      </ul>
      <p className="text-[11px] text-fg-faint mt-6">평균 12초 정도 걸려요</p>
    </div>
  );
}
