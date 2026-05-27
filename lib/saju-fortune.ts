// lib/saju-fortune.ts — 일일/주간 사주 운세 생성 + DB 캐싱.
//   같은 (kind, periodKey) 에 대해 한 번만 Claude 호출. 이후 캐시 hit.
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "./db";
import {
  NICK,
  JUDY,
  NICK_JUDY_COMPATIBILITY,
  type SajuProfile,
} from "./saju";
import { annotateHanja } from "./hanja-annotate";

export type FortuneBody = {
  fox: string;
  bunny: string;
  combined: string;
};

const KST_OFFSET_MS = 9 * 3600 * 1000;

// "YYYY-MM-DD" — KST 기준 오늘.
export function dailyKey(now: Date = new Date()): string {
  return new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

// "week-YYYY-MM-DD" — KST 기준 이번 주 일요일 날짜.
export function weeklyKey(now: Date = new Date()): string {
  const k = new Date(now.getTime() + KST_OFFSET_MS);
  k.setUTCHours(0, 0, 0, 0);
  k.setUTCDate(k.getUTCDate() - k.getUTCDay()); // back to Sunday
  return `week-${k.toISOString().slice(0, 10)}`;
}

function weeklyRangeLabel(periodKey: string): string {
  // "week-YYYY-MM-DD" → "5월 17일 ~ 5월 23일"
  const sun = new Date(periodKey.replace("week-", "") + "T00:00:00Z");
  const sat = new Date(sun);
  sat.setUTCDate(sat.getUTCDate() + 6);
  const fmt = (d: Date) =>
    `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
  return `${fmt(sun)} ~ ${fmt(sat)}`;
}

function dailyLabel(periodKey: string): string {
  const d = new Date(periodKey + "T00:00:00Z");
  const week = ["일", "월", "화", "수", "목", "금", "토"][d.getUTCDay()];
  return `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${week})`;
}

const SYSTEM_PROMPT = `당신은 사주명리에 능통하지만 일상 언어로 말하는 한국어 운세 작가입니다.
두 사람의 명식과 기간(오늘 또는 이번 주)을 받고, 실생활에 와닿는 운세를 써주세요.

규칙:
- fox, bunny 각 3~4문장. combined 2~3문장.
- **추상적/철학적 표현 금지** ("기운이 흐른다", "에너지가 모인다" 같은 말 X).
- 대신 구체적 행동·상황 묘사: "점심은 국물 요리가 좋겠어요", "산책하면 좋은 아이디어가 떠올라요", "오후 3시쯤 짧은 낮잠 추천" 같이.
- 각 운세 끝에 **럭키 포인트 한 줄** 추가: "🍀 오늘의 럭키: 파란색 옷 / 아이스 아메리카노 / 숫자 7" 형식.
- combined 에는 둘이 함께하면 좋을 **구체적 활동** 한 가지 제안: "오늘은 같이 편의점 야식 사러 가보세요" 같이.
- 사주 용어(오행, 천간, 지지)는 **근거로만** 쓰되 본문에 노출 최소화. "火 기운이 강하니까" 대신 "활동적인 하루가 될 거예요".
- 일기 같은 다정한 톤. 부정적 단정 피하고 "~하면 좋겠어요" 식.
- 응답은 JSON 만:
{"fox": "...", "bunny": "...", "combined": "..."}`;

function pillarLines(name: string, p: SajuProfile): string {
  return [
    `[${name}]`,
    `- 일간: ${p.dayMaster} (${p.dayMasterKo}) — ${p.metaphor}`,
    `- 천간: ${p.pillars.year.stem}(년) ${p.pillars.month.stem}(월) ${p.pillars.day.stem}(일) ${p.pillars.hour.stem}(시)`,
    `- 지지: ${p.pillars.year.branch}(년) ${p.pillars.month.branch}(월) ${p.pillars.day.branch}(일) ${p.pillars.hour.branch}(시)`,
    `- 오행: 木 ${p.elements.木} / 火 ${p.elements.火} / 土 ${p.elements.土} / 金 ${p.elements.金} / 水 ${p.elements.水}`,
  ].join("\n");
}

function buildUserPrompt(
  kind: "daily" | "weekly",
  periodLabel: string,
  foxName: string,
  bunnyName: string,
): string {
  return [
    `[기간]`,
    kind === "daily" ? `오늘 — ${periodLabel}` : `이번 주 — ${periodLabel}`,
    ``,
    pillarLines(foxName, NICK),
    ``,
    pillarLines(bunnyName, JUDY),
    ``,
    `[궁합 요약]`,
    NICK_JUDY_COMPATIBILITY.body.split("\n")[0],
    ``,
    `위 명식을 바탕으로 ${kind === "daily" ? "오늘" : "이번 주"} 운세 3개를 JSON 으로 생성:`,
    `- fox (${foxName})`,
    `- bunny (${bunnyName})`,
    `- combined (둘 사이)`,
  ].join("\n");
}

function extractJson(text: string): unknown {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

async function callClaude(
  kind: "daily" | "weekly",
  periodKey: string,
  foxName: string,
  bunnyName: string,
): Promise<FortuneBody> {
  const periodLabel =
    kind === "daily" ? dailyLabel(periodKey) : weeklyRangeLabel(periodKey);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  // 운세는 작문 난이도가 낮아 Haiku 로 충분 (Sonnet 대비 ~5x 저렴).
  const res = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1200,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildUserPrompt(kind, periodLabel, foxName, bunnyName),
      },
    ],
  });
  const text = res.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");
  const parsed = extractJson(text) as Partial<FortuneBody> | null;
  return {
    fox: String(parsed?.fox ?? "").trim() || "오늘은 평온한 흐름이에요.",
    bunny: String(parsed?.bunny ?? "").trim() || "오늘은 평온한 흐름이에요.",
    combined: String(parsed?.combined ?? "").trim() || "둘 사이 무리 없는 하루.",
  };
}

const EMPTY: FortuneBody = {
  fox: "운세를 불러오지 못했어요.",
  bunny: "운세를 불러오지 못했어요.",
  combined: "운세를 불러오지 못했어요.",
};

function withAnnotations(body: FortuneBody): FortuneBody {
  return {
    fox: annotateHanja(body.fox),
    bunny: annotateHanja(body.bunny),
    combined: annotateHanja(body.combined),
  };
}

export async function getOrGenerateFortune(
  kind: "daily" | "weekly",
  periodKey: string,
  foxName: string,
  bunnyName: string,
): Promise<FortuneBody> {
  // DB 캐시 read. SajuFortune 테이블이 아직 적용 전이면 여기서 throw 하므로 try-catch.
  try {
    const existing = await prisma.sajuFortune.findUnique({
      where: { kind_periodKey: { kind, periodKey } },
    });
    if (existing) return withAnnotations(existing.body as FortuneBody);
  } catch (e) {
    console.error("[saju-fortune] cache read failed", e);
    return EMPTY;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      fox: "운세 서비스 미설정 (ANTHROPIC_API_KEY).",
      bunny: "운세 서비스 미설정.",
      combined: "운세 서비스 미설정.",
    };
  }

  let body: FortuneBody;
  try {
    body = await callClaude(kind, periodKey, foxName, bunnyName);
  } catch (e) {
    console.error("[saju-fortune] claude call failed", e);
    return EMPTY;
  }

  // 동시 호출 시 unique 충돌 가능 — 다른 요청이 먼저 저장했다는 뜻이라 무시.
  // 저장은 한자 그대로 (원본). 렌더 직전에 annotate.
  try {
    await prisma.sajuFortune.create({
      data: { kind, periodKey, body: body as unknown as object },
    });
  } catch {
    // ignore (race or schema mismatch)
  }

  return withAnnotations(body);
}
