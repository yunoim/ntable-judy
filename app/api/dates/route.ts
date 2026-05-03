// app/api/dates/route.ts — 데이트 생성 (수동 또는 AI 확정)
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
};

type Body = {
  title?: string;
  subtitle?: string;
  area?: string;
  scheduledAt?: string;
  startTime?: string;
  endTime?: string;
  themeNote?: string;
  weather?: string;
  historyLabel?: string;
  estimatedCost?: number;
  estimatedTotal?: number;
  aiInput?: string;
  stops?: StopInput[];
};

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

  const last = await prisma.date.aggregate({ _max: { number: true } });
  const nextNumber = (last._max.number ?? 0) + 1;

  const scheduledAt = body.scheduledAt
    ? new Date(body.scheduledAt)
    : new Date();
  if (Number.isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: "bad_scheduled_at" }, { status: 400 });
  }

  const created = await prisma.date.create({
    data: {
      number: nextNumber,
      title: body.title.trim(),
      subtitle: body.subtitle?.trim() || null,
      area: (body.area ?? "").trim() || "미정",
      scheduledAt,
      startTime: body.startTime || null,
      endTime: body.endTime || null,
      status: "planned",
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
        })),
      },
    },
  });

  return NextResponse.json({ id: created.id, number: created.number });
}
