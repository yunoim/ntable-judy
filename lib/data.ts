// lib/data.ts — types and mock helpers (Claude Code: replace with Prisma queries)

export type User = {
  id: "judy" | "me";
  name: string;
  emoji: string;
};

export type Stop = {
  time: string;            // "14:00"
  name: string;            // "스탠다드오일"
  address: string;         // "성수동2가"
  type: string;            // "카페"
  cost: number;            // 0
  mapQuery: string;        // 네이버 지도 검색어
  reservationUrl?: string;
};

export type DatePlan = {
  stops: Stop[];
  estimatedTotal: number;
  summary: string;
};

export type Review = {
  userId: "judy" | "me";
  stars: number;
  oneLine: string;
};

export type DateRecord = {
  id: string;
  number: number;
  title: string;
  scheduledAt: string;     // ISO
  area: string;
  status: "planned" | "done" | "cancelled";
  estimatedCost?: number;
  plan: DatePlan;
  actualPlan?: DatePlan;
  tags: string[];
  reviews: Review[];
};

export const USERS: Record<"judy" | "me", User> = {
  judy: { id: "judy", name: "주디", emoji: "🐰" },
  me:   { id: "me",   name: "도현", emoji: "🦊" },
};

export const COUPLE_START = new Date("2025-08-29");

export function dDay(target: Date) {
  const ms = target.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function naverMapUrl(query: string) {
  return `https://map.naver.com/p/search/${encodeURIComponent(query)}`;
}

// Mock data — Claude Code: swap for prisma.date.findMany etc.
export const MOCK_DATES: DateRecord[] = [
  {
    id: "d12",
    number: 12,
    title: "성수 산책 + 한식 코스",
    scheduledAt: "2026-05-07T14:00:00+09:00",
    area: "성수동",
    status: "planned",
    estimatedCost: 86000,
    tags: ["봄", "산책"],
    plan: {
      stops: [
        { time: "14:00", name: "스탠다드오일", address: "성수동2가", type: "카페", cost: 0, mapQuery: "스탠다드오일 성수" },
        { time: "16:30", name: "대림창고", address: "성수동", type: "전시", cost: 0, mapQuery: "대림창고 성수" },
        { time: "18:30", name: "을지면옥 성수점", address: "성수역 3분", type: "한식", cost: 42000, mapQuery: "을지면옥 성수", reservationUrl: "https://catchtable.co.kr/" },
        { time: "20:30", name: "포터스 마켓", address: "뚝섬역", type: "와인바", cost: 44000, mapQuery: "포터스 마켓 뚝섬" },
      ],
      estimatedTotal: 86000,
      summary: "성수 카페 → 전시 → 한식 → 와인",
    },
    reviews: [],
  },
  {
    id: "d11",
    number: 11,
    title: "한강 야경",
    scheduledAt: "2026-04-24T19:00:00+09:00",
    area: "여의도",
    status: "done",
    tags: ["야경", "비온뒤", "치맥"],
    plan: {
      stops: [
        { time: "19:00", name: "한강 산책", address: "여의도", type: "산책", cost: 0, mapQuery: "여의도 한강공원" },
        { time: "21:00", name: "치킨집 A", address: "여의도", type: "치맥", cost: 38000, mapQuery: "여의도 치킨" },
      ],
      estimatedTotal: 38000,
      summary: "한강 산책 + 치맥",
    },
    reviews: [
      { userId: "me", stars: 4, oneLine: "바람 셌지만 야경은 진짜였다" },
      { userId: "judy", stars: 5, oneLine: "치맥이 정답이었음" },
    ],
  },
  {
    id: "d10",
    number: 10,
    title: "전시 + 와인",
    scheduledAt: "2026-04-12T15:00:00+09:00",
    area: "한남동",
    status: "done",
    tags: ["전시", "와인"],
    plan: { stops: [], estimatedTotal: 92000, summary: "리움 + 한남 와인바" },
    reviews: [
      { userId: "me", stars: 5, oneLine: "리움 큐레이션 미쳤음" },
      { userId: "judy", stars: 5, oneLine: "와인 너무 잘 골랐어" },
    ],
  },
  {
    id: "d9",
    number: 9,
    title: "비 오는 카페",
    scheduledAt: "2026-03-30T14:00:00+09:00",
    area: "익선동",
    status: "done",
    tags: ["비오는날", "카페"],
    plan: { stops: [], estimatedTotal: 28000, summary: "익선동 한옥카페" },
    reviews: [
      { userId: "me", stars: 3, oneLine: "사람 너무 많았다" },
      { userId: "judy", stars: 4, oneLine: "비 오는 한옥은 못 참지" },
    ],
  },
];

export function avgStars(userId: "judy" | "me"): number {
  const all = MOCK_DATES.flatMap(d => d.reviews).filter(r => r.userId === userId);
  if (!all.length) return 0;
  return Math.round((all.reduce((s, r) => s + r.stars, 0) / all.length) * 10) / 10;
}
