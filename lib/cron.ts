// 일일 알림 스케줄러. instrumentation 에서 setInterval 로 호출 + API 에서 수동 호출.
// dedup 은 NotificationLog (unique[kind, key]) 으로 안전 — 여러 번 불려도 1회만 전송.
import { prisma } from "./db";
import { broadcast } from "./push";

const KST_OFFSET_MS = 9 * 3600 * 1000;

function kstNow(): Date {
  return new Date(Date.now() + KST_OFFSET_MS);
}

// YYYY-MM-DD (KST) 문자열.
function kstDateStr(d: Date = kstNow()): string {
  return d.toISOString().slice(0, 10);
}

// KST 자정 → UTC Date 환산. day=오늘이면 KST 00:00 의 UTC 시각.
function kstMidnightUtc(dateStr: string): Date {
  // dateStr 은 KST 의 YYYY-MM-DD. KST 00:00 = UTC (YYYY-MM-DD)T00:00 - 9h.
  return new Date(new Date(dateStr + "T00:00:00Z").getTime() - KST_OFFSET_MS);
}

type RunResult = {
  ddayChecked: number;
  ddaySent: number;
  anniChecked: number;
  anniSent: number;
};

async function tryLogAndSend(
  kind: string,
  key: string,
  send: () => Promise<void>,
): Promise<boolean> {
  try {
    await prisma.notificationLog.create({
      data: { kind, key },
    });
  } catch {
    return false; // unique violation — 이미 보냄.
  }
  try {
    await send();
    return true;
  } catch (e) {
    console.error(`[cron] send ${kind}/${key}`, e);
    // 전송 실패해도 log 는 남김 — retry 폭주 방지. 사용자가 수동으로 cron 호출 시
    // 같은 key 에 대해 다시 발송하려면 NotificationLog row 삭제 필요.
    return false;
  }
}

export async function runDailyNotifications(): Promise<RunResult> {
  const now = kstNow();
  const todayKst = kstDateStr(now);
  // 내일 KST 자정 ~ 내일+1 KST 자정 사이에 시작하는 데이트 → D-1.
  const tomorrowStartKstStr = (() => {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  })();
  const tomorrowStartUtc = kstMidnightUtc(tomorrowStartKstStr);
  const dayAfterStartUtc = new Date(
    tomorrowStartUtc.getTime() + 24 * 3600 * 1000,
  );

  // ─── 1. D-1 데이트 ───────────────
  const ddayDates = await prisma.date.findMany({
    where: {
      scheduledAt: { gte: tomorrowStartUtc, lt: dayAfterStartUtc },
      status: { not: "cancelled" },
    },
    select: { id: true, number: true, title: true, scheduledAt: true },
  });

  let ddaySent = 0;
  for (const d of ddayDates) {
    const key = `date-${d.id}`;
    const ok = await tryLogAndSend("dday-1", key, async () => {
      await broadcast({
        title: `📅 내일 데이트 #${String(d.number).padStart(2, "0")}`,
        body: d.title,
        url: `/dates/${d.id}`,
        tag: `dday-${d.id}`,
      });
    });
    if (ok) ddaySent++;
  }

  // ─── 2. 기념일 (오늘 KST 와 month/day 일치) ───────────────
  const allAnni = await prisma.anniversary.findMany({});
  const [, yyyyMm, dd] = todayKst.match(/^(\d{4}-\d{2})-(\d{2})$/) ?? [];
  const todayMonthDay = (() => {
    const [m, d] = todayKst.slice(5).split("-");
    return `${m}-${d}`;
  })();
  void yyyyMm; void dd;

  let anniSent = 0;
  for (const a of allAnni) {
    const aMd = a.date.toISOString().slice(5, 10);
    const isAnniToday = a.recurring
      ? aMd === todayMonthDay
      : a.date.toISOString().slice(0, 10) === todayKst;
    if (!isAnniToday) continue;
    const key = `anni-${a.id}-${todayKst}`;
    const ok = await tryLogAndSend("anniversary-morning", key, async () => {
      await broadcast({
        title: `${a.emoji ?? "🎉"} ${a.label}`,
        body: a.recurring
          ? "오늘이에요. 좋은 하루 보내요"
          : "오늘이에요",
        url: "/us",
        tag: `anni-${a.id}`,
      });
    });
    if (ok) anniSent++;
  }

  return {
    ddayChecked: ddayDates.length,
    ddaySent,
    anniChecked: allAnni.length,
    anniSent,
  };
}
