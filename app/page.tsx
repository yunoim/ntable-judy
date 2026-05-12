// app/page.tsx — 홈 (editorial redesign)
import Link from "next/link";
import {
  Avatar,
  Eyebrow,
  Hero,
  Numeral,
  SectionTitle,
  Stars,
  TabBar,
} from "@/components/ui";
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
      {/* ─── Masthead (compact) ───────────────── */}
      <header className="px-5 pt-4 pb-3 safe-top flex items-center justify-between rise-in">
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

      <main className="flex-1 px-5 pt-3 pb-28 space-y-7">
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
            <Link
              href="/plan/new"
              className="tap lift block editorial-card border-dashed !border-accent/50 px-5 py-7 text-center"
            >
              <p className="text-fg-faint text-[13px]">아직 비어 있어요</p>
              <p className="font-display text-xl text-accent mt-2">
                + 다음 데이트 만들기
              </p>
              <p className="text-[11px] text-fg-faint mt-2">
                계획을 짜면 여기에 D-day가 떠요
              </p>
            </Link>
          </section>
        )}

        {/* ─── 우리 사이 ─────────────────────────── */}
        {(dayNo > 0 || upcomingAnni || upcomingMilestone) && (
          <section className="space-y-3 rise-in rise-in-2">
            <SectionTitle title="우리 사이" />

            {dayNo > 0 && (
              <Link
                href="/us/saju"
                className="tap lift block editorial-card-warm px-5 py-4"
              >
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[11px] text-fg-faint">함께한 날</p>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <Numeral
                        value={dayNo}
                        size="lg"
                        className="text-fg"
                      />
                      <span className="text-fg-soft text-sm">일</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-fg-faint pb-1.5 tracking-wider">
                    사주 보기 →
                  </p>
                </div>
              </Link>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              {upcomingAnni && (
                <Link
                  href="/us"
                  className="tap lift editorial-card px-4 py-3.5 flex flex-col gap-1"
                >
                  <span className="text-base">
                    {upcomingAnni.row.emoji ?? "📅"}
                  </span>
                  <p className="font-display text-sm truncate">
                    {upcomingAnni.row.label}
                  </p>
                  <p className="text-[10px] text-fg-faint">
                    {upcomingAnni.nextDate.toLocaleDateString("ko", {
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-accent font-display text-base mt-auto pt-1">
                    {upcomingAnni.days === 0
                      ? "오늘"
                      : `D-${upcomingAnni.days}`}
                  </p>
                </Link>
              )}
              {upcomingMilestone &&
                (() => {
                  const t = new Date();
                  t.setHours(0, 0, 0, 0);
                  const days = Math.round(
                    (upcomingMilestone.date.getTime() - t.getTime()) / 86400000,
                  );
                  return (
                    <Link
                      href="/us"
                      className="tap lift editorial-card px-4 py-3.5 flex flex-col gap-1"
                    >
                      <span className="text-base">{upcomingMilestone.emoji}</span>
                      <p className="font-display text-sm truncate">
                        {upcomingMilestone.label}
                      </p>
                      <p className="text-[10px] text-fg-faint">
                        {upcomingMilestone.date.toLocaleDateString("ko", {
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                      <p className="text-fg-soft font-display text-base mt-auto pt-1">
                        {days === 0 ? "오늘" : `D-${days}`}
                      </p>
                    </Link>
                  );
                })()}
            </div>
          </section>
        )}

        {/* ─── 지난 데이트 ─────────────────────────── */}
        {past.length > 0 && (
          <section className="space-y-3 rise-in rise-in-3">
            <SectionTitle
              title="지난 데이트"
              hint={`총 ${totalDates}회`}
            />
            <ul className="space-y-3.5">
              {past.map((d, idx) => {
                const avg = d.reviews.length
                  ? d.reviews.reduce((s, r) => s + r.stars, 0) /
                    d.reviews.length
                  : 0;
                const fallback =
                  d.weather === "rain" ? "☔" : null;
                return (
                  <li key={d.id}>
                    <Link
                      href={`/dates/${d.id}`}
                      className="tap flex gap-4 group"
                    >
                      <div className="w-[68px] h-[68px] shrink-0 rounded-[14px] bg-bg-warm border border-fg/8 flex items-center justify-center overflow-hidden">
                        {fallback ? (
                          <span className="text-2xl">{fallback}</span>
                        ) : (
                          <span className="font-display text-[22px] text-fg-soft tabular-nums">
                            {String(d.number).padStart(2, "0")}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col">
                        <p className="font-display text-base truncate group-hover:text-accent transition-colors">
                          {d.title}
                        </p>
                        <p className="text-[11px] text-fg-faint mt-0.5">
                          {new Date(d.scheduledAt).toLocaleDateString("ko", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                          {d.area ? ` · ${d.area}` : ""}
                        </p>
                        <div className="mt-auto pt-1.5">
                          {avg > 0 ? (
                            <Stars n={avg} />
                          ) : (
                            <span className="text-[10px] text-fg-faint">
                              후기 비어 있음
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                    {idx < past.length - 1 && (
                      <div className="dot-rule mt-3.5" />
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </main>

      <Link
        href="/plan/new"
        className="tap fixed bottom-24 right-5 z-30 bg-ink-card text-bg rounded-full w-14 h-14 flex items-center justify-center font-display text-2xl leading-none"
        style={{ boxShadow: "0 6px 16px -6px rgba(44,32,23,0.35), 0 2px 0 rgba(44,32,23,0.1)" }}
        aria-label="데이트 계획 추가"
      >
        +
      </Link>

      <TabBar active="home" />
    </div>
  );
}
