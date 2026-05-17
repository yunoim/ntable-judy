// app/api/plan/parse-past/route.ts — 사용자 한 줄 회상 → 구조화된 코스 (저장 X)
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCurrentUser } from "@/lib/auth";

const SYSTEM_PROMPT = `너는 사용자가 다녀온 데이트를 한 문장이나 짧은 메모로 받아 구조화해주는 비서야.
사용자는 이미 다녀온 일을 회상해 적은 것이므로 추천하지 말고 정리만 한다.

응답은 반드시 아래 JSON 스키마로만. 마크다운 코드블록·다른 텍스트 금지.

{
  "title": "string (짧고 시적, 12자 이내. 그날의 핵심)",
  "subtitle": "string (옵션. 지역+무드. 사용자 메모에서 추출 가능하면)",
  "themeNote": "string (한 줄 회상. 사용자 표현 그대로 따뜻하게 정리)",
  "area": "string (사용자가 말한 지역명. 없으면 빈 문자열)",
  "weather": "rain | sun | cloud | snow (사용자가 명시했으면 그걸로, 없으면 cloud)",
  "stops": [
    {
      "stepOrder": 1,
      "time": "HH:MM 또는 빈 문자열",
      "label": "단계 라벨 (예: 점심 / 카페 / 산책 / 저녁)",
      "options": [
        {
          "emoji": "단일 이모지 (장소 카테고리 기반)",
          "name": "장소명 (사용자가 말한 그대로)",
          "address": "",
          "type": "카페 | 식당 | 전시 | 산책 | 와인바 | 쇼핑 | 기타",
          "description": "사용자가 적은 인상이나 한 줄 회상 (옵션, 없으면 빈 문자열)",
          "mapQuery": "장소명 (네이버 지도 검색용)",
          "estimatedCost": 0
        }
      ]
    }
  ]
}

규칙:
- stops 의 options 는 반드시 정확히 1개. (이미 다녀온 곳이라 후보가 아님)
- 사용자가 장소를 명시 안 했으면 stops 는 빈 배열 [].
- 비용은 "약 4만원" / "4만" / "40,000원" 등을 숫자로 환산 (40000). 없으면 0.
- 시간은 사용자가 명시한 경우만 채우고 없으면 빈 문자열.
- 사용자가 짧게 말해도 그 안에서만 구성. 추가 상상·추천 금지.
- title 은 사용자 메모에서 핵심 키워드를 뽑아 짧고 시적으로.`;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });
  if (!["admin", "approved"].includes(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const text = (body.text ?? "") as string;
  const date = body.date as string | undefined; // YYYY-MM-DD

  if (!text.trim() || text.trim().length < 3) {
    return NextResponse.json({ error: "text_too_short" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({
      course: mockParse(text),
      mock: true,
      message: "ANTHROPIC_API_KEY 미설정 — 데모 응답입니다",
    });
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content:
            `다녀온 날짜: ${date ?? "미정"}\n` +
            `사용자 메모: ${text}\n` +
            `이 메모를 위 스키마로 정리해줘.`,
        },
      ],
    });

    const out = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    const parsed = parseJson(out);
    if (!parsed) {
      return NextResponse.json(
        { error: "parse_failed", raw: out.slice(0, 500) },
        { status: 500 },
      );
    }

    return NextResponse.json({ course: parsed });
  } catch (err) {
    console.error("[parse-past]", err);
    return NextResponse.json(
      { error: "ai_failed", message: (err as Error)?.message },
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

function mockParse(text: string) {
  return {
    title: text.slice(0, 12),
    subtitle: "",
    themeNote: text.slice(0, 60),
    area: "",
    weather: "cloud",
    stops: [],
  };
}
