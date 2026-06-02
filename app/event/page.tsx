// app/event/page.tsx — "오늘 하루만" 추억 슬라이드쇼 이벤트.
// EVENT_DATE (KST) 당일에만 풀 오픈. 전날까지는 D-Day 카운트다운, 다음날부터는 닫힘.
// 날짜 바꾸려면 EVENT_DATE 만 수정. ?date=YYYY-MM-DD 로 미리보기 가능 (admin).
import Link from "next/link";
import { prisma, getActiveUsers } from "@/lib/db";
import { requireApproved } from "@/lib/auth";
import { todayKstStr } from "@/lib/daily";
import { coupleDayNumber, COUPLE_START_KIND } from "@/lib/saju";
import EventClient, { type Slide } from "./EventClient";

export const dynamic = "force-dynamic";

// ▼ 이벤트가 열리는 날 (KST). 바꾸려면 여기만 수정.
const EVENT_DATE = "2026-05-29";
// ▼ true 면 EVENT_DATE 무시하고 항상 열림. 닫을 땐 false 로.
const EVENT_FORCE_OPEN = true;

export default async function EventPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const me = await requireApproved();
  const sp = await searchParams;

  const todayKst = todayKstStr();
  // admin 은 ?date=YYYY-MM-DD 로 강제 미리보기 가능.
  const eventDate =
    me.role === "admin" && sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date)
      ? sp.date
      : EVENT_DATE;
  const previewing = eventDate !== EVENT_DATE;

  const phase: "before" | "open" | "after" =
    previewing || EVENT_FORCE_OPEN
      ? "open"
      : todayKst < EVENT_DATE
        ? "before"
        : todayKst === EVENT_DATE
          ? "open"
          : "after";

  // D-Day (이벤트까지 남은 일수, KST 기준).
  const daysLeft = Math.round(
    (new Date(EVENT_DATE + "T00:00:00Z").getTime() -
      new Date(todayKst + "T00:00:00Z").getTime()) /
      86400000,
  );

  let slides: Slide[] = [];
  let dayNo = 0;
  let dateCount = 0;
  let photoCount = 0;
  let names: string[] = [];

  try {
    const [photos, anniversaries, dCount, users] = await Promise.all([
      phase === "open"
        ? prisma.datePhoto.findMany({
            orderBy: [
              { date: { scheduledAt: "asc" } },
              { createdAt: "asc" },
            ],
            select: {
              id: true,
              url: true,
              caption: true,
              date: {
                select: { number: true, title: true, scheduledAt: true },
              },
            },
          })
        : Promise.resolve([]),
      prisma.anniversary
        .findMany({ where: { kind: COUPLE_START_KIND } })
        .catch(() => []),
      prisma.date
        .count({ where: { status: { not: "cancelled" } } })
        .catch(() => 0),
      getActiveUsers().catch(() => []),
    ]);
    slides = photos.map((p) => ({
      id: p.id,
      url: p.url,
      caption: p.caption,
      dateNumber: p.date.number,
      dateTitle: p.date.title,
      dateLabel: new Date(p.date.scheduledAt).toLocaleDateString("ko", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    }));
    const coupleStart = anniversaries[0];
    if (coupleStart) {
      dayNo = coupleDayNumber(coupleStart.date.toISOString().slice(0, 10));
    }
    dateCount = dCount;
    photoCount = photos.length;
    names = users.map((u) => u.nickname);
  } catch (e) {
    console.error("[event] data fetch", e);
  }

  return (
    <EventClient
      phase={phase}
      previewing={previewing}
      daysLeft={daysLeft}
      eventDateLabel={new Date(EVENT_DATE + "T00:00:00Z").toLocaleDateString(
        "ko",
        { month: "long", day: "numeric" },
      )}
      slides={slides}
      dayNo={dayNo}
      dateCount={dateCount}
      photoCount={photoCount}
      names={names}
      backLink={<Link href="/" className="tap text-xs opacity-70">← 홈</Link>}
    />
  );
}
