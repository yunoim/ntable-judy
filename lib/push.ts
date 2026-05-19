// 알림 (Web Push) — 활성. .env 의 VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY 필요.
import webpush from "web-push";
import { prisma } from "@/lib/db";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  tag?: string;
};

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:noreply@ntable.kr";
  if (!pub || !priv) return false;
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
  return true;
}

export async function sendPushTo(
  userId: string,
  payload: PushPayload,
): Promise<{ sent: number; removed: number }> {
  if (!ensureConfigured()) return { sent: 0, removed: 0 };
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  let sent = 0;
  let removed = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
      );
      sent++;
      await prisma.pushSubscription
        .update({
          where: { endpoint: s.endpoint },
          data: { lastUsedAt: new Date() },
        })
        .catch(() => {});
    } catch (e: unknown) {
      const status =
        e && typeof e === "object" && "statusCode" in e
          ? (e as { statusCode: number }).statusCode
          : 0;
      if (status === 410 || status === 404) {
        await prisma.pushSubscription
          .delete({ where: { endpoint: s.endpoint } })
          .catch(() => {});
        removed++;
      }
    }
  }
  return { sent, removed };
}

// 모든 approved 사용자에게 broadcast
export async function broadcast(
  payload: PushPayload,
): Promise<{ sent: number; removed: number }> {
  if (!ensureConfigured()) return { sent: 0, removed: 0 };
  const users = await prisma.user.findMany({
    where: { role: { in: ["admin", "approved"] } },
    select: { id: true },
  });
  let sent = 0;
  let removed = 0;
  for (const u of users) {
    const r = await sendPushTo(u.id, payload);
    sent += r.sent;
    removed += r.removed;
  }
  return { sent, removed };
}

// 자기 자신을 제외한 나머지 (보통 파트너 한 명) 에게만 발송.
// "내가 등록했어요" 알림이 본인에게도 가는 걸 막기 위함.
export async function notifyOthers(
  excludeUserId: string,
  payload: PushPayload,
): Promise<{ sent: number; removed: number }> {
  if (!ensureConfigured()) return { sent: 0, removed: 0 };
  const users = await prisma.user.findMany({
    where: { role: { in: ["admin", "approved"] }, NOT: { id: excludeUserId } },
    select: { id: true },
  });
  let sent = 0;
  let removed = 0;
  for (const u of users) {
    const r = await sendPushTo(u.id, payload);
    sent += r.sent;
    removed += r.removed;
  }
  return { sent, removed };
}
