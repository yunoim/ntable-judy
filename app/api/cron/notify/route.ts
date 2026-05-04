// 알림 cron 보류 (2026-05-04). 채팅 기능 도입 시 부활.
// Railway 배포는 cron 트리거 자체가 없어 호출 안 됨. 외부 호출 시 410.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ error: "disabled" }, { status: 410 });
}

/* === 원래 구현 (보류) ===========================================
// Vercel Cron 또는 외부 스케줄러로 매일 1회 호출 (KST 09:00 권장).
//
// 보호: Authorization: Bearer <CRON_SECRET>

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { broadcast } from "@/lib/push";
import { computeMilestones } from "@/lib/milestones";
import { COUPLE_START_KIND } from "@/lib/saju";

export const dynamic = "force-dynamic";

function startOfTodayKstUtc(): Date {
  const now = new Date();
  const kstYmd = now.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  return new Date(`${kstYmd}T00:00:00+09:00`);
}

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const today = startOfTodayKstUtc();
  const sent: string[] = [];

  // 1. 다음 데이트 D-1 / 오늘
  const upcomingDates = await prisma.date.findMany({
    where: { status: "planned", scheduledAt: { gte: today } },
    orderBy: { scheduledAt: "asc" },
    take: 5,
  });
  for (const d of upcomingDates) {
    const dd = daysBetween(today, new Date(d.scheduledAt));
    if (dd === 0) {
      const r = await broadcast({
        title: `오늘이에요 ✦ ${d.title}`,
        body: `${d.area}${d.startTime ? ` · ${d.startTime}` : ""}`,
        url: `/dates/${d.id}`,
        tag: `date-${d.id}-today`,
      });
      sent.push(`date-today:${d.id} → ${r.sent}`);
    } else if (dd === 1) {
      const r = await broadcast({
        title: `내일이에요 ${d.title}`,
        body: `D-1 · ${d.area}`,
        url: `/dates/${d.id}`,
        tag: `date-${d.id}-d1`,
      });
      sent.push(`date-d1:${d.id} → ${r.sent}`);
    } else if (dd === 7) {
      const r = await broadcast({
        title: `일주일 남았어요 — ${d.title}`,
        body: `D-7 · ${d.area}`,
        url: `/dates/${d.id}`,
        tag: `date-${d.id}-d7`,
      });
      sent.push(`date-d7:${d.id} → ${r.sent}`);
    }
  }

  // 2. 기념일
  const annis = await prisma.anniversary.findMany();
  for (const a of annis) {
    const target = new Date(a.date);
    target.setHours(0, 0, 0, 0);
    if (a.recurring) {
      target.setFullYear(today.getFullYear());
      if (target.getTime() < today.getTime())
        target.setFullYear(today.getFullYear() + 1);
    }
    const dd = daysBetween(today, target);
    if (dd === 0) {
      const r = await broadcast({
        title: `${a.emoji ?? "✦"} ${a.label}`,
        body: "오늘이에요",
        url: "/us",
        tag: `anni-${a.id}-today`,
      });
      sent.push(`anni-today:${a.id} → ${r.sent}`);
    } else if (dd === 1) {
      const r = await broadcast({
        title: `${a.emoji ?? "✦"} ${a.label} 내일`,
        body: "D-1",
        url: "/us",
        tag: `anni-${a.id}-d1`,
      });
      sent.push(`anni-d1:${a.id} → ${r.sent}`);
    } else if (dd === 7) {
      const r = await broadcast({
        title: `${a.emoji ?? "✦"} ${a.label} 일주일 전`,
        body: "D-7",
        url: "/us",
        tag: `anni-${a.id}-d7`,
      });
      sent.push(`anni-d7:${a.id} → ${r.sent}`);
    }
  }

  // 3. 마일스톤 (만남 N일 / N주년)
  const cs = await prisma.anniversary.findFirst({
    where: { userId: null, kind: COUPLE_START_KIND },
  });
  if (cs) {
    const ms = computeMilestones(cs.date.toISOString(), today);
    for (const m of ms) {
      const dd = daysBetween(today, m.date);
      if (dd === 0) {
        const r = await broadcast({
          title: `${m.emoji} ${m.label}`,
          body: "오늘이에요 ✦",
          url: "/us",
          tag: `mile-${m.key}-today`,
        });
        sent.push(`mile-today:${m.key} → ${r.sent}`);
      } else if (dd === 1) {
        const r = await broadcast({
          title: `${m.emoji} ${m.label} 내일`,
          body: "D-1",
          url: "/us",
          tag: `mile-${m.key}-d1`,
        });
        sent.push(`mile-d1:${m.key} → ${r.sent}`);
      }
    }
  }

  // 4. 타임캡슐 오픈일
  const capsules = await prisma.timeCapsule.findMany({
    where: { opened: false },
  });
  for (const c of capsules) {
    const target = new Date(c.openAt);
    target.setHours(0, 0, 0, 0);
    const dd = daysBetween(today, target);
    if (dd === 0) {
      const r = await broadcast({
        title: `📜 캡슐이 열렸어요 — ${c.title}`,
        body: "지금 함께 열어보기",
        url: "/capsules",
        tag: `capsule-${c.id}`,
      });
      sent.push(`capsule:${c.id} → ${r.sent}`);
    }
  }

  return NextResponse.json({ ok: true, sent });
}
=================================================================== */
