// Next.js 가 서버 인스턴스 시작 시 한 번 호출 — 그 안에서 일일 알림 스케줄러를 띄움.
// 5분 간격으로 깨어나, KST 8~9 시 사이의 첫 호출 때만 runDailyNotifications() 실행.
// NotificationLog 가 (kind, key) unique 라 여러 번 깨어나도 중복 발송 X.
//
// 다중 인스턴스 환경 (Railway scale > 1) 으로 가면 동일 시각에 다 깨어나도 NotificationLog
// 의 unique 제약 덕분에 한 인스턴스만 성공. 안전.

export async function register() {
  // edge 런타임 X — Node 만.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // 빌드 시점 / 일부 환경에서 register 가 호출될 수 있음. NODE_ENV production 또는
  // ENABLE_CRON=1 일 때만 활성.
  const enable =
    process.env.NODE_ENV === "production" || process.env.ENABLE_CRON === "1";
  if (!enable) return;

  // Lazy import — Edge 빌드 분석에서 prisma 가 끌려오지 않게.
  const { runDailyNotifications } = await import("./lib/cron");

  const KST_OFFSET_MS = 9 * 3600 * 1000;
  let lastFiredKstDate: string | null = null;

  async function tick() {
    try {
      const kstNow = new Date(Date.now() + KST_OFFSET_MS);
      const hour = kstNow.getUTCHours();
      const dateStr = kstNow.toISOString().slice(0, 10);
      // KST 08~09시 사이에 첫 1회.
      if (hour < 8 || hour >= 10) return;
      if (lastFiredKstDate === dateStr) return;
      lastFiredKstDate = dateStr;
      const r = await runDailyNotifications();
      console.log("[cron] ran", r);
    } catch (e) {
      console.error("[cron] tick error", e);
    }
  }

  // 5분 간격. 첫 호출은 30초 뒤 (server 준비 시간 여유).
  setTimeout(tick, 30_000);
  setInterval(tick, 5 * 60 * 1000);
  console.log("[cron] scheduler registered (5-min poll, KST 08~09 fire)");
}
