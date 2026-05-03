// app/page.tsx — 홈 (Prisma 동적)
import Link from "next/link";
import { Avatar, Card, Pill, PhotoSlot, Stars, TabBar } from "@/components/ui";
import {
  getNextDate,
  getPastDates,
  getActiveUsers,
  getDoneCount,
  avgStarsByUserId,
  prisma,
} from "@/lib/db";
import { requireApproved } from "@/lib/auth";
import { dDay } from "@/lib/data";
import { coupleDayNumber, COUPLE_START_KIND } from "@/lib/saju";
import { nextMilestone } from "@/lib/milestones";

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
    let target = new Date(a.date);
    target.setHours(0, 0, 0, 0);
    if (a.recurring) {
      target.setFullYear(now.getFullYear());
      if (target.getTime() < now.getTime())
        target.setFullYear(now.getFullYear() + 1);
    } else if (target.getTime() < now.getTime()) {
      continue; // 지난 1회성 기념일은 스킵
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
  const [next, past, users, totalDates, pendingCount, anniversaries] =
    await Promise.all([
      getNextDate(),
      getPastDates(5),
      getActiveUsers(),
      getDoneCount(),
      prisma.user.count({ where: { role: "pending" } }),
      prisma.anniversary.findMany({}),
    ]);
  const isAdmin = me.role === "admin";

  const upcomingAnni = nearestAnniversary(anniversaries);
  const coupleStart = anniversaries.find((a) => a.kind === COUPLE_START_KIND);
  const coupleStartIso = coupleStart
    ? coupleStart.date.toISOString().slice(0, 10)
    : null;
  const dayNo = coupleStartIso ? coupleDayNumber(coupleStartIso) : 0;
  const upcomingMilestone = coupleStartIso
    ? nextMilestone(coupleStartIso)
    : null;

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
      <header className="sticky top-0 z-20 bg-bg/95 backdrop-blur border-b border-fg/15 px-4 pt-3 pb-3 safe-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {bunny ? (
              <Avatar
                user={{ name: bunny.nickname, emoji: bunny.emoji ?? "🐰" }}
                size="sm"
                variant="warm"
              />
            ) : (
              <Avatar user={{ name: "?", emoji: "🐰" }} size="sm" variant="warm" />
            )}
            {fox && (
              <Avatar
                user={{ name: fox.nickname, emoji: fox.emoji ?? "🦊" }}
                size="sm"
                variant="dark"
              />
            )}
            <div className="ml-1">
              <p className="font-display text-base">
                {bunny?.nickname ?? "초대 대기"} & {fox?.nickname ?? "?"}
              </p>
              <p className="text-[11px] text-fg-faint">데이트 {totalDates}회</p>
            </div>
          </div>
          {me ? (
            <div className="flex items-center gap-3">
              {isAdmin && (
                <Link
                  href="/admin"
                  className="text-fg-faint text-sm relative"
                  aria-label="관리자 패널"
                >
                  ⚙
                  {pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-accent text-bg text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-display leading-none">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              )}
              <Link
                href="/settings/profile"
                className="text-fg-faint text-sm"
                aria-label="프로필"
              >
                👤
              </Link>
            </div>
          ) : null}
        </div>
        <div className="flex gap-2 mt-2">
          {bunny && (
            <Pill>
              {bunny.emoji ?? "🐰"} {bunny.avg} ★
            </Pill>
          )}
          {fox && (
            <Pill>
              {fox.emoji ?? "🦊"} {fox.avg} ★
            </Pill>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 py-3 space-y-4 pb-24">
        {next ? (
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
                {next.estimatedCost ? (
                  <Pill className="!border-accent-soft !text-accent-soft">
                    ~ ₩{next.estimatedCost.toLocaleString()}
                  </Pill>
                ) : null}
              </div>
            </Card>
          </Link>
        ) : (
          <Link href="/plan/new" className="block">
            <Card className="!border-dashed !border-accent/50 space-y-1 text-center py-6">
              <p className="text-[11px] tracking-wider uppercase text-fg-faint">
                다음 데이트
              </p>
              <p className="font-display text-base text-accent">
                + 다음 데이트 등록하기
              </p>
              <p className="text-[11px] text-fg-faint">
                계획을 짜고 D-day 시작
              </p>
            </Card>
          </Link>
        )}

        {dayNo > 0 && (
          <Link
            href="/us/saju"
            className="block rounded-card bg-bg-warm/40 border border-fg/15 px-4 py-3 flex items-center gap-3"
          >
            <span className="text-xl shrink-0">🔥</span>
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm">
                용광로 × 무쇠
              </p>
              <p className="text-[11px] text-fg-faint">
                정화연경 · 丁火 × 庚金
              </p>
            </div>
            <span className="font-display text-base text-accent shrink-0">
              {dayNo}일
            </span>
          </Link>
        )}

        {upcomingAnni && (
          <Link
            href="/us"
            className="block rounded-card bg-bg-warm/60 border border-accent/40 px-4 py-3 flex items-center gap-3"
          >
            <span className="text-2xl shrink-0">
              {upcomingAnni.row.emoji ?? "📅"}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm">{upcomingAnni.row.label}</p>
              <p className="text-[11px] text-fg-faint">
                {upcomingAnni.nextDate.toLocaleDateString("ko", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <span className="font-display text-base text-accent shrink-0">
              {upcomingAnni.days === 0
                ? "오늘 ★"
                : `D-${upcomingAnni.days}`}
            </span>
          </Link>
        )}

        {upcomingMilestone && (() => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const days = Math.round(
            (upcomingMilestone.date.getTime() - today.getTime()) / 86400000,
          );
          return (
            <Link
              href="/us"
              className="block rounded-card bg-bg border border-fg/15 px-4 py-3 flex items-center gap-3"
            >
              <span className="text-2xl shrink-0">{upcomingMilestone.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-display text-sm">
                  {upcomingMilestone.label}
                </p>
                <p className="text-[11px] text-fg-faint">
                  {upcomingMilestone.date.toLocaleDateString("ko", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <span className="font-display text-sm text-fg-soft shrink-0">
                {days === 0 ? "오늘 ★" : `D-${days}`}
              </span>
            </Link>
          );
        })()}

        <p className="text-[11px] tracking-widest uppercase text-fg-faint pt-2">
          지난 데이트
        </p>

        <ul className="space-y-3">
          {past.map((d) => {
            const avg = d.reviews.length
              ? d.reviews.reduce((s, r) => s + r.stars, 0) / d.reviews.length
              : 0;
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
                          year: "numeric",
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
