// app/api/plan/regenerate-stop/route.ts — 기존 코스 한 stop 만 새 3안으로 재생성.
// 전체 코스를 다시 짜지 않고, 컨텍스트(나머지 stop들 + 원래 요청) 만 주고 한 stop 재추천.
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCurrentUser } from "@/lib/auth";

type StopOption = {
  emoji?: string;
  name: string;
  address?: string;
  type?: string;
  description?: string;
  mapQuery?: string;
  estimatedCost?: number;
};

type StopContext = {
  stepOrder: number;
  time: string;
  label: string;
  // 다른 stop 들의 대표(선택된) option 만 전달 — context 압축.
  chosen?: StopOption;
};

const SYSTEM_PROMPT = `너는 두 사람의 데이트 코스 큐레이터.
이미 짜인 코스의 한 단계만 다시 추천한다.
- 나머지 단계의 분위기/지역/시간 흐름과 어울리도록.
- 이미 그 단계에서 제시됐던 옵션과 겹치지 않는 새 3안.

응답은 반드시 아래 JSON 만, 다른 텍스트/마크다운 금지:
{
  "label": "string (단계 라벨, 보통 그대로)",
  "time": "HH:MM",
  "options": [
    {
      "emoji": "단일 이모지",
      "name": "정확한 가게/장소명",
      "address": "도로명 주소",
      "type": "카페|식당|전시|산책|와인바|쇼핑|기타",
      "description": "1~2문장 따뜻하게",
      "mapQuery": "네이버 지도 검색어",
      "estimatedCost": 0
    }
  ]
}

규칙:
- options 정확히 3개. 서로 분명히 다른 가게/분위기.
- 한국 실제 검색 가능한 장소.
- 비용/시간 흐름 자연스럽게.
- 기존 stops 의 분위기·지역 일관성 유지.`;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });
  if (!["admin", "approved"].includes(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const area: string | undefined = body.area;
  const themeNote: string | undefined = body.themeNote;
  const weather: string | undefined = body.weather;
  const allStops: StopContext[] = Array.isArray(body.stops) ? body.stops : [];
  const targetIndex: number | undefined = body.targetIndex;
  // 그 단계에 이미 제시된 후보들 — 중복 회피.
  const previouslyTried: StopOption[] = Array.isArray(body.previouslyTried)
    ? body.previouslyTried
    : [];

  if (typeof targetIndex !== "number" || targetIndex < 0) {
    return NextResponse.json({ error: "bad_target" }, { status: 400 });
  }
  const target = allStops[targetIndex];
  if (!target) {
    return NextResponse.json({ error: "no_target" }, { status: 400 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "no_api_key" }, { status: 503 });
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const contextLines: string[] = [];
    if (area) contextLines.push(`지역: ${area}`);
    if (themeNote) contextLines.push(`테마: ${themeNote}`);
    if (weather) contextLines.push(`날씨: ${weather}`);
    contextLines.push(`전체 단계 ${allStops.length}개:`);
    allStops.forEach((s, i) => {
      const marker = i === targetIndex ? "▶ 다시 짜기" : "유지";
      const chosen = s.chosen
        ? ` (${s.chosen.name}${s.chosen.type ? "·" + s.chosen.type : ""})`
        : "";
      contextLines.push(
        `- ${i + 1}. ${s.time} ${s.label}${chosen} [${marker}]`,
      );
    });
    if (previouslyTried.length > 0) {
      contextLines.push(
        `이미 제시됐던 후보 (피해서): ${previouslyTried
          .map((o) => o.name)
          .filter(Boolean)
          .join(", ")}`,
      );
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content:
            contextLines.join("\n") +
            `\n\n위 컨텍스트에서 ${targetIndex + 1}번째 단계 (${target.label}) 를 새 3안으로 다시 짜줘.`,
        },
      ],
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");
    const parsed = parseJson(text);
    if (!parsed || !Array.isArray(parsed.options) || parsed.options.length === 0) {
      return NextResponse.json(
        { error: "parse_failed", raw: text.slice(0, 400) },
        { status: 500 },
      );
    }
    return NextResponse.json({ stop: parsed });
  } catch (e) {
    console.error("[regenerate-stop]", e);
    return NextResponse.json(
      { error: "ai_failed", message: (e as Error)?.message },
      { status: 500 },
    );
  }
}

function parseJson(text: string) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last === -1) return null;
  try {
    return JSON.parse(cleaned.slice(first, last + 1));
  } catch {
    return null;
  }
}
