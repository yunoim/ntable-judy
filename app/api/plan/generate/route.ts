// app/api/plan/generate/route.ts — Claude로 코스 1개 + 단계별 3안 옵션 (저장 X)
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCurrentUser } from "@/lib/auth";

const SYSTEM_PROMPT = `너는 두 사람의 데이트 코스를 짜주는 큐레이터야.
하나의 코스를 짜되, 각 단계마다 3개의 후보 가게(또는 장소)를 제시해.
응답은 반드시 아래 JSON 스키마로만. 다른 텍스트, 마크다운 코드블록 모두 금지.

{
  "title": "string (짧고 시적, 12자 이내)",
  "subtitle": "string (지역+무드, 예: '성수동 봄 산책 코스')",
  "themeNote": "string (한 줄, 따뜻하게)",
  "area": "string (대표 지역명)",
  "weather": "rain | sun | cloud | snow",
  "stops": [
    {
      "stepOrder": 1,
      "time": "HH:MM (24시간)",
      "label": "string (카테고리 라벨, 예: '오후 카페' / '저녁식사' / '산책' / '와인 한 잔')",
      "options": [
        {
          "emoji": "단일 이모지",
          "name": "정확한 가게/장소명",
          "address": "도로명 주소",
          "type": "카페 | 식당 | 전시 | 산책 | 와인바 | 쇼핑 | 기타",
          "description": "1~2문장. 왜 이 장소인지 한 줄 포함",
          "mapQuery": "네이버 지도 검색어 (장소명+지역)",
          "estimatedCost": 0
        }
      ]
    }
  ]
}

규칙:
- stops 단계 3~5개
- 각 단계의 options는 반드시 정확히 3개 (서로 분명히 다른 후보)
  - options[0]: 가장 정석/안전한 첫 추천
  - options[1]: 다른 무드 (가격대 또는 분위기)
  - options[2]: 의외성 (덜 알려진 곳, 컨셉 분명)
- 같은 단계 안의 3개 후보는 type/시간대는 같지만 가게는 다른 식
- 시간 흐름 자연스럽게 (이동 시간 고려, 보통 60~120분 간격)
- weather가 rain이면 실내 위주
- 장소는 실제 검색 가능한 곳 (한국 기준)
- description은 따뜻하고 구체적으로
- 마지막 단계는 "이야기하기 좋은 곳" (와인바, 차분한 카페 등) 우선`;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });
  if (!["admin", "approved"].includes(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const input = (body.input ?? body.prompt) as string | undefined;
  const scheduledAt = body.scheduledAt as string | undefined;

  if (!input || typeof input !== "string" || input.trim().length < 5) {
    return NextResponse.json({ error: "input_too_short" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({
      course: mockCourse(input),
      saved: false,
      mock: true,
      message: "ANTHROPIC_API_KEY 미설정 — 데모 응답입니다",
    });
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 5000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `요청: ${input}\n예정일: ${scheduledAt ?? "미정"}`,
        },
      ],
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    const parsed = parseJson(text);
    if (!parsed || !Array.isArray(parsed.stops)) {
      return NextResponse.json(
        { error: "parse_failed", raw: text.slice(0, 500) },
        { status: 500 },
      );
    }

    return NextResponse.json({ course: parsed, saved: false });
  } catch (err) {
    console.error("[ai generate]", err);
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

function mockCourse(input: string) {
  return {
    title: "데모 코스",
    subtitle: "ANTHROPIC_API_KEY 설정 후 다시 시도",
    themeNote: `요청: "${input.slice(0, 30)}"... (실제 AI 응답이 아닙니다)`,
    area: "성수동",
    weather: "cloud" as const,
    stops: [
      {
        stepOrder: 1,
        time: "14:00",
        label: "오후 카페",
        options: [
          {
            emoji: "☕",
            name: "데모 카페 A",
            address: "서울 성동구",
            type: "카페",
            description: "정석 카페",
            mapQuery: "성수 카페 A",
            estimatedCost: 8000,
          },
          {
            emoji: "🍵",
            name: "데모 차분한 카페 B",
            address: "서울 성동구",
            type: "카페",
            description: "차분한 분위기",
            mapQuery: "성수 카페 B",
            estimatedCost: 10000,
          },
          {
            emoji: "🥐",
            name: "데모 베이커리 C",
            address: "서울 성동구",
            type: "카페",
            description: "빵 잘하는 곳",
            mapQuery: "성수 베이커리 C",
            estimatedCost: 12000,
          },
        ],
      },
      {
        stepOrder: 2,
        time: "18:00",
        label: "저녁식사",
        options: [
          {
            emoji: "🍽️",
            name: "데모 식당 A",
            address: "서울 성동구",
            type: "식당",
            description: "정석 한식",
            mapQuery: "성수 한식 A",
            estimatedCost: 35000,
          },
          {
            emoji: "🍝",
            name: "데모 파스타 B",
            address: "서울 성동구",
            type: "식당",
            description: "분위기 좋은 양식",
            mapQuery: "성수 파스타 B",
            estimatedCost: 45000,
          },
          {
            emoji: "🍜",
            name: "데모 라멘 C",
            address: "서울 성동구",
            type: "식당",
            description: "캐주얼하게",
            mapQuery: "성수 라멘 C",
            estimatedCost: 18000,
          },
        ],
      },
    ],
  };
}
