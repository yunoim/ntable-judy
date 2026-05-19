// 일일 알림 수동/외부 트리거. CRON_SECRET 헤더/쿼리 일치 OR admin 세션으로 호출.
// dedup 은 NotificationLog 가 처리 — 같은 날 여러 번 호출돼도 1회만 발송.
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { runDailyNotifications } from "@/lib/cron";

export const dynamic = "force-dynamic";

async function authorize(req: Request): Promise<boolean> {
  const url = new URL(req.url);
  const secretQuery = url.searchParams.get("secret");
  const secretHeader = req.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  if (expected && (secretQuery === expected || secretHeader === expected)) {
    return true;
  }
  const me = await getCurrentUser();
  return me?.role === "admin";
}

export async function GET(req: Request) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: "unauth" }, { status: 401 });
  }
  const result = await runDailyNotifications();
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(req: Request) {
  return GET(req);
}
