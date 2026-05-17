import Link from "next/link";
import { Suspense } from "react";
import { requireApproved } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Rule, SectionTitle, TabBar } from "@/components/ui";
import {
  findSaju,
  compatibilityFor,
  coupleDayNumber,
  COUPLE_START_KIND,
  type SajuProfile,
} from "@/lib/saju";
import {
  dailyKey,
  weeklyKey,
  getOrGenerateFortune,
} from "@/lib/saju-fortune";

export const dynamic = "force-dynamic";

function PillarCell({
  label,
  stem,
  branch,
  highlight,
}: {
  label: string;
  stem: string;
  branch: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "flex flex-col items-center gap-1 py-3 rounded-card border text-center flex-1 transition-colors",
        highlight
          ? "bg-bg-warm border-accent"
          : "bg-bg border-fg/15",
      ].join(" ")}
    >
      <span className="eyebrow !text-[8px]">{label}</span>
      <span className="font-display text-2xl leading-none mt-0.5">{stem}</span>
      <span className="font-display text-2xl leading-none text-fg-soft">
        {branch}
      </span>
    </div>
  );
}

function ElementBar({
  label,
  value,
  max = 5,
}: {
  label: string;
  value: number;
  max?: number;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-2.5">
      <span className="font-display text-sm w-6 text-fg">{label}</span>
      <div className="flex-1 h-[3px] bg-fg/8 rounded-full overflow-hidden relative">
        <div
          className="h-full bg-accent rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="serif-italic text-fg-faint w-10 text-right text-xs">
        {value.toFixed(1)}
      </span>
    </div>
  );
}

function FortuneCard({
  label,
  emoji,
  body,
  variant = "default",
}: {
  label: string;
  emoji: string;
  body: string;
  variant?: "default" | "warm";
}) {
  return (
    <article
      className={[
        "rounded-card border px-4 py-3.5 space-y-1.5",
        variant === "warm"
          ? "editorial-card-warm"
          : "bg-bg border-fg/12",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <span className="text-base">{emoji}</span>
        <p className="font-display text-sm">{label}</p>
      </div>
      <p className="text-[13px] leading-relaxed text-fg-soft">{body}</p>
    </article>
  );
}

function FortuneSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-card border border-fg/10 bg-bg px-4 py-3.5 space-y-2 animate-pulse"
        >
          <div className="h-3 w-20 bg-fg/10 rounded" />
          <div className="h-3 w-full bg-fg/8 rounded" />
          <div className="h-3 w-5/6 bg-fg/8 rounded" />
        </div>
      ))}
    </div>
  );
}

async function FortuneSection({
  kind,
  fox,
  bunny,
}: {
  kind: "daily" | "weekly";
  fox: { nickname: string; emoji: string | null };
  bunny: { nickname: string; emoji: string | null };
}) {
  const key = kind === "daily" ? dailyKey() : weeklyKey();
  const body = await getOrGenerateFortune(
    kind,
    key,
    fox.nickname,
    bunny.nickname,
  );
  return (
    <div className="space-y-2">
      <FortuneCard
        label="둘 사이"
        emoji="💑"
        body={body.combined}
        variant="warm"
      />
      <FortuneCard
        label={fox.nickname}
        emoji={fox.emoji ?? "🦊"}
        body={body.fox}
      />
      <FortuneCard
        label={bunny.nickname}
        emoji={bunny.emoji ?? "🐰"}
        body={body.bunny}
      />
    </div>
  );
}

function SajuCard({
  saju,
  nickname,
  emoji,
  index,
}: {
  saju: SajuProfile;
  nickname: string;
  emoji: string | null;
  index: string;
}) {
  const elementOrder: Array<keyof typeof saju.elements> = [
    "木",
    "火",
    "土",
    "金",
    "水",
  ];
  return (
    <article className="editorial-card relative px-5 py-5 space-y-4">
      <span className="corner-mark">{index}</span>
      <header className="flex items-center gap-3">
        <span className="text-3xl">{emoji ?? "👤"}</span>
        <div className="flex-1 min-w-0">
          <p className="font-display text-lg leading-tight">
            {nickname}
          </p>
          <p className="text-[11px] text-fg-faint mt-0.5">
            {saju.birthday} · {saju.birthTime}
          </p>
        </div>
        <div className="text-right">
          <p className="eyebrow !text-[9px]">일간</p>
          <p className="font-display text-2xl leading-none mt-0.5">
            {saju.dayMaster}
          </p>
        </div>
      </header>

      <Rule variant="dot" />

      <p className="serif-italic text-fg text-sm">
        “{saju.metaphor}”
      </p>

      <div className="flex gap-1.5">
        <PillarCell
          label="시"
          stem={saju.pillars.hour.stem}
          branch={saju.pillars.hour.branch}
        />
        <PillarCell
          label="일"
          stem={saju.pillars.day.stem}
          branch={saju.pillars.day.branch}
          highlight
        />
        <PillarCell
          label="월"
          stem={saju.pillars.month.stem}
          branch={saju.pillars.month.branch}
        />
        <PillarCell
          label="연"
          stem={saju.pillars.year.stem}
          branch={saju.pillars.year.branch}
        />
      </div>

      <div className="space-y-2 pt-1">
        <p className="eyebrow">오행 분포</p>
        {elementOrder.map((el) => (
          <ElementBar key={el} label={el} value={saju.elements[el]} />
        ))}
      </div>

      <p className="text-[11px] text-fg-soft leading-relaxed pt-1">
        {saju.oneLine}
      </p>

      <a
        href={saju.notionUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[11px] text-accent underline"
      >
        노션 단독 분석 보고서 →
      </a>
    </article>
  );
}

export default async function SajuPage() {
  await requireApproved();

  const users = await prisma.user.findMany({
    where: { role: { in: ["admin", "approved"] } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      nickname: true,
      emoji: true,
      role: true,
      partner: true,
      birthday: true,
      birthTime: true,
    },
  });

  const fox = users.find((u) => u.role === "admin") ?? users[0];
  const partner = users.find((u) => u.partner && u.id !== fox?.id);
  const bunny =
    partner ??
    users.find((u) => u.role === "approved" && u.id !== fox?.id);

  const foxBirthday = fox?.birthday
    ? fox.birthday.toISOString().slice(0, 10)
    : null;
  const bunnyBirthday = bunny?.birthday
    ? bunny.birthday.toISOString().slice(0, 10)
    : null;

  const foxSaju = findSaju(foxBirthday);
  const bunnySaju = findSaju(bunnyBirthday);
  const compat = compatibilityFor(foxSaju, bunnySaju);
  const coupleStart = await prisma.anniversary.findFirst({
    where: { userId: null, kind: COUPLE_START_KIND },
  });
  const coupleStartIso = coupleStart
    ? coupleStart.date.toISOString().slice(0, 10)
    : null;
  const dayNo = coupleStartIso ? coupleDayNumber(coupleStartIso) : 0;

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 px-5 pt-6 safe-top pb-28 space-y-7">
        {/* 메타: 정/경 × 함께한 날 (얇은 한 줄). 정적 내용은 단독 사주 섹션에 이미 들어 있으므로 비중 최소화. */}
        <section className="flex items-baseline justify-between gap-3 -mt-1">
          <p className="text-[11px] text-fg-faint serif-italic">
            丁火 × 庚金
          </p>
          {dayNo > 0 && (
            <p className="text-[11px] text-fg-soft">
              <span className="font-display text-fg">{dayNo}</span>
              <span className="text-fg-faint ml-1">번째 날</span>
            </p>
          )}
        </section>

        {/* 일일/주간 운세 — Claude 생성 + DB 캐싱 */}
        {fox && bunny && foxSaju && bunnySaju && (
          <>
            <section className="space-y-3">
              <SectionTitle index={1} title="오늘의 운세" hint="daily" />
              <Suspense fallback={<FortuneSkeleton />}>
                <FortuneSection
                  kind="daily"
                  fox={{ nickname: fox.nickname, emoji: fox.emoji }}
                  bunny={{ nickname: bunny.nickname, emoji: bunny.emoji }}
                />
              </Suspense>
            </section>
            <section className="space-y-3">
              <SectionTitle index={2} title="이번 주 운세" hint="weekly" />
              <Suspense fallback={<FortuneSkeleton />}>
                <FortuneSection
                  kind="weekly"
                  fox={{ nickname: fox.nickname, emoji: fox.emoji }}
                  bunny={{ nickname: bunny.nickname, emoji: bunny.emoji }}
                />
              </Suspense>
            </section>
          </>
        )}

        {/* 궁합 카드 */}
        {compat && (
          <section className="space-y-3">
            <SectionTitle index={3} title="궁합" hint="compatibility" />
            <article className="editorial-card-warm relative px-5 py-5 space-y-4">
              <span className="corner-mark">No.01</span>
              <header className="flex items-baseline justify-between gap-3">
                <div>
                  <p className="font-display text-2xl">{compat.title}</p>
                  <p className="serif-italic text-fg-soft text-sm">
                    {compat.titleKo}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-display text-5xl text-accent leading-none">
                    {compat.score}
                  </span>
                  <span className="serif-italic text-fg-faint text-xs ml-1">
                    /100
                  </span>
                </div>
              </header>

              <Rule variant="dot" />

              <p className="text-sm leading-relaxed text-fg-soft">
                {compat.body}
              </p>

              <div className="space-y-2.5 pt-1">
                {compat.tenGodsRow.map((g) => (
                  <div
                    key={`${g.from}-${g.to}`}
                    className="flex items-baseline gap-3"
                  >
                    <span className="serif-italic text-fg-faint text-xs shrink-0 w-16">
                      {g.from} → {g.to}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-sm">{g.label}</p>
                      <p className="text-[11px] text-fg-soft">{g.meaning}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <p className="eyebrow mb-1.5">합 (合)</p>
                <div className="space-y-1">
                  {compat.combinations.map((c) => (
                    <p key={c.name} className="text-[11px] text-fg-soft">
                      <span className="font-display text-fg">{c.name}</span>
                      {"  "}— {c.explanation}
                    </p>
                  ))}
                </div>
              </div>

              <a
                href={compat.notionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-accent underline"
              >
                노션 궁합 보고서 →
              </a>
            </article>
          </section>
        )}

        {/* 단독 사주 */}
        {(fox || bunny) && (
          <section className="space-y-3">
            <SectionTitle index={4} title="단독 사주" hint="profiles" />
            <div className="space-y-3">
              {fox && foxSaju && (
                <SajuCard
                  saju={foxSaju}
                  nickname={fox.nickname}
                  emoji={fox.emoji}
                  index="No.01"
                />
              )}
              {bunny && bunnySaju && (
                <SajuCard
                  saju={bunnySaju}
                  nickname={bunny.nickname}
                  emoji={bunny.emoji}
                  index="No.02"
                />
              )}
            </div>
          </section>
        )}

        {(!foxSaju || !bunnySaju) && (
          <section className="editorial-card px-5 py-4 space-y-2 text-xs text-fg-soft">
            <p className="font-display text-sm">사주 데이터가 부족해요</p>
            {!foxBirthday && fox && (
              <p>
                · {fox.nickname} 생일 미입력 —{" "}
                <Link href="/settings/profile" className="text-accent underline">
                  프로필
                </Link>
              </p>
            )}
            {!bunnyBirthday && bunny && (
              <p>
                · {bunny.nickname} 생일 미입력 —{" "}
                <Link href="/settings/profile" className="text-accent underline">
                  프로필
                </Link>
              </p>
            )}
            {foxBirthday && !foxSaju && fox && (
              <p>
                · {fox.nickname}({foxBirthday}) 분석 노션에 없음 —{" "}
                <code className="bg-bg-warm/50 px-1 rounded text-[10px]">
                  lib/saju.ts
                </code>{" "}
                에 추가 필요
              </p>
            )}
            {bunnyBirthday && !bunnySaju && bunny && (
              <p>
                · {bunny.nickname}({bunnyBirthday}) 분석 노션에 없음 —{" "}
                <code className="bg-bg-warm/50 px-1 rounded text-[10px]">
                  lib/saju.ts
                </code>{" "}
                에 추가 필요
              </p>
            )}
          </section>
        )}

        {/* Sources */}
        <section className="space-y-2 pt-1">
          <SectionTitle index={5} title="출처" hint="notion" />
          <div className="space-y-1.5 px-1">
            <a
              href="https://www.notion.so/34feff09d942817dbfe2d3500f6839f2"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-[11px] text-fg-soft hover:text-accent transition-colors"
            >
              <span className="serif-italic text-fg-faint">∙</span>{" "}
              💎 닉 & 주디 사주 궁합 보고서
            </a>
            <a
              href="https://www.notion.so/34feff09d942811599b1d680987c8f64"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-[11px] text-fg-soft hover:text-accent transition-colors"
            >
              <span className="serif-italic text-fg-faint">∙</span>{" "}
              🔥 닉 사주 단독 분석
            </a>
            <a
              href="https://www.notion.so/34feff09d9428115be0ffac94d8ceb76"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-[11px] text-fg-soft hover:text-accent transition-colors"
            >
              <span className="serif-italic text-fg-faint">∙</span>{" "}
              🌙 주디 사주 단독 분석
            </a>
          </div>
          <p className="serif-italic text-[10px] text-fg-faint pt-2 px-1">
            만세력 · 명리학 고전(궁통보감, 적천수) 해석
          </p>
        </section>
      </main>

      <TabBar active="saju" />
    </div>
  );
}
