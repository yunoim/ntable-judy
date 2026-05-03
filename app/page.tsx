// app/page.tsx — 03 A 홈 대시보드 (타임라인 리스트형)
import Link from "next/link";
import { MOCK_DATES, USERS, dDay, avgStars } from "@/lib/data";
import { Avatar, Card, Pill, PhotoSlot, Stars, TabBar } from "@/components/ui";

export default function HomePage() {
  const next = MOCK_DATES.find((d) => d.status === "planned");
  const past = MOCK_DATES.filter((d) => d.status === "done").slice(0, 5);
  const judyAvg = avgStars("judy");
  const meAvg = avgStars("me");
  const totalDates = MOCK_DATES.filter((d) => d.status === "done").length;

  return (
    <div className="min-h-screen flex flex-col">
      {/* sticky header */}
      <header className="sticky top-0 z-20 bg-bg/95 backdrop-blur border-b border-fg/15 px-4 pt-3 pb-3 safe-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar user={USERS.judy} size="sm" variant="warm" />
            <Avatar user={USERS.me} size="sm" variant="dark" />
            <div className="ml-1">
              <p className="font-display text-base">주디 & 도현</p>
              <p className="text-[11px] text-fg-faint">D+247 · 데이트 {totalDates}회</p>
            </div>
          </div>
          <Link href="/settings" className="text-fg-faint text-sm">⚙</Link>
        </div>
        <div className="flex gap-2 mt-2">
          <Pill>🐰 {judyAvg} ★</Pill>
          <Pill>🦊 {meAvg} ★</Pill>
        </div>
      </header>

      <main className="flex-1 px-4 py-3 space-y-4 pb-24">
        {/* D-Day card */}
        {next && (
          <Link href={`/dates/${next.id}`} className="block">
            <Card variant="dark" className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] tracking-wider uppercase text-accent-soft">
                  다음 데이트
                </span>
                <span className="text-[11px] text-accent-soft">
                  {new Date(next.scheduledAt).toLocaleDateString("ko", {
                    weekday: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="font-display text-3xl text-bg">
                D {dDay(new Date(next.scheduledAt)) > 0 ? "-" : "+"}{" "}
                {Math.abs(dDay(new Date(next.scheduledAt)))}
              </p>
              <p className="text-sm text-accent-soft">{next.title}</p>
              <div className="flex gap-2 pt-2">
                <Pill className="!border-accent-soft !text-accent-soft">
                  {next.plan.stops.length} stops
                </Pill>
                <Pill className="!border-accent-soft !text-accent-soft">
                  ~ ₩{next.estimatedCost?.toLocaleString()}
                </Pill>
              </div>
            </Card>
          </Link>
        )}

        <p className="text-[11px] tracking-widest uppercase text-fg-faint pt-2">
          최근 데이트
        </p>

        <ul className="space-y-3">
          {past.map((d) => {
            const judyR = d.reviews.find((r) => r.userId === "judy");
            const meR = d.reviews.find((r) => r.userId === "me");
            const avg =
              ((judyR?.stars ?? 0) + (meR?.stars ?? 0)) /
              ((judyR ? 1 : 0) + (meR ? 1 : 0) || 1);
            return (
              <li key={d.id}>
                <Link href={`/dates/${d.id}`}>
                  <Card className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-display text-lg">#{d.number}</span>
                        <span className="font-display text-base truncate">
                          {d.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-fg-faint mt-0.5">
                        {d.area} ·{" "}
                        {new Date(d.scheduledAt).toLocaleDateString("ko", {
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                      <div className="mt-1.5">
                        <Stars n={avg} />
                      </div>
                    </div>
                    <PhotoSlot label="img" className="w-14 h-14 shrink-0" />
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>

      {/* FAB */}
      <Link
        href="/plan/new"
        className="fixed bottom-20 right-4 z-30 bg-ink-card text-bg rounded-card px-4 py-3 text-sm font-semibold shadow-lg"
        style={{ boxShadow: "0 4px 0 rgba(44,32,23,0.15)" }}
      >
        + 데이트 계획
      </Link>

      <TabBar active="home" />
    </div>
  );
}
