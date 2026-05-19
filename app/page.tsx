// app/page.tsx — 홈 (editorial redesign)
import Link from "next/link";
import {
  Avatar,
  Eyebrow,
  Hero,
  TabBar,
} from "@/components/ui";
import {
  getNextDate,
  getActiveUsers,
  avgStarsByUserId,
  prisma,
} from "@/lib/db";
import { requireApproved } from "@/lib/auth";
import { dDay } from "@/lib/data";
import { coupleDayNumber, COUPLE_START_KIND } from "@/lib/saju";
import { nextMilestone } from "@/lib/milestones";
import CoupleSheets from "./CoupleSheets";
import RecentActivity from "./RecentActivity";
import DailyEntryCard from "./DailyEntryCard";
import { todayKstStr, computeStreak } from "@/lib/daily";

export const dynamic = "force-dynamic";

type AnniRow = {
  id: number;
  label: string;
  date: Date;
  emoji: string | null;
  recurring: boolean;
};

function nearestAnniversary(rows: AnniRow[]) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  let best: { row: AnniRow; days: number; nextDate: Date } | null = null;
  for (const a of rows) {
    const target = new Date(a.date);
    target.setHours(0, 0, 0, 0);
    if (a.recurring) {
      target.setFullYear(now.getFullYear());
      if (target.getTime() < now.getTime())
        target.setFullYear(now.getFullYear() + 1);
    } else if (target.getTime() < now.getTime()) {
      continue;
    }
    const days = Math.round((target.getTime() - now.getTime()) / 86400000);
    if (!best || days < best.days) {
      best = { row: a, days, nextDate: target };
    }
  }
  return best;
}

export default async function HomePage() {
  const me = await requireApproved();
  const now = new Date();
  const [next, users, pendingCount, anniversaries, bucketsRaw, capsulesRaw] =
    await Promise.all([
      getNextDate(),
      getActiveUsers(),
      prisma.user.count({ where: { role: "pending" } }),
      prisma.anniversary.findMany({}),
      prisma.bucket.findMany({
        orderBy: [
          { done: "asc" },
          { priority: "desc" },
          { createdAt: "desc" },
        ],
        include: {
          doneDate: { select: { id: true, number: true, title: true } },
          createdBy: { select: { id: true, nickname: true } },
        },
      }),
      prisma.timeCapsule.findMany({
        orderBy: [{ opened: "asc" }, { openAt: "asc" }],
        include: { createdBy: { select: { id: true, nickname: true } } },
      }),
    ]);
  const isAdmin = me.role === "admin";

  const buckets = bucketsRaw.map((b) => ({
    id: b.id,
    title: b.title,
    emoji: b.emoji,
    description: b.description,
    area: b.area,
    priority: b.priority,
    done: b.done,
    doneAt: b.doneAt?.toISOString() ?? null,
    doneDate: b.doneDate
      ? {
          id: b.doneDate.id,
          number: b.doneDate.number,
          title: b.doneDate.title,
        }
      : null,
    createdBy: b.createdBy,
  }));
  const capsules = capsulesRaw.map((c) => ({
    id: c.id,
    title: c.title,
    body: c.body,
    openAt: c.openAt.toISOString(),
    opened: c.opened,
    openedAt: c.openedAt?.toISOString() ?? null,
    createdById: c.createdById,
    createdBy: c.createdBy,
    canOpen: !c.opened && c.openAt.getTime() <= now.getTime(),
  }));

  const upcomingAnni = nearestAnniversary(anniversaries);
  const coupleStart = anniversaries.find((a) => a.kind === COUPLE_START_KIND);
  const coupleStartIso = coupleStart
    ? coupleStart.date.toISOString().slice(0, 10)
    : null;
  const dayNo = coupleStartIso ? coupleDayNumber(coupleStartIso) : 0;
  const upcomingMilestone = coupleStartIso
    ? nextMilestone(coupleStartIso)
    : null;

  // 안 읽은 채팅 수 — 내가 마지막 읽은 ID 이후의, 상대가 보낸 메시지.
  let unreadCount = 0;
  try {
    const read = await prisma.chatRead.findUnique({
      where: { userId: me.id },
    });
    const lastReadId = read?.lastReadId ?? 0;
    unreadCount = await prisma.chatMessage.count({
      where: { id: { gt: lastReadId }, NOT: { userId: me.id } },
    });
  } catch (e) {
    console.error("[home] unread chat count", e);
  }

  // 데일리 한 줄 — 오늘 양쪽 entry + 스트릭.
  const dateStr = todayKstStr();
  const partnerInitial = users.find(
    (u) => u.partner && u.id !== me.id,
  ) ?? users.find((u) => u.role === "approved" && u.id !== me.id);
  let myDaily: { body: string; emoji: string | null } | null = null;
  let partnerDaily: { body: string; emoji: string | null } | null = null;
  let streak = 0;
  try {
    const entries = await prisma.dailyEntry.findMany({
      where: {
        date: dateStr,
        userId: { in: [me.id, partnerInitial?.id ?? "_"] },
      },
      select: { userId: true, body: true, emoji: true },
    });
    for (const e of entries) {
      if (e.userId === me.id) {
        myDaily = { body: e.body, emoji: e.emoji };
      } else if (partnerInitial && e.userId === partnerInitial.id) {
        partnerDaily = { body: e.body, emoji: e.emoji };
      }
    }
    if (partnerInitial) {
      streak = await computeStreak(me.id, partnerInitial.id, dateStr);
    }
  } catch (e) {
    console.error("[home] daily fetch", e);
  }

  const userStars = await Promise.all(
    users.map(async (u) => ({ ...u, avg: await avgStarsByUserId(u.id) })),
  );
  const fox = userStars.find((u) => u.role === "admin") ?? userStars[0];
  const partner = userStars.find((u) => u.partner && u.id !== fox?.id);
  const bunny =
    partner ??
    userStars.find((u) => u.role === "approved" && u.id !== fox?.id);

  return (
    <div className="min-h-screen flex flex-col">
      {/* ─── Masthead (compact) ───────────────── */}
      <header className="px-5 pt-3 pb-2 safe-top flex items-center justify-between rise-in">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex -space-x-2">
            {bunny && (
              <Avatar
                user={{ name: bunny.nickname, emoji: bunny.emoji ?? "🐰" }}
                size="sm"
                variant="warm"
              />
            )}
            {fox && (
              <Avatar
                user={{ name: fox.nickname, emoji: fox.emoji ?? "🦊" }}
                size="sm"
                variant="dark"
              />
            )}
          </div>
          <p className="font-display text-[15px] truncate">
            {bunny?.nickname ?? "초대 대기"}
            <span className="text-fg-faint mx-1.5">·</span>
            {fox?.nickname ?? "?"}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Link
            href="/chat"
            className="tap relative w-9 h-9 flex items-center justify-center rounded-full text-fg-faint hover:text-fg hover:bg-bg-warm"
            aria-label="채팅"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 bg-accent text-bg text-[9px] rounded-full min-w-[14px] h-[14px] px-1 flex items-center justify-center leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className="tap relative w-9 h-9 flex items-center justify-center rounded-full text-fg-faint hover:text-fg hover:bg-bg-warm"
              aria-label="관리자 패널"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              {pendingCount > 0 && (
                <span className="absolute top-1 right-1 bg-accent text-bg text-[9px] rounded-full min-w-[14px] h-[14px] px-1 flex items-center justify-center leading-none">
                  {pendingCount}
                </span>
              )}
            </Link>
          )}
          <Link
            href="/settings/profile"
            className="tap w-9 h-9 flex items-center justify-center rounded-full text-fg-faint hover:text-fg hover:bg-bg-warm"
            aria-label="프로필"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="9" r="3.5" />
              <path d="M5 20c1-3.5 4-5 7-5s6 1.5 7 5" />
            </svg>
          </Link>
        </div>
      </header>

      <main className="flex-1 px-5 pt-2 pb-28 space-y-4">
        {/* ─── 오늘 한 줄 (데일리 챌린지) ─────────────── */}
        {partnerInitial && (
          <DailyEntryCard
            meId={me.id}
            meNickname={me.nickname}
            partnerNickname={partnerInitial.nickname}
            myEntry={myDaily}
            partnerEntry={partnerDaily}
            streak={streak}
            dateStr={dateStr}
          />
        )}

        {/* ─── 최근 활동 ─────────────────────── */}
        <RecentActivity />

        {/* ─── Hero: 다음 데이트 ─────────────────── */}
        {next ? (
          <section className="space-y-2.5 rise-in rise-in-1">
            <Eyebrow>다음 데이트</Eyebrow>
            <Link href={`/dates/${next.id}`} className="block tap lift rounded-[16px]">
              <Hero
                eyebrow={`#${String(next.number).padStart(2, "0")}`}
                number={`D-${Math.max(0, dDay(new Date(next.scheduledAt)))}`}
                caption={
                  <>
                    <span className="font-display text-bg text-base">
                      {next.title}
                    </span>
                    <br />
                    <span className="text-accent-soft">
                      {new Date(next.scheduledAt).toLocaleDateString("ko", {
                        month: "long",
                        day: "numeric",
                        weekday: "long",
                      })}
                      {next.scheduledEndAt &&
                        " → " +
                          new Date(next.scheduledEndAt).toLocaleDateString("ko", {
                            month: "long",
                            day: "numeric",
                          })}
                      {next.startTime ? ` · ${next.startTime}` : ""}
                      {next.area ? ` · ${next.area}` : ""}
                    </span>
                  </>
                }
                variant="dark"
              />
            </Link>
          </section>
        ) : (
          <section className="space-y-2.5 rise-in rise-in-1">
            <Eyebrow>다음 데이트</Eyebrow>
            <div className="editorial-card border-dashed !border-accent/40 px-5 py-6 text-center space-y-3">
              <p className="text-fg-faint text-[13px]">아직 비어 있어요</p>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/plan/new"
                  className="tap lift bg-ink-card text-bg rounded-card py-3 font-display text-[13px]"
                >
                  ✨ AI로 짜기
                </Link>
                <Link
                  href="/plan/new?mode=direct"
                  className="tap lift border border-fg/20 rounded-card py-3 font-display text-[13px]"
                >
                  ✏️ 직접 입력
                </Link>
              </div>
              <Link
                href="/plan/new?mode=past"
                className="tap inline-block text-[11px] text-fg-faint hover:text-fg-soft hover:underline underline-offset-4"
              >
                📓 다녀온 데이트 기록하기
              </Link>
            </div>
          </section>
        )}

        {/* ─── 우리 사이 ─────────────────────────── */}
        {(dayNo > 0 || upcomingAnni || upcomingMilestone) && (
          <section className="space-y-2 rise-in rise-in-2">
            {dayNo > 0 && (
              <div className="editorial-card-warm px-4 py-2.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-[11px] text-fg-faint">함께한 날</span>
                  <span className="font-display text-lg text-fg leading-none">
                    {dayNo}
                  </span>
                  <span className="text-fg-soft text-xs">일</span>
                </div>
              </div>
            )}

            {(() => {
              // 다가올 기념일 / 마일스톤 중 가장 가까운 한 건만 카드로 (/us 와 중복 줄임).
              const t = new Date();
              t.setHours(0, 0, 0, 0);
              const anniDays = upcomingAnni?.days;
              const mileDays = upcomingMilestone
                ? Math.round(
                    (upcomingMilestone.date.getTime() - t.getTime()) / 86400000,
                  )
                : undefined;
              type NextCard = {
                emoji: string;
                label: string;
                date: Date;
                days: number;
              };
              let pick: NextCard | null = null;
              if (anniDays !== undefined && mileDays !== undefined) {
                pick =
                  anniDays <= mileDays
                    ? {
                        emoji: upcomingAnni!.row.emoji ?? "📅",
                        label: upcomingAnni!.row.label,
                        date: upcomingAnni!.nextDate,
                        days: anniDays,
                      }
                    : {
                        emoji: upcomingMilestone!.emoji,
                        label: upcomingMilestone!.label,
                        date: upcomingMilestone!.date,
                        days: mileDays,
                      };
              } else if (anniDays !== undefined) {
                pick = {
                  emoji: upcomingAnni!.row.emoji ?? "📅",
                  label: upcomingAnni!.row.label,
                  date: upcomingAnni!.nextDate,
                  days: anniDays,
                };
              } else if (mileDays !== undefined) {
                pick = {
                  emoji: upcomingMilestone!.emoji,
                  label: upcomingMilestone!.label,
                  date: upcomingMilestone!.date,
                  days: mileDays,
                };
              }
              if (!pick) return null;
              return (
                <Link
                  href="/us"
                  className="tap lift block editorial-card px-4 py-2.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base shrink-0">{pick.emoji}</span>
                      <span className="font-display text-sm truncate">
                        {pick.label}
                      </span>
                      <span className="text-[10px] text-fg-faint shrink-0">
                        {pick.date.toLocaleDateString("ko", {
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <span className="text-accent font-display text-sm shrink-0">
                      {pick.days === 0 ? "오늘" : `D-${pick.days}`}
                    </span>
                  </div>
                </Link>
              );
            })()}
          </section>
        )}

        {/* ─── 둘만의 기록 ─────────────────────── */}
        <CoupleSheets
          meId={me.id}
          meRole={me.role}
          buckets={buckets}
          capsules={capsules}
        />
      </main>

      <TabBar active="home" />
    </div>
  );
}
