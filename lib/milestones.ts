// 만남 시작한 날(couple_start) 기반 마일스톤 — DB에 저장하지 않고 매 렌더에서 계산.
// 100일 단위 + N주년 자동 생성.

export type Milestone = {
  key: string; // "d100" | "y1" 등 — 안정적 key
  label: string; // "만남 100일", "1주년"
  emoji: string;
  date: Date; // 마일스톤 일자 (KST 자정 기준)
  daysFromStart: number; // 시작일=1일로 계산한 N
};

const MAX_HUNDRED_STEPS = 50; // 5000일 (~13.7년)까지
const MAX_YEAR_STEPS = 30;

export function computeMilestones(
  startIso: string,
  now: Date = new Date(),
): Milestone[] {
  const start = startOfDay(new Date(startIso));
  const today = startOfDay(now);

  const list: Milestone[] = [];

  // 100일 단위 (100, 200, 300, ...)
  for (let n = 1; n <= MAX_HUNDRED_STEPS; n++) {
    const days = n * 100;
    const d = addDays(start, days - 1); // 시작일=1일째이므로 N일째 = start + (N-1)일
    list.push({
      key: `d${days}`,
      label: `만남 ${days}일`,
      emoji: "💯",
      date: d,
      daysFromStart: days,
    });
  }

  // 주년 (1주년, 2주년, ...)
  for (let y = 1; y <= MAX_YEAR_STEPS; y++) {
    const d = new Date(start);
    d.setFullYear(d.getFullYear() + y);
    list.push({
      key: `y${y}`,
      label: `${y}주년`,
      emoji: "🎉",
      date: d,
      daysFromStart: Math.round((d.getTime() - start.getTime()) / 86400000) + 1,
    });
  }

  // 오늘 기준 ±N 범위 내만 의미있음. 너무 먼 미래는 잘라내고, 과거는 가장 최근 1개만.
  const oneYearMs = 366 * 86400000;
  const upcoming = list
    .filter((m) => m.date.getTime() >= today.getTime())
    .filter((m) => m.date.getTime() - today.getTime() <= oneYearMs)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const recentPast = list
    .filter((m) => m.date.getTime() < today.getTime())
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 1);

  return [...recentPast, ...upcoming];
}

export function nextMilestone(
  startIso: string,
  now: Date = new Date(),
): Milestone | null {
  const today = startOfDay(now);
  const list = computeMilestones(startIso, now);
  const future = list.find((m) => m.date.getTime() >= today.getTime());
  return future ?? null;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}
