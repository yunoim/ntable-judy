// app/plan/[id]/page.tsx — AI 결과 타임라인
import Link from "next/link";
import { MOCK_DATES, naverMapUrl } from "@/lib/data";
import { Pill } from "@/components/ui";
import { notFound } from "next/navigation";

export default function PlanResultPage({ params }: { params: { id: string } }) {
  // Claude Code: replace with prisma.date.findUnique({ where: { id: params.id }})
  const d = MOCK_DATES.find((x) => x.id === params.id);
  if (!d) return notFound();

  const date = new Date(d.scheduledAt);
  const lastTime = d.plan.stops[d.plan.stops.length - 1]?.time ?? "";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-4 pt-4 pb-3 border-b border-fg/15 safe-top">
        <div className="flex items-center justify-between">
          <Link href="/plan/new" className="text-sm text-fg-faint">← 다시</Link>
          <p className="font-display text-base">
            {date.toLocaleDateString("ko", { weekday: "long" })} · {d.area}
          </p>
          <button className="text-sm text-fg-faint" aria-label="재생성">↻</button>
        </div>
        <div className="flex gap-2 mt-2">
          <Pill>{d.plan.stops[0]?.time} — {lastTime}</Pill>
          <Pill>~ ₩{d.plan.estimatedTotal.toLocaleString()}</Pill>
          <Pill>{d.plan.stops.length} stops</Pill>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 pb-32 relative">
        {/* dotted vertical line */}
        <div
          className="absolute left-7 top-7 bottom-8 w-0 border-l-2 border-dashed border-fg/40"
          aria-hidden
        />

        <ul className="space-y-5">
          {d.plan.stops.map((s, i) => (
            <li key={i} className="relative pl-12">
              <div
                className={[
                  "absolute left-3 top-1 w-7 h-7 rounded-full border border-fg flex items-center justify-center font-display text-sm",
                  i === 0 ? "bg-accent text-fg" : "bg-bg text-fg",
                ].join(" ")}
              >
                {i + 1}
              </div>
              <div className="flex justify-between items-baseline">
                <p className="font-display text-base">
                  {s.time} · {s.name}
                </p>
                {s.cost > 0 && (
                  <span className="text-xs text-fg-soft">
                    ₩{s.cost.toLocaleString()}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-fg-faint mt-0.5">
                {s.address} · {s.type}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <a
                  href={naverMapUrl(s.mapQuery)}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <Pill>📍 네이버 지도</Pill>
                </a>
                {s.reservationUrl && (
                  <a
                    href={s.reservationUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <Pill>🔗 예약</Pill>
                  </a>
                )}
                <button aria-label="이 stop만 재생성">
                  <Pill>↻ 다른 곳</Pill>
                </button>
              </div>
            </li>
          ))}
        </ul>
      </main>

      {/* sticky CTA */}
      <div className="sticky bottom-0 bg-bg/95 backdrop-blur border-t border-fg/15 px-4 py-3 safe-bottom">
        <div className="flex gap-2">
          <button className="w-24 rounded-card border border-fg/30 py-3 text-sm">
            ↗ 공유
          </button>
          <form action={`/api/dates/${d.id}/confirm`} method="post" className="flex-1">
            <button
              type="submit"
              className="w-full bg-ink-card text-bg rounded-card py-3 font-semibold"
            >
              이 코스로 확정 ✓
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
