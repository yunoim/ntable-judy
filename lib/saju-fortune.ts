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

const SYSTEM_PROMPT = `당신은 사주명리(子平)에 능통한 한국어 운세 작가입니다.
두 사람의 명식과 주어진 기간(오늘 또는 이번 주)을 받고, 그 기간의 운세를 따뜻하고 문학적인 한국어로 짧게 써주세요.

규칙:
- 각 운세 2~3 문장. 너무 일반적이지 말고, 그 기간의 일진/주운과 두 사람 일간·오행을 근거로 구체적으로.
- 점쟁이 톤 금지. 일기 같은 차분한 톤.
- 부정적/단정적 예언 피함. "오늘은 ~한 흐름이 있어요" 같이 부드럽게.
- combined 는 두 사람의 관계 관점 (대화·휴식·소통·맞춤 같은 결).
- 응답은 JSON 만, 다른 텍스트·마크다운 금지:
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
