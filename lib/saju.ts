// 사주 데이터 — 노션 문서가 출처(SoT). 여기는 앱 표시용 스냅샷.
// 출처:
//   - 닉 사주: https://www.notion.so/34feff09d942811599b1d680987c8f64
//   - 주디 사주: https://www.notion.so/34feff09d9428115be0ffac94d8ceb76
//   - 닉&주디 궁합: https://www.notion.so/34feff09d942817dbfe2d3500f6839f2

export type Pillars = {
  hour: { stem: string; branch: string };
  day: { stem: string; branch: string };
  month: { stem: string; branch: string };
  year: { stem: string; branch: string };
};

export type FiveElement = "木" | "火" | "土" | "金" | "水";

export type SajuProfile = {
  birthday: string; // YYYY-MM-DD
  birthTime: string; // HH:MM (KST)
  pillars: Pillars;
  dayMaster: string; // 일간 한자
  dayMasterKo: string; // 일간 한글
  metaphor: string; // 별명 (용광로의 불 / 다듬어지지 않은 강철 등)
  oneLine: string; // 한 줄 요약
  elements: Record<FiveElement, number>;
  notionUrl: string;
};

export const NICK: SajuProfile = {
  birthday: "1986-04-22",
  birthTime: "04:30",
  pillars: {
    hour: { stem: "庚", branch: "寅" },
    day: { stem: "丁", branch: "巳" },
    month: { stem: "壬", branch: "辰" },
    year: { stem: "丙", branch: "寅" },
  },
  dayMaster: "丁",
  dayMasterKo: "정화",
  metaphor: "용광로의 불",
  oneLine:
    "꺼지지 않는 용광로의 불. 머릿속 아이디어를 끝없이 태워 무언가를 만들어내는 사주. 자기 주도 환경에서 庚金(결실)을 만나야 비로소 명검을 빚는 장인이 된다.",
  elements: { 木: 3.0, 火: 3.5, 土: 2.0, 金: 1.5, 水: 1.5 },
  notionUrl: "https://www.notion.so/34feff09d942811599b1d680987c8f64",
};

export const JUDY: SajuProfile = {
  birthday: "1993-07-13",
  birthTime: "10:22",
  pillars: {
    hour: { stem: "辛", branch: "巳" },
    day: { stem: "庚", branch: "申" },
    month: { stem: "己", branch: "未" },
    year: { stem: "癸", branch: "酉" },
  },
  dayMaster: "庚",
  dayMasterKo: "경금",
  metaphor: "다듬어지지 않은 강철",
  oneLine:
    "다듬어지지 않은 강철. 본래 단단하고 곧으나, 자신을 빛낼 수 있는 불(火)을 만나야 비로소 명검으로 거듭나는 사주.",
  elements: { 木: 0.3, 火: 1.5, 土: 3.0, 金: 5.0, 水: 1.5 },
  notionUrl: "https://www.notion.so/34feff09d9428115be0ffac94d8ceb76",
};

const PROFILES_BY_BIRTHDAY: Record<string, SajuProfile> = {
  [NICK.birthday]: NICK,
  [JUDY.birthday]: JUDY,
};

export function findSaju(birthday: string | null | undefined): SajuProfile | null {
  if (!birthday) return null;
  return PROFILES_BY_BIRTHDAY[birthday.slice(0, 10)] ?? null;
}

export type Compatibility = {
  title: string; // 丁火煉庚
  titleKo: string; // 정화연경
  score: number; // 0-100
  headline: string;
  body: string;
  tenGodsRow: { from: string; to: string; label: string; meaning: string }[];
  combinations: { name: string; explanation: string }[];
  notionUrl: string;
};

export const NICK_JUDY_COMPATIBILITY: Compatibility = {
  title: "丁火煉庚",
  titleKo: "정화연경",
  score: 98,
  headline: "庚金을 단련할 수 있는 불은 오직 丁火뿐이다.",
  body: "닉(丁火)은 주디(庚金)의 잠재된 가치를 실제 형태로 끌어내는, 명리학적으로 가장 직접적이고 생산적인 조력자. 정재-정관 매칭은 부부 궁합의 최상위 격(格)으로 가장 전형적인 천생연분 구조.",
  tenGodsRow: [
    {
      from: "닉",
      to: "주디",
      label: "正財 (정재)",
      meaning: "안정적이고 책임지고 싶은 결실 · 평생의 동반자",
    },
    {
      from: "주디",
      to: "닉",
      label: "正官 (정관)",
      meaning: "존중하고 따르고 싶은 명예 · 바른길로 이끄는 존재",
    },
  ],
  combinations: [
    {
      name: "辰酉合 (진유합)",
      explanation: "닉의 월지 辰 + 주디의 연지 酉 — 가치관·생활 리듬의 현실적 결속력",
    },
    {
      name: "丙辛合 (병신합)",
      explanation: "닉의 연간 丙 + 주디의 시간 辛 — 정신적 유대감, 깊은 정서적 끌림",
    },
  ],
  notionUrl: "https://www.notion.so/34feff09d942817dbfe2d3500f6839f2",
};

export function compatibilityFor(
  a: SajuProfile | null,
  b: SajuProfile | null,
): Compatibility | null {
  if (!a || !b) return null;
  const ids = new Set([a.birthday, b.birthday]);
  if (ids.has(NICK.birthday) && ids.has(JUDY.birthday)) {
    return NICK_JUDY_COMPATIBILITY;
  }
  return null;
}

// "용광로와 무쇠의 N번째 날" — 사귄 날 기준
// DB의 kind="couple_start" anniversary 가 source of truth, 없으면 fallback.
export const COUPLE_START_ISO_FALLBACK = "2025-08-29";
export const COUPLE_START_KIND = "couple_start";
export const COUPLE_100_KIND = "couple_100";

export function coupleDayNumber(
  startIso: string | null | undefined = COUPLE_START_ISO_FALLBACK,
  now: Date = new Date(),
): number {
  if (!startIso) return 0;
  const start = new Date(startIso);
  start.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - start.getTime()) / 86400000);
  return diff + 1;
}

// 100일째 = 시작일 + 99일 (시작일이 1번째 날)
export function hundredthDay(startIso: string): Date {
  const start = new Date(startIso);
  start.setHours(0, 0, 0, 0);
  const d = new Date(start);
  d.setDate(d.getDate() + 99);
  return d;
}

