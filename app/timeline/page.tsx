// app/timeline/page.tsx — 캘린더 (month nav + 날짜 선택 패널) + 데이트 + 개인 일정
import Link from "next/link";
import { getAllDates, getPastDates, prisma } from "@/lib/db";
import { requireApproved } from "@/lib/auth";
import { TabBar, SectionTitle } from "@/components/ui";
import EventsSection, { type EventRow } from "./EventsSection";
import MonthPicker from "./MonthPicker";
import TimelineActions from "./TimelineActions";
import CalendarSwipe from "./CalendarSwipe";
import PastDatesList, { type PastItem } from "../PastDatesList";

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

  const [dates, eventsRaw, admin, partner, past] = await Promise.all([
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
    getPastDates(),
  ]);

  const pastItems: PastItem[] = past.map((d) => ({
    id: d.id,
    number: d.number,
    title: d.title,
    scheduledAt: new Date(d.scheduledAt).toISOString(),
    area: d.area ?? null,
    weather: d.weather ?? null,
    avgStars: d.reviews.length
      ? d.reviews.reduce((s, r) => s + r.stars, 0) / d.reviews.length
      : 0,
  }));

  const adminId = admin?.id ?? null;
  const cells = buildMonth(year, month);

  // 다일 데이트도 잡기: 시작이 월 안 OR 종료가 월 안 OR 시작 이전~종료 이후로 월 전체 걸침
  const inMonth = dates.filter((d) => {
    const start = new Date(d.scheduledAt);
    const end = d.scheduledEndAt ? new Date(d.scheduledEndAt) : start;
    const startInMonth =
      start.getFullYear() === year && start.getMonth() === month;
    const endInMonth =
      end.getFullYear() === year && end.getMonth() === month;
    const spans =
      start < new Date(year, month, 1) &&
      end >= new Date(year, month + 1, 1);
    return startInMonth || endInMonth || spans;
  });

  const dateByDay = new Map<number, (typeof dates)[number]>();
  inMonth.forEach((d) => {
    const start = new Date(d.scheduledAt);
    const end = d.scheduledEndAt ? new Date(d.scheduledEndAt) : start;
    const startDay =
      start.getFullYear() === year && start.getMonth() === month
        ? start.getDate()
        : 1;
    const endDay =
      end.getFullYear() === year && end.getMonth() === month
        ? end.getDate()
        : new Date(year, month + 1, 0).getDate();
    for (let d2 = startDay; d2 <= endDay; d2++) {
      // 같은 날 여러 데이트가 있으면 첫 번째만 (희귀 케이스)
      if (!dateByDay.has(d2)) dateByDay.set(d2, d);
    }
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
          <MonthPicker year={year} month={month} />
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
        <CalendarSwipe
          prevHref={`/timeline?ym=${ymStr(prev.y, prev.m)}`}
          nextHref={`/timeline?ym=${ymStr(next.y, next.m)}`}
        >
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
            const dayEvents = c.day ? eventsByDay.get(c.day) ?? [] : [];

            const cellHref = !c.day
              ? "#"
              : `/timeline?ym=${ymStr(year, month)}&day=${dayStr(year, month, c.day)}`;

            return (
              <Link
                key={i}
                href={cellHref}
                scroll={!!c.day}
                className={[
                  "tap aspect-square rounded-lg border flex items-center justify-center relative overflow-hidden",
                  isToday ? "border-accent border-2" : "border-fg/15",
                  isSelected ? "bg-accent/10 border-accent" : "",
                  !c.day ? "opacity-0 pointer-events-none" : "",
                ].join(" ")}
              >
                {dRec && (
                  <span
                    aria-hidden
                    className="absolute inset-0 flex items-center justify-center pointer-events-none leading-none select-none"
                    style={{
                      color: planned
                        ? "var(--accent)"
                        : "var(--fg)",
                      fontSize: "2.4em",
                      opacity: planned ? 0.35 : 0.25,
                    }}
                  >
                    ♡
                  </span>
                )}
                <span
                  className={`relative z-10 text-xs ${isToday ? "font-bold" : dRec ? "text-fg" : "text-fg-soft"}`}
                >
                  {c.day}
                </span>
                {dayEvents.length > 0 && (
                  <div className="absolute bottom-1 left-0 right-0 flex items-center justify-center gap-1 z-10">
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
        </CalendarSwipe>
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

      <EventsSection
        events={events}
        meId={me.id}
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

      {pastItems.length > 0 && (
        <section className="px-5 pt-6 pb-28 mt-4 space-y-3 border-t border-fg/10">
          <SectionTitle
            title="지난 데이트"
            hint={`총 ${pastItems.length}회`}
          />
          <PastDatesList items={pastItems} />
        </section>
      )}

      <div className="flex-1" />
      <TimelineActions
        selectedDayStr={
          selectedDay !== null ? dayStr(year, month, selectedDay) : null
        }
        ymStr={ymStr(year, month)}
        monthLabel={selectedDay !== null ? `${month + 1}월 ${selectedDay}일` : ""}
        weekdayLabel={
          selectedDay !== null
            ? KO_WEEK[new Date(year, month, selectedDay).getDay()] + "요일"
            : ""
        }
        isPastDay={(() => {
          if (selectedDay === null) return false;
          const d = new Date(year, month, selectedDay);
          const t = new Date(today);
          t.setHours(0, 0, 0, 0);
          return d.getTime() < t.getTime();
        })()}
        isToday={
          selectedDay !== null &&
          today.getFullYear() === year &&
          today.getMonth() === month &&
          today.getDate() === selectedDay
        }
        adminId={adminId}
        existingDate={
          selectedDate
            ? {
                id: selectedDate.id,
                number: selectedDate.number,
                title: selectedDate.title,
                area: selectedDate.area,
                status: selectedDate.status,
                stops: selectedDate.plan.stops.length,
              }
            : null
        }
        existingEvents={selectedEvents.map((e) => ({
          id: e.id,
          title: e.title,
          allDay: e.allDay,
          startsAt: e.startsAt.toISOString(),
          userId: e.user.id,
          userNickname: e.user.nickname,
        }))}
      />
      <TabBar active="log" />
    </div>
  );
}
