// 알림 보류 (2026-05-04). 채팅 기능 도입 시 부활.
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "disabled" }, { status: 410 });
}
export async function DELETE() {
  return NextResponse.json({ error: "disabled" }, { status: 410 });
}

/* === 원래 구현 (보류) ===========================================
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const endpoint = body?.subscription?.endpoint as string | undefined;
  const p256dh = body?.subscription?.keys?.p256dh as string | undefined;
  const auth = body?.subscription?.keys?.auth as string | undefined;
  const userAgent = req.headers.get("user-agent") ?? null;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "bad_subscription" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh, auth, userAgent, userId: user.id },
    update: { p256dh, auth, userAgent, userId: user.id, lastUsedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const endpoint = body?.endpoint as string | undefined;
  if (!endpoint) {
    return NextResponse.json({ error: "no_endpoint" }, { status: 400 });
  }
  await prisma.pushSubscription
    .delete({ where: { endpoint } })
    .catch(() => {});
  return NextResponse.json({ ok: true });
}
=================================================================== */
