// app/api/dates/route.ts — 데이트 생성 (수동 또는 AI 확정)
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma, renumberDates } from "@/lib/db";
import { notifyOthers } from "@/lib/push";

type StopAlternative = {
  emoji?: string | null;
  name: string;
  address?: string | null;
  type?: string | null;
  description?: string | null;
  mapQuery?: string | null;
  estimatedCost?: number;
};

type StopInput = {
  time: string;
  emoji?: string | null;
  name: string;
  address?: string | null;
  type?: string | null;
  description?: string | null;
  mapQuery?: string | null;
  naverMapUrl?: string | null;
  estimatedCost?: number;
  cost?: number;
  reservationUrl?: string | null;
  reserved?: boolean;
  alternatives?: StopAlternative[] | null;
};

type Body = {
  title?: string;
  subtitle?: string;
  area?: string;
  scheduledAt?: string;
  scheduledEndAt?: string | null;
  startTime?: string;
  endTime?: string;
  themeNote?: string;
  weather?: string;
  historyLabel?: string;
  estimatedCost?: number;
  estimatedTotal?: number;
  aiInput?: string;
  status?: string;
  stops?: StopInput[];
};

const ALLOWED_STATUS = new Set(["planned", "done", "cancelled"]);

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });
  if (!["admin", "approved"].includes(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.title || !body.title.trim()) {
    return NextResponse.json({ error: "title_required" }, { status: 400 });
  }

  // Temporary number to satisfy the @unique constraint; renumberDates() below
  // re-derives the final value from chronological order.
  const last = await prisma.date.aggregate({ _max: { number: true } });
  const tempNumber = (last._max.number ?? 0) + 1;

  const scheduledAt = body.scheduledAt
    ? new Date(body.scheduledAt)
    : new Date();
  if (Number.isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: "bad_scheduled_at" }, { status: 400 });
  }

  let scheduledEndAt: Date | null = null;
  if (body.scheduledEndAt) {
    scheduledEndAt = new Date(body.scheduledEndAt);
    if (Number.isNaN(scheduledEndAt.getTime())) {
      return NextResponse.json({ error: "bad_scheduled_end_at" }, { status: 400 });
    }
    if (scheduledEndAt.getTime() < scheduledAt.getTime()) {
      return NextResponse.json({ error: "end_before_start" }, { status: 400 });
    }
  }

  // 과거 데이트로 입력 시 status="done" 허용 (옵션). 디폴트는 "planned".
  // 프론트가 status 안 보내면 자동 추정: scheduledEndAt(있으면) 또는 scheduledAt이 오늘 이전이면 done.
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const effectiveEnd = scheduledEndAt ?? scheduledAt;
  const requestedStatus = body.status && ALLOWED_STATUS.has(body.status)
    ? body.status
    : effectiveEnd.getTime() < todayStart.getTime()
      ? "done"
      : "planned";

  const created = await prisma.date.create({
    data: {
      number: tempNumber,
      title: body.title.trim(),
      subtitle: body.subtitle?.trim() || null,
      area: (body.area ?? "").trim() || "미정",
      scheduledAt,
      scheduledEndAt,
      startTime: body.startTime || null,
      endTime: body.endTime || null,
      status: requestedStatus,
      themeNote: body.themeNote || null,
      weather: body.weather || null,
      historyLabel: body.historyLabel || body.area || null,
      estimatedCost: body.estimatedCost ?? body.estimatedTotal ?? null,
      aiInput: body.aiInput || null,
      createdById: user.id,
      stops: {
        create: (body.stops ?? []).map((s, i) => ({
          stepOrder: i + 1,
          time: s.time,
          emoji: s.emoji ?? null,
          name: s.name,
          address: s.address ?? null,
          type: s.type ?? null,
          description: s.description ?? null,
          mapQuery: s.mapQuery ?? s.name,
          naverMapUrl: s.naverMapUrl ?? null,
          cost: s.estimatedCost ?? s.cost ?? 0,
          reservationUrl: s.reservationUrl ?? null,
          reserved: s.reserved ?? false,
          alternatives:
            s.alternatives && s.alternatives.length > 0
              ? (s.alternatives as unknown as object)
              : undefined,
        })),
      },
    },
  });

  await renumberDates();

  const final = await prisma.date.findUnique({
    where: { id: created.id },
    select: { number: true },
  });

  // 파트너에게 푸시
  const isPast = requestedStatus === "done";
  notifyOthers(user.id, {
    title: isPast
      ? `📓 ${user.nickname} 이 다녀온 데이트 기록`
      : `✨ ${user.nickname} 이 데이트 계획`,
    body: `#${String(final?.number ?? created.number).padStart(2, "0")} ${created.title}`,
    url: `/dates/${created.id}`,
    tag: `date-${created.id}`,
  }).catch((e) => console.error("[push] date create", e));

  return NextResponse.json({
    id: created.id,
    number: final?.number ?? created.number,
  });
}
