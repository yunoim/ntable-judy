// app/timeline/page.tsx — 캘린더 + 데이트 + 개인 약속
import Link from "next/link";
import { getAllDates, prisma } from "@/lib/db";
import { requireApproved } from "@/lib/auth";
import { dDay } from "@/lib/data";
import { TabBar, Card, Eyebrow } from "@/components/ui";
import EventsSection, { type EventRow } from "./EventsSection";

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
  const me = await requireApproved();

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 1);

  const [dates, eventsRaw, admin, partner] = await Promise.all([
    getAllDates(),
    prisma.personalEvent.findMany({
      where: { startsAt: { gte: monthStart, lt: monthEnd } },
      orderBy: { startsAt: "asc" },
      include: { user: { select: { id: true, nickname: true, emoji: true } } },
    }),
    prisma.user.findFirst({ where: { role: "admin" } }),
    prisma.user.findFirst({ where: { partner: true } }),
  ]);

  const adminId = admin?.id ?? null;
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

  // day → events map
  const eventsByDay = new Map<number, typeof eventsRaw>();
  for (const e of eventsRaw) {
    const day = new Date(e.startsAt).getDate();
    const arr = eventsByDay.get(day) ?? [];
    arr.push(e);
    eventsByDay.set(day, arr);
  }

  const todayDate =
    dateByDay.get(today.getDate()) ??
    dates.find(
      (d) => new Date(d.scheduledAt).toDateString() === today.toDateString(),
    );

  const nextPlanned = dates
    .filter((d) => d.status === "planned" && new Date(d.scheduledAt) > today)
    .sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    )[0];

  const events: EventRow[] = eventsRaw.map((e) => ({
    id: e.id,
    title: e.title,
    startsAt: e.startsAt.toISOString(),
    endsAt: e.endsAt?.toISOString() ?? null,
    allDay: e.allDay,
    category: e.category,
    emoji: e.emoji,
    note: e.note,
    user: e.user,
  }));

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-5 pt-5 pb-3 safe-top">
        <div className="flex items-center justify-between">
          <span className="text-xs text-fg-faint serif-italic">
            {year}.{String(month).padStart(2, "0")}
          </span>
          <div className="text-center">
            <Eyebrow>錄 · timeline</Eyebrow>
            <p className="font-display text-xl mt-0.5">
              {year} <em className="italic text-accent">{month + 1}월</em>
            </p>
          </div>
          <span className="text-xs text-fg-faint serif-italic">
            {year}.{String(month + 2).padStart(2, "0")}
          </span>
        </div>
      </header>

      <section className="px-5 pt-3">
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
            const dayEvents = c.day ? eventsByDay.get(c.day) ?? [] : [];
            return (
              <Link
                key={i}
                href={dRec ? `/dates/${dRec.id}` : "#"}
                className={[
                  "aspect-square rounded-lg border flex flex-col items-center justify-center relative",
                  isToday ? "border-accent border-2" : "border-fg/15",
                  done ? "bg-bg-warm" : "",
                  planned ? "border-dashed" : "",
                  !c.day ? "opacity-0 pointer-events-none" : "",
                ].join(" ")}
              >
                <span
                  className={`text-xs ${isToday ? "font-bold" : "text-fg-soft"}`}
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
                {dayEvents.length > 0 && (
                  <div className="absolute bottom-1 left-0 right-0 flex items-center justify-center gap-1">
                    {dayEvents.slice(0, 3).map((e, idx) => (
                      <span
                        key={idx}
                        className="w-2 h-2 rounded-full"
                        style={{
                          background:
                            e.user.id === adminId
                              ? "var(--accent)"
                              : "var(--rain)",
                        }}
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[9px] text-fg-faint leading-none font-display">
                        +{dayEvents.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 text-[11px] text-fg-soft">
          <span className="flex items-center gap-1.5">
            <span className="text-accent text-base leading-none">♡</span>
            데이트
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: "var(--accent)" }}
            />
            {admin?.nickname ?? "닉"}
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: "var(--rain)" }}
            />
            {partner?.nickname ?? "주디"}
          </span>
        </div>
      </section>

      <section className="px-5 py-4 space-y-3">
        {todayDate && (
          <>
            <Eyebrow>
              {today.getMonth() + 1}월 {today.getDate()}일 · 오늘
            </Eyebrow>
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
            <Eyebrow>
              다음 데이트 ·{" "}
              {new Date(nextPlanned.scheduledAt).toLocaleDateString("ko", {
                month: "long",
                day: "numeric",
              })}{" "}
              (D-{Math.abs(dDay(new Date(nextPlanned.scheduledAt)))})
            </Eyebrow>
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

        {!todayDate && !nextPlanned && (
          <Link href="/plan/new">
            <div className="rounded-card border border-dashed border-fg/30 p-4 text-center">
              <p className="font-display text-sm text-fg-soft">+ 코스 짜기</p>
              <p className="text-[11px] text-fg-faint mt-0.5">
                아직 비어있는 주말
              </p>
            </div>
          </Link>
        )}
      </section>

      <EventsSection events={events} meId={me.id} meRole={me.role} />

      <div className="flex-1" />
      <TabBar active="log" />
    </div>
  );
}
