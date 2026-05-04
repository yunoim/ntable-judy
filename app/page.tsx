// app/page.tsx — 홈 (editorial redesign)
import Link from "next/link";
import {
  Avatar,
  Card,
  Eyebrow,
  Hero,
  Numeral,
  PhotoSlot,
  Rule,
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

  const today = new Date();
  const issueLabel = today.toLocaleDateString("ko", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen flex flex-col">
      {/* ─── Masthead ─────────────────────────── */}
      <header className="px-5 pt-5 pb-4 safe-top">
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow">judy.ntable</p>
            <p className="font-display text-[28px] leading-none mt-1.5">
              <em className="italic">우리</em>의 기록
            </p>
            <p className="text-[11px] text-fg-faint mt-2 tracking-wider">
              No. {String(totalDates).padStart(2, "0")} · {issueLabel}
            </p>
          </div>
          <div className="flex items-center gap-3 pt-1">
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
        </div>

        {/* couple line */}
        <div className="mt-5 flex items-center gap-3">
          {bunny && (
            <Avatar
              user={{ name: bunny.nickname, emoji: bunny.emoji ?? "🐰" }}
              size="md"
              variant="warm"
            />
          )}
          {fox && (
            <Avatar
              user={{ name: fox.nickname, emoji: fox.emoji ?? "🦊" }}
              size="md"
              variant="dark"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-display text-sm">
              {bunny?.nickname ?? "초대 대기"}{" "}
              <span className="text-fg-faint">×</span>{" "}
              {fox?.nickname ?? "?"}
            </p>
            <p className="text-[10px] text-fg-faint mt-0.5">
              {bunny ? `${bunny.emoji ?? "🐰"} ${bunny.avg}★` : ""}
              {bunny && fox && (
                <span className="mx-1.5 text-fg-faint/50">·</span>
              )}
              {fox ? `${fox.emoji ?? "🦊"} ${fox.avg}★` : ""}
            </p>
          </div>
        </div>
      </header>

      <Rule variant="dot" className="mx-5" />

      <main className="flex-1 px-5 pt-5 pb-28 space-y-7">
        {/* ─── Hero: 다음 데이트 ─────────────────── */}
        {next ? (
          <section className="space-y-3">
            <Eyebrow>序 · 다음 데이트</Eyebrow>
            <Link href={`/dates/${next.id}`} className="block">
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
          <section className="space-y-3">
            <Eyebrow>序 · 다음 데이트</Eyebrow>
            <Link
              href="/plan/new"
              className="block editorial-card border-dashed !border-accent/50 px-5 py-7 text-center"
            >
              <p className="serif-italic text-fg-faint text-sm">unwritten</p>
              <p className="font-display text-xl text-accent mt-2">
                + 다음 데이트 등록
              </p>
              <p className="text-[11px] text-fg-faint mt-2">
                계획을 짜고 D-day 시작
              </p>
            </Link>
          </section>
        )}

        {/* ─── 만남 N일 + 마일스톤 + 기념일 ─────────────── */}
        {(dayNo > 0 || upcomingAnni || upcomingMilestone) && (
          <section className="space-y-3">
            <SectionTitle index="壹" title="우리 사이의 날" hint="counters" />

            {dayNo > 0 && (
              <Link
                href="/us/saju"
                className="block editorial-card-warm px-5 py-4"
              >
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="eyebrow">용광로 × 무쇠</p>
                    <Numeral
                      value={dayNo}
                      size="lg"
                      className="text-fg mt-1"
                    />
                    <p className="serif-italic text-fg-faint text-sm -mt-1">
                      번째 날
                    </p>
                  </div>
                  <p className="text-[10px] text-fg-faint pb-1">
                    丁火 × 庚金 · 정화연경
                  </p>
                </div>
              </Link>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              {upcomingAnni && (
                <Link
                  href="/us"
                  className="editorial-card px-4 py-3.5 flex flex-col gap-1"
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
                      ? "오늘 ★"
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
                      className="editorial-card px-4 py-3.5 flex flex-col gap-1"
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
                        {days === 0 ? "오늘 ★" : `D-${days}`}
                      </p>
                    </Link>
                  );
                })()}
            </div>
          </section>
        )}

        {/* ─── 지난 데이트 ─────────────────────────── */}
        {past.length > 0 && (
          <section className="space-y-3">
            <SectionTitle
              index="貳"
              title="지난 데이트"
              hint={`${totalDates} entries`}
            />
            <ul className="space-y-3.5">
              {past.map((d, idx) => {
                const avg = d.reviews.length
                  ? d.reviews.reduce((s, r) => s + r.stars, 0) /
                    d.reviews.length
                  : 0;
                return (
                  <li key={d.id}>
                    <Link
                      href={`/dates/${d.id}`}
                      className="flex gap-4 group"
                    >
                      <PhotoSlot
                        label="img"
                        className="w-[68px] h-[68px] shrink-0"
                      />
                      <div className="flex-1 min-w-0 flex flex-col">
                        <div className="flex items-baseline gap-2">
                          <span className="serif-italic text-fg-faint text-xs">
                            no.{String(d.number).padStart(2, "0")}
                          </span>
                        </div>
                        <p className="font-display text-base mt-0.5 truncate group-hover:text-accent transition-colors">
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
                            <span className="text-[10px] text-fg-faint serif-italic">
                              아직 후기 없음
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
        className="fixed bottom-24 right-5 z-30 bg-ink-card text-bg rounded-full w-14 h-14 flex items-center justify-center shadow-lg font-display text-xl"
        style={{ boxShadow: "0 4px 0 rgba(44,32,23,0.18)" }}
        aria-label="데이트 계획 추가"
      >
        +
      </Link>

      <TabBar active="home" />
    </div>
  );
}
