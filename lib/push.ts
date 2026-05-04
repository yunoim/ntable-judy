// 알림(Web Push) — 채팅 기능 도입 시 부활 예정 (2026-05-04 보류).
// 부활 시 아래 주석 해제 + .env 의 VAPID_* + sw.js + PushToggle + cron 함께 활성화.

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  tag?: string;
};

export async function sendPushTo(
  _userId: string,
  _payload: PushPayload,
): Promise<{ sent: number; removed: number }> {
  return { sent: 0, removed: 0 };
}

export async function broadcast(
  _payload: PushPayload,
): Promise<{ sent: number; removed: number }> {
  return { sent: 0, removed: 0 };
}

/* === 원래 구현 (보류) ===========================================
import webpush from "web-push";
import { prisma } from "@/lib/db";

let configured = false;
function ensureConfigured() {
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
    } catch (e: any) {
      const status = e?.statusCode;
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
=================================================================== */
