import Link from "next/link";
import { requireApproved } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TabBar, Card, Pill } from "@/components/ui";
import {
  findSaju,
  compatibilityFor,
  coupleDayNumber,
  COUPLE_START_KIND,
  type SajuProfile,
} from "@/lib/saju";

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
        "flex flex-col items-center gap-1 py-2 rounded-card border text-center flex-1",
        highlight
          ? "bg-bg-warm border-accent"
          : "bg-bg border-fg/15",
      ].join(" ")}
    >
      <span className="text-[9px] tracking-widest uppercase text-fg-faint">
        {label}
      </span>
      <span className="font-display text-2xl leading-none">{stem}</span>
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
    <div className="flex items-center gap-2">
      <span className="font-display text-xs w-5">{label}</span>
      <div className="flex-1 h-1.5 bg-bg-warm rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-fg-faint w-7 text-right">
        {value.toFixed(1)}
      </span>
    </div>
  );
}

function SajuCard({
  saju,
  nickname,
  emoji,
}: {
  saju: SajuProfile;
  nickname: string;
  emoji: string | null;
}) {
  const elementOrder: Array<keyof typeof saju.elements> = [
    "木",
    "火",
    "土",
    "金",
    "水",
  ];
  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{emoji ?? "👤"}</span>
        <div className="flex-1 min-w-0">
          <p className="font-display text-base">{nickname}</p>
          <p className="text-[10px] text-fg-faint">
            {saju.birthday} {saju.birthTime} · 일간 {saju.dayMaster}{" "}
            {saju.dayMasterKo} · {saju.metaphor}
          </p>
        </div>
      </div>

      <div className="flex gap-1.5">
        <PillarCell label="시" stem={saju.pillars.hour.stem} branch={saju.pillars.hour.branch} />
        <PillarCell
          label="일"
          stem={saju.pillars.day.stem}
          branch={saju.pillars.day.branch}
          highlight
        />
        <PillarCell label="월" stem={saju.pillars.month.stem} branch={saju.pillars.month.branch} />
        <PillarCell label="연" stem={saju.pillars.year.stem} branch={saju.pillars.year.branch} />
      </div>

      <div className="space-y-1.5">
        {elementOrder.map((el) => (
          <ElementBar key={el} label={el} value={saju.elements[el]} />
        ))}
      </div>

      <p className="text-xs text-fg-soft italic leading-relaxed">
        {saju.oneLine}
      </p>

      <a
        href={saju.notionUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-[11px] text-accent underline"
      >
        노션에서 전체 분석 보기 →
      </a>
    </Card>
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
      <header className="sticky top-0 z-10 bg-bg/95 backdrop-blur border-b border-fg/15 px-4 pt-4 pb-3 safe-top flex items-center justify-between">
        <Link href="/us" className="text-sm text-fg-faint">
          ← 우리
        </Link>
        <p className="font-display text-base">
          <em className="italic text-accent">사주</em> · 궁합
        </p>
        <span className="w-12" />
      </header>

      <main className="flex-1 px-4 py-4 pb-24 space-y-4">
        <Card variant="dark" className="space-y-1">
          <p className="text-[10px] tracking-widest uppercase text-accent-soft">
            용광로 × 무쇠
          </p>
          <p className="font-display text-2xl text-bg">
            {dayNo > 0 ? `${dayNo}번째 날` : "사귀기 전"}
          </p>
          <p className="text-[11px] text-accent-soft">
            정화연경 · 丁火가 庚金을 단련하는 날들
          </p>
        </Card>

        {compat && (
          <Card variant="warm" className="space-y-2">
            <div className="flex items-baseline justify-between">
              <p className="font-display text-lg">
                {compat.title}{" "}
                <span className="text-fg-soft text-sm">({compat.titleKo})</span>
              </p>
              <p className="font-display text-2xl text-accent">
                {compat.score}
                <span className="text-xs text-fg-soft"> / 100</span>
              </p>
            </div>
            <p className="text-sm italic text-fg-soft">&ldquo;{compat.headline}&rdquo;</p>
            <p className="text-xs leading-relaxed">{compat.body}</p>
            <div className="space-y-1.5 pt-2">
              {compat.tenGodsRow.map((g) => (
                <div key={`${g.from}-${g.to}`} className="flex gap-2 text-[11px]">
                  <span className="text-fg-faint shrink-0">
                    {g.from} → {g.to}
                  </span>
                  <span className="font-display">{g.label}</span>
                  <span className="text-fg-soft truncate">— {g.meaning}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-1.5 flex-wrap pt-1">
              {compat.combinations.map((c) => (
                <Pill key={c.name} className="!text-[10px]">
                  {c.name}
                </Pill>
              ))}
            </div>
            <a
              href={compat.notionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-[11px] text-accent underline pt-1"
            >
              노션 궁합 보고서 전체 보기 →
            </a>
          </Card>
        )}

        {fox && foxSaju && (
          <SajuCard saju={foxSaju} nickname={fox.nickname} emoji={fox.emoji} />
        )}
        {bunny && bunnySaju && (
          <SajuCard saju={bunnySaju} nickname={bunny.nickname} emoji={bunny.emoji} />
        )}

        {(!foxSaju || !bunnySaju) && (
          <Card className="text-xs text-fg-soft space-y-2">
            <p className="font-display text-sm">
              사주 데이터가 부족해요
            </p>
            {!foxBirthday && fox && (
              <p>
                · {fox.nickname} 생일 미입력 —{" "}
                <Link href="/settings/profile" className="text-accent underline">
                  프로필에서 추가
                </Link>
              </p>
            )}
            {!bunnyBirthday && bunny && (
              <p>
                · {bunny.nickname} 생일 미입력 —{" "}
                <Link href="/settings/profile" className="text-accent underline">
                  프로필에서 추가
                </Link>
              </p>
            )}
            {foxBirthday && !foxSaju && fox && (
              <p>
                · {fox.nickname}({foxBirthday}) 사주 분석이 노션에 없어요. 분석을 만들어 <code className="bg-bg-warm/50 px-1 rounded">lib/saju.ts</code>에 추가해 주세요.
              </p>
            )}
            {bunnyBirthday && !bunnySaju && bunny && (
              <p>
                · {bunny.nickname}({bunnyBirthday}) 사주 분석이 노션에 없어요. 분석을 만들어 <code className="bg-bg-warm/50 px-1 rounded">lib/saju.ts</code>에 추가해 주세요.
              </p>
            )}
          </Card>
        )}

        <Card className="space-y-1.5 text-[11px] text-fg-soft">
          <p className="font-display text-xs text-fg">출처 · 노션 보고서</p>
          <a
            href="https://www.notion.so/34feff09d942817dbfe2d3500f6839f2"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-accent underline"
          >
            💎 닉 & 주디 사주 궁합 보고서
          </a>
          <a
            href="https://www.notion.so/34feff09d942811599b1d680987c8f64"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-accent underline"
          >
            🔥 닉 사주 단독 분석 보고서
          </a>
          <a
            href="https://www.notion.so/34feff09d9428115be0ffac94d8ceb76"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-accent underline"
          >
            🌙 주디 사주 단독 분석 보고서
          </a>
          <p className="text-[10px] text-fg-faint italic pt-1">
            만세력 기반 정밀 계산 + 명리학 고전(궁통보감, 적천수) 해석
          </p>
        </Card>
      </main>

      <TabBar active="us" />
    </div>
  );
}
