// app/api/plan/generate/route.ts — Claude로 코스 생성 + DB 저장
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const client = new Anthropic();

const SYSTEM = `당신은 서울 데이트 코스 플래너입니다. 사용자 요청을 받아 시간순 코스를 JSON으로만 출력합니다.
형식 (JSON 외 텍스트 금지):
{
  "title": "성수 산책 + 한식",
  "area": "성수동",
  "stops": [
    { "time": "14:00", "name": "...", "address": "...", "type": "카페|식당|전시|산책|...", "cost": 0, "mapQuery": "네이버지도 검색어", "reservationUrl": null }
  ],
  "estimatedTotal": 86000,
  "summary": "한 줄 요약"
}
- 일반적인 상호 위주, 할루시네이션 주의.
- 동선 효율적으로.
- mapQuery는 네이버 지도에 그대로 검색 가능한 문자열.`;

type ParsedStop = {
  time: string;
  name: string;
  address?: string;
  type?: string;
  cost?: number;
  mapQuery: string;
  reservationUrl?: string | null;
};

type Parsed = {
  title?: string;
  area?: string;
  stops: ParsedStop[];
  estimatedTotal?: number;
  summary?: string;
};

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });
  if (!["admin", "approved"].includes(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { prompt } = await req.json();
  if (!prompt?.trim()) {
    return NextResponse.json({ error: "empty_prompt" }, { status: 400 });
  }

  const msg = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2048,
    system: SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });

  const text = msg.content[0]?.type === "text" ? msg.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return NextResponse.json(
      { error: "parse_failed", raw: text },
      { status: 500 },
    );
  }

  let parsed: Parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return NextResponse.json(
      { error: "parse_failed", raw: text },
      { status: 500 },
    );
  }

  const max = await prisma.date.aggregate({ _max: { number: true } });
  const nextNumber = (max._max.number ?? 0) + 1;

  const date = await prisma.date.create({
    data: {
      number: nextNumber,
      title: parsed.title ?? "새 데이트",
      area: parsed.area ?? "",
      scheduledAt: new Date(),
      status: "planned",
      estimatedCost: parsed.estimatedTotal,
      summary: parsed.summary,
      aiInput: prompt,
      aiResponseRaw: text,
      createdById: user.id,
    },
  });

  if (parsed.stops?.length) {
    await prisma.stop.createMany({
      data: parsed.stops.map((s, idx) => ({
        dateId: date.id,
        stepOrder: idx + 1,
        time: s.time,
        name: s.name,
        address: s.address ?? null,
        type: s.type ?? null,
        cost: s.cost ?? 0,
        mapQuery: s.mapQuery ?? s.name,
        reservationUrl: s.reservationUrl ?? null,
      })),
    });
  }

  return NextResponse.json({ id: date.id });
}
