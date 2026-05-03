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

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const me = await requireApproved();
  const [next, past, users, totalDates, pendingCount] = await Promise.all([
    getNextDate(),
    getPastDates(5),
    getActiveUsers(),
    getDoneCount(),
    prisma.user.count({ where: { role: "pending" } }),
  ]);
  const isAdmin = me.role === "admin";

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
                {next.estimatedCost ? (
                  <Pill className="!border-accent-soft !text-accent-soft">
                    ~ ₩{next.estimatedCost.toLocaleString()}
                  </Pill>
                ) : null}
              </div>
            </Card>
          </Link>
        )}

        <p className="text-[11px] tracking-widest uppercase text-fg-faint pt-2">
          최근 데이트
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
