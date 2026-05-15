// app/timeline/page.tsx — 캘린더 (month nav + 날짜 선택 패널) + 데이트 + 개인 약속
import Link from "next/link";
import { getAllDates, prisma } from "@/lib/db";
import { requireApproved } from "@/lib/auth";
import { TabBar, Eyebrow } from "@/components/ui";
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

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function parseYm(value: string | undefined, fallback: { y: number; m: number }) {
  if (!value) return fallback;
  const m = value.match(/^(\d{4})-(\d{1,2})$/);
  if (!m) return fallback;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  if (mo < 0 || mo > 11) return fallback;
  return { y, m: mo };
}

function parseDay(value: string | undefined, ym: { y: number; m: number }) {
  if (!value) return null;
  const m = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  if (mo !== ym.m || y !== ym.y) return null; // 다른 달이면 무시
  return d;
}

function ymStr(y: number, m: number) {
  return `${y}-${pad(m + 1)}`;
}

function dayStr(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string; day?: string }>;
}) {
  const me = await requireApproved();
  const sp = await searchParams;

  const today = new Date();
  const fallbackYm = { y: today.getFullYear(), m: today.getMonth() };
  const { y: year, m: month } = parseYm(sp.ym, fallbackYm);
  const selectedDay = parseDay(sp.day, { y: year, m: month });

  // KST 사용자의 month 윈도우를 UTC로 명시. KST = UTC+9.
  // KST 5/1 00:00 = UTC 4/30 15:00. allDay 이벤트는 UTC noon 저장이라 어차피 안에 들어옴.
  const monthStart = new Date(Date.UTC(year, month, 1) - 9 * 60 * 60 * 1000);
  const monthEnd = new Date(Date.UTC(year, month + 1, 1) - 9 * 60 * 60 * 1000);

  const [dates, eventsRaw, admin, partner] = await Promise.all([
    getAllDates(),
    // 다일 일정도 잡기: 시작이 월 끝 전 + (단일 = 시작이 월 시작 이후 / 다일 = 종료가 월 시작 이후)
    prisma.personalEvent.findMany({
      where: {
        AND: [
          { startsAt: { lt: monthEnd } },
          {
            OR: [
              { endsAt: null, startsAt: { gte: monthStart } },
              { endsAt: { gte: monthStart } },
            ],
          },
        ],
      },
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

  const eventsByDay = new Map<number, typeof eventsRaw>();
  const lastDay = new Date(year, month + 1, 0).getDate();
  for (const e of eventsRaw) {
    const start = new Date(e.startsAt);
    const end = e.endsAt ? new Date(e.endsAt) : start;
    // 이번 month 범위 안의 day 들에 모두 등록 (다일 일정 캘린더 띠 표시용)
    const startDay =
      start.getFullYear() === year && start.getMonth() === month
        ? start.getDate()
        : 1;
    const endDay =
      end.getFullYear() === year && end.getMonth() === month
        ? end.getDate()
        : lastDay;
    for (let d = startDay; d <= endDay; d++) {
      const arr = eventsByDay.get(d) ?? [];
      arr.push(e);
      eventsByDay.set(d, arr);
    }
  }

  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() === month;

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

  // 선택된 day 의 데이트·이벤트
  const selectedDate = selectedDay ? dateByDay.get(selectedDay) ?? null : null;
  const selectedEvents = selectedDay
    ? eventsByDay.get(selectedDay) ?? []
    : [];

  // 월 이동 링크
  const prev = month === 0
    ? { y: year - 1, m: 11 }
    : { y: year, m: month - 1 };
  const next = month === 11
    ? { y: year + 1, m: 0 }
    : { y: year, m: month + 1 };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-5 pt-5 pb-3 safe-top">
        <div className="flex items-center justify-between">
          <Link
            href={`/timeline?ym=${ymStr(prev.y, prev.m)}`}
            className="tap w-9 h-9 flex items-center justify-center rounded-full text-fg-faint hover:text-fg hover:bg-bg-warm"
            aria-label="이전 달"
          >
            ‹
          </Link>
          <div className="text-center">
            <Eyebrow>기록</Eyebrow>
            <p className="font-display text-xl mt-0.5">
              {year} <em className="italic text-accent">{month + 1}월</em>
            </p>
          </div>
          <Link
            href={`/timeline?ym=${ymStr(next.y, next.m)}`}
            className="tap w-9 h-9 flex items-center justify-center rounded-full text-fg-faint hover:text-fg hover:bg-bg-warm"
            aria-label="다음 달"
          >
            ›
          </Link>
        </div>
        {!isCurrentMonth && (
          <div className="text-center mt-1.5">
            <Link
              href="/timeline"
              className="tap text-[11px] text-accent underline-offset-4 hover:underline"
            >
              오늘로
            </Link>
          </div>
        )}
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
            const isToday =
              isCurrentMonth && c.day === today.getDate();
            const isSelected = selectedDay === c.day;
            const dRec = c.day ? dateByDay.get(c.day) : undefined;
            const planned = dRec?.status === "planned";
            const done = dRec?.status === "done";
            const dayEvents = c.day ? eventsByDay.get(c.day) ?? [] : [];

            const cellHref = !c.day
              ? "#"
              : dRec
                ? `/dates/${dRec.id}`
                : `/timeline?ym=${ymStr(year, month)}&day=${dayStr(year, month, c.day)}`;

            return (
              <Link
                key={i}
                href={cellHref}
                scroll={!!c.day && !dRec}
                className={[
                  "tap aspect-square rounded-lg border flex flex-col items-center justify-center relative",
                  isToday ? "border-accent border-2" : "border-fg/15",
                  isSelected ? "bg-accent/10 border-accent" : "",
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

      {/* 선택된 날짜 패널 */}
      {selectedDay !== null && (
        <section
          id="day-panel"
          className="mx-5 mt-4 editorial-card-warm p-4 space-y-3 rise-in"
        >
          <div className="flex items-center justify-between">
            <p className="font-display text-base">
              {month + 1}월 {selectedDay}일
            </p>
            <Link
              href={`/timeline?ym=${ymStr(year, month)}`}
              className="tap text-[11px] text-fg-faint"
              aria-label="선택 해제"
            >
              ✕
            </Link>
          </div>

          {selectedDate && (
            <Link
              href={`/dates/${selectedDate.id}`}
              className="tap lift block bg-bg border border-accent/30 rounded-card px-3 py-2.5"
            >
              <p className="text-[10px] text-accent tracking-wider">
                {selectedDate.status === "planned" ? "♡ 예정" : "♡ 다녀온"}
              </p>
              <p className="font-display text-sm mt-0.5 truncate">
                {selectedDate.title}
              </p>
              <p className="text-[10px] text-fg-faint mt-0.5">
                {selectedDate.area} · {selectedDate.plan.stops.length} stops
              </p>
            </Link>
          )}

          {selectedEvents.length > 0 && (
            <ul className="space-y-1.5">
              {selectedEvents.map((e) => (
                <li
                  key={e.id}
                  className="bg-bg border border-fg/10 rounded-card px-3 py-2 flex items-baseline gap-2"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0 translate-y-1"
                    style={{
                      background:
                        e.user.id === adminId
                          ? "var(--accent)"
                          : "var(--rain)",
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{e.title}</p>
                    <p className="text-[10px] text-fg-faint">
                      {e.user.nickname}
                      {!e.allDay
                        ? " · " +
                          new Date(e.startsAt).toLocaleTimeString("ko", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : " · 하루"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            {!selectedDate && (
              <Link
                href={`/plan/new?mode=direct&date=${dayStr(year, month, selectedDay)}`}
                className="tap lift bg-ink-card text-bg rounded-card py-2.5 text-center text-[12px] font-display"
              >
                + 데이트 기록
              </Link>
            )}
            <Link
              href={`/timeline?ym=${ymStr(year, month)}&day=${dayStr(year, month, selectedDay)}#add-event`}
              className={[
                "tap lift border border-fg/20 rounded-card py-2.5 text-center text-[12px] font-display",
                selectedDate ? "col-span-2" : "",
              ].join(" ")}
            >
              + 약속 추가
            </Link>
          </div>
        </section>
      )}

      <EventsSection
        events={events}
        meId={me.id}
        meRole={me.role}
        owners={[
          ...(admin
            ? [{ id: admin.id, nickname: admin.nickname, color: "accent" as const }]
            : []),
          ...(partner
            ? [{ id: partner.id, nickname: partner.nickname, color: "rain" as const }]
            : []),
        ].filter((o, i, arr) => arr.findIndex((x) => x.id === o.id) === i)}
        initialDate={selectedDay !== null ? dayStr(year, month, selectedDay) : undefined}
      />

      <div className="flex-1" />
      <TabBar active="log" />
    </div>
  );
}
