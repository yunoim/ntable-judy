// lib/holidays.ts — 한국 공휴일 (양력/음력 + 대체공휴일).
// 음력 기반 (설/부처님/추석) 은 연도별 표로 명시. 양력 고정은 매년 동일.
// 데이터 출처: 인사혁신처 공휴일 고시 + 한국천문연구원.
// 새 연도는 표에 추가 (없으면 양력 고정만 빨강 처리).

const FIXED: Array<{ m: number; d: number; name: string }> = [
  { m: 1, d: 1, name: "신정" },
  { m: 3, d: 1, name: "삼일절" },
  { m: 5, d: 5, name: "어린이날" },
  { m: 6, d: 6, name: "현충일" },
  { m: 8, d: 15, name: "광복절" },
  { m: 10, d: 3, name: "개천절" },
  { m: 10, d: 9, name: "한글날" },
  { m: 12, d: 25, name: "성탄절" },
];

// 연도별 음력·대체공휴일. m 은 1~12.
const PER_YEAR: Record<number, Array<{ m: number; d: number; name: string }>> = {
  2024: [
    { m: 2, d: 9, name: "설날 연휴" },
    { m: 2, d: 10, name: "설날" },
    { m: 2, d: 11, name: "설날 연휴" },
    { m: 2, d: 12, name: "대체공휴일" },
    { m: 4, d: 10, name: "국회의원 선거일" },
    { m: 5, d: 6, name: "대체공휴일" },
    { m: 5, d: 15, name: "부처님오신날" },
    { m: 9, d: 16, name: "추석 연휴" },
    { m: 9, d: 17, name: "추석" },
    { m: 9, d: 18, name: "추석 연휴" },
    { m: 10, d: 1, name: "국군의 날" },
  ],
  2025: [
    { m: 1, d: 28, name: "설날 연휴" },
    { m: 1, d: 29, name: "설날" },
    { m: 1, d: 30, name: "설날 연휴" },
    { m: 5, d: 5, name: "부처님오신날" },
    { m: 5, d: 6, name: "대체공휴일" },
    { m: 10, d: 5, name: "추석 연휴" },
    { m: 10, d: 6, name: "추석" },
    { m: 10, d: 7, name: "추석 연휴" },
    { m: 10, d: 8, name: "대체공휴일" },
  ],
  2026: [
    { m: 2, d: 16, name: "설날 연휴" },
    { m: 2, d: 17, name: "설날" },
    { m: 2, d: 18, name: "설날 연휴" },
    { m: 3, d: 2, name: "대체공휴일" }, // 삼일절(일) 대체
    { m: 5, d: 24, name: "부처님오신날" },
    { m: 5, d: 25, name: "대체공휴일" }, // 부처님오신날(일) 대체
    { m: 8, d: 17, name: "대체공휴일" }, // 광복절(토) 대체
    { m: 9, d: 24, name: "추석 연휴" },
    { m: 9, d: 25, name: "추석" },
    { m: 9, d: 26, name: "추석 연휴" },
    { m: 9, d: 28, name: "대체공휴일" }, // 추석(토) 대체
    { m: 10, d: 5, name: "대체공휴일" }, // 개천절(토) 대체
  ],
  2027: [
    { m: 2, d: 6, name: "설날 연휴" },
    { m: 2, d: 7, name: "설날" },
    { m: 2, d: 8, name: "설날 연휴" },
    { m: 2, d: 9, name: "대체공휴일" }, // 설날(토) 대체
    { m: 5, d: 13, name: "부처님오신날" },
    { m: 8, d: 16, name: "대체공휴일" }, // 광복절(일) 대체
    { m: 9, d: 14, name: "추석 연휴" },
    { m: 9, d: 15, name: "추석" },
    { m: 9, d: 16, name: "추석 연휴" },
    { m: 10, d: 4, name: "대체공휴일" }, // 개천절(일) 대체
    { m: 10, d: 11, name: "대체공휴일" }, // 한글날(토) 대체
  ],
};

const cacheByYear = new Map<number, Map<string, string>>();

function tableFor(year: number): Map<string, string> {
  const cached = cacheByYear.get(year);
  if (cached) return cached;
  const map = new Map<string, string>();
  for (const h of FIXED) map.set(`${h.m}-${h.d}`, h.name);
  for (const h of PER_YEAR[year] ?? []) map.set(`${h.m}-${h.d}`, h.name);
  cacheByYear.set(year, map);
  return map;
}

// month: 1~12. day: 1~31.
export function holidayName(year: number, month: number, day: number): string | null {
  return tableFor(year).get(`${month}-${day}`) ?? null;
}
