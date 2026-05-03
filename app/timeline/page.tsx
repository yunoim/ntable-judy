// app/timeline/page.tsx — 06 B 달력 + 다음 데이트
import Link from "next/link";
import { getAllDates } from "@/lib/db";
import { requireApproved } from "@/lib/auth";
import { dDay } from "@/lib/data";
import { TabBar, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

const KO_WEEK = ["일", "월", "화", "수", "목", "금", "토"];

function buildMonth(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const last = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ day: number | null }> = [];
  for (let i = 0; i < startOffset; i++) cells.push({ day: null });
  for (let d = 1; d <= last; d++) cells.push({ day: d });
  while (cells.length % 7) cells.push({ day: null });
  return cells;
}

export default async function TimelinePage() {
  await requireApproved();
  const dates = await getAllDates();

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const cells = buildMonth(year, month);

  const inMonth = dates.filter((d) => {
    const dt = new Date(d.scheduledAt);
    return dt.getFullYear() === year && dt.getMonth() === month;
  });

  const dateByDay = new Map<number, (typeof dates)[number]>();
  inMonth.forEach((d) => {
    const dt = new Date(d.scheduledAt);
    dateByDay.set(dt.getDate(), d);
  });

  const todayDate =
    dateByDay.get(today.getDate()) ??
    dates.find(
      (d) =>
        new Date(d.scheduledAt).toDateString() === today.toDateString(),
    );

  const nextPlanned = dates
    .filter((d) => d.status === "planned" && new Date(d.scheduledAt) > today)
    .sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    )[0];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-4 pt-4 pb-3 border-b border-fg/15 safe-top">
        <div className="flex items-center justify-between">
          <Link href={`/timeline?m=${month}`} className="text-xs text-fg-faint">
            ← {year}.{String(month).padStart(2, "0")}
          </Link>
          <p className="font-display text-base">
            {year} · {month + 1}월
          </p>
          <Link
            href={`/timeline?m=${month + 2}`}
            className="text-xs text-fg-faint"
          >
            {year}.{String(month + 2).padStart(2, "0")} →
          </Link>
        </div>
      </header>

      <section className="px-4 py-3">
        <div className="grid grid-cols-7 gap-1.5 mb-1">
          {KO_WEEK.map((d) => (
            <div key={d} className="text-[10px] text-fg-faint text-center">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((c, i) => {
            const isToday = c.day === today.getDate();
            const dRec = c.day ? dateByDay.get(c.day) : undefined;
            const planned = dRec?.status === "planned";
            const done = dRec?.status === "done";
            return (
              <Link
                key={i}
                href={dRec ? `/dates/${dRec.id}` : "#"}
                className={[
                  "aspect-square rounded-lg border flex flex-col items-center justify-center",
                  isToday ? "border-accent border-2" : "border-fg/15",
                  done ? "bg-bg-warm" : "",
                  planned ? "border-dashed" : "",
                  !c.day ? "opacity-0 pointer-events-none" : "",
                ].join(" ")}
              >
                <span
                  className={`text-xs ${
                    isToday ? "font-bold" : "text-fg-soft"
                  }`}
                >
                  {c.day}
                </span>
                {dRec && (
                  <span
                    className="font-display text-xs leading-none mt-0.5"
                    style={{ color: planned ? "var(--accent)" : "var(--fg)" }}
                  >
                    ♡
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="px-4 pb-4 space-y-3">
        {todayDate && (
          <>
            <p className="text-[11px] tracking-widest uppercase text-fg-faint">
              {today.getMonth() + 1}월 {today.getDate()}일 · 오늘
            </p>
            <Link href={`/dates/${todayDate.id}`}>
              <Card variant="warm">
                <p className="font-display text-base">
                  D-Day · {todayDate.title}
                </p>
                <p className="text-[11px] text-fg-faint mt-1">
                  {new Date(todayDate.scheduledAt).toLocaleTimeString("ko", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  · {todayDate.plan.stops.length} stops
                </p>
              </Card>
            </Link>
          </>
        )}

        {nextPlanned && nextPlanned.id !== todayDate?.id && (
          <>
            <p className="text-[11px] tracking-widest uppercase text-fg-faint">
              다음 데이트 ·{" "}
              {new Date(nextPlanned.scheduledAt).toLocaleDateString("ko", {
                month: "long",
                day: "numeric",
              })}
              {" "}(D-{Math.abs(dDay(new Date(nextPlanned.scheduledAt)))})
            </p>
            <Link href={`/dates/${nextPlanned.id}`}>
              <Card>
                <p className="font-display text-sm">{nextPlanned.title}</p>
                <p className="text-[11px] text-fg-faint mt-1">
                  {nextPlanned.area} · {nextPlanned.plan.stops.length} stops
                </p>
              </Card>
            </Link>
          </>
        )}

        <p className="text-[11px] tracking-widest uppercase text-fg-faint pt-2">
          이번달 빈 날
        </p>
        <Link href="/plan/new">
          <div className="rounded-card border border-dashed border-fg/30 p-4 text-center">
            <p className="font-display text-sm text-fg-soft">+ 코스 짜기</p>
            <p className="text-[11px] text-fg-faint mt-0.5">
              아직 비어있는 주말
            </p>
          </div>
        </Link>
      </section>

      <div className="flex-1" />
      <TabBar active="log" />
    </div>
  );
}
