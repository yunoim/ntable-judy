// 하루 한 줄 (DailyEntry) + 스트릭 계산 헬퍼.
import { prisma } from "./db";

const KST_OFFSET_MS = 9 * 3600 * 1000;

export function todayKstStr(now: Date = new Date()): string {
  return new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

function shiftKstDateStr(dateStr: string, deltaDays: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

// 양쪽 사용자 모두 작성한 연속 날짜 수 (오늘 또는 어제부터 거꾸로).
// 양쪽 다 오늘 작성 → 오늘 포함. 둘 중 하나만 작성 → 오늘 미포함.
// 어제도 양쪽 작성이면 어제 포함, 그 이전 날까지 거꾸로 카운트.
export async function computeStreak(
  userAId: string,
  userBId: string,
  today: string = todayKstStr(),
): Promise<number> {
  // 최근 90 일치만 조회 (긴 streak 도 충분).
  const minDate = shiftKstDateStr(today, -90);
  const rows = await prisma.dailyEntry.findMany({
    where: {
      userId: { in: [userAId, userBId] },
      date: { gte: minDate, lte: today },
    },
    select: { userId: true, date: true },
  });
  // date → set of userIds
  const byDate = new Map<string, Set<string>>();
  for (const r of rows) {
    let s = byDate.get(r.date);
    if (!s) {
      s = new Set();
      byDate.set(r.date, s);
    }
    s.add(r.userId);
  }
  // 오늘 양쪽 다 작성했으면 오늘부터, 아니면 어제부터.
  const todaySet = byDate.get(today);
  let cursor =
    todaySet && todaySet.has(userAId) && todaySet.has(userBId)
      ? today
      : shiftKstDateStr(today, -1);
  let streak = 0;
  while (true) {
    const s = byDate.get(cursor);
    if (s && s.has(userAId) && s.has(userBId)) {
      streak++;
      cursor = shiftKstDateStr(cursor, -1);
    } else {
      break;
    }
  }
  return streak;
}
