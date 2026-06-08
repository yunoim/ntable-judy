// 데일리 Q&A 질문 풀 — 카테고리 메타와 함께. 같은 카테고리/같은 텍스트가 며칠 안에
// 반복되지 않도록 getOrCreateDailyQuestion 이 필터링.
// 새 질문은 끝에 append, 카테고리 명시 필수. text 는 영구 보존 (DB 저장).

export type Category =
  | "today" // 오늘 — 오늘 일/기분
  | "us" // 우리 — 둘 사이
  | "you" // 너에 대해 — 상대 알기
  | "taste" // 좋아하는 것 — 취향 비교
  | "fantasy" // 상상 — 가정/만약
  | "mundane" // 일상 사소한 — 사물·디테일
  | "mind" // 마음/내면 — 감정·내면
  | "past" // 추억/취향 — 과거 기억
  | "play" // 장난 — 가벼운 놀림/관찰
  | "guess" // 맞춰봐 — 상대가 나를 알아맞히기
  | "future"; // 미래 — 동거/결혼/노후 상상

export type DailyQ = { text: string; cat: Category };

export const DAILY_QUESTIONS: DailyQ[] = [
  // 오늘
  { text: "오늘 가장 좋았던 순간 한 컷은?", cat: "today" },
  { text: "오늘 한 가지 감사한 일은?", cat: "today" },
  { text: "오늘 뜻밖에 웃었던 일은?", cat: "today" },
  { text: "오늘 가장 길게 생각한 것은?", cat: "today" },
  { text: "오늘 점심 뭐 먹었어? 어땠어?", cat: "today" },
  { text: "오늘 본 것 중 예뻤던 거 하나?", cat: "today" },
  { text: "오늘 누가 가장 보고 싶었어?", cat: "today" },
  { text: "오늘 기분을 한 단어로 표현하면?", cat: "today" },

  // 우리
  { text: "너랑 처음 만난 날, 기억나는 한 장면?", cat: "us" },
  { text: "최근에 나한테 고마웠던 거 하나만.", cat: "us" },
  { text: "내가 요즘 자주 하는 행동 중 귀여운 거?", cat: "us" },
  { text: "우리 다음 데이트 어디 가고 싶어?", cat: "us" },
  { text: "함께 가본 곳 중 다시 가고 싶은 곳은?", cat: "us" },
  { text: "우리가 가장 잘 어울리는 순간은 언제야?", cat: "us" },
  { text: "내가 너한테 더 자주 해줬으면 하는 한 가지?", cat: "us" },
  { text: "최근에 내가 한 말 중 기억에 남는 거?", cat: "us" },
  { text: "10년 뒤 우리는 어디서 뭐 하고 있을까?", cat: "us" },
  { text: "우리만의 작은 의식(루틴)을 하나 만든다면?", cat: "us" },
  { text: "내가 너에게 처음 끌렸던 점은?", cat: "us" },
  { text: "처음 사귀던 때랑 지금, 뭐가 가장 달라졌어?", cat: "us" },

  // 너에 대해
  { text: "요즘 가장 좋아하는 노래 한 곡은?", cat: "you" },
  { text: "요즘 빠져있는 게 뭐야?", cat: "you" },
  { text: "어릴 때 별명은? 왜 그렇게 불렸어?", cat: "you" },
  { text: "어렸을 때 가장 행복했던 기억 한 장면?", cat: "you" },
  { text: "지금 보고 싶은 사람 한 명은?", cat: "you" },
  { text: "최근에 본 영화/드라마 중 추천하고 싶은 거?", cat: "you" },
  { text: "스트레스 받을 때 너만의 해소법은?", cat: "you" },
  { text: "다시 학생이 된다면 어떤 동아리 하고 싶어?", cat: "you" },
  { text: "닮고 싶은 사람이 있다면 누구?", cat: "you" },
  { text: "꼭 배워보고 싶은 것 하나?", cat: "you" },

  // 좋아하는 것
  { text: "비 오는 날 vs 눈 오는 날, 어느 쪽?", cat: "taste" },
  { text: "아침형 vs 저녁형, 본인은?", cat: "taste" },
  { text: "지금 먹고 싶은 음식 딱 하나?", cat: "taste" },
  { text: "혼자 있고 싶을 때 가는 장소는?", cat: "taste" },
  { text: "주말에 푹 자거나 vs 일찍 움직이거나?", cat: "taste" },
  { text: "여름 vs 가을, 더 좋아하는 계절은?", cat: "taste" },
  { text: "바다 vs 산?", cat: "taste" },
  { text: "고양이 vs 강아지?", cat: "taste" },
  { text: "도시 vs 시골에서 한 달 살기?", cat: "taste" },
  { text: "혼자 여행 vs 둘이 여행?", cat: "taste" },

  // 상상
  { text: "내일 하루 자유시간 5시간이 주어진다면?", cat: "fantasy" },
  { text: "복권 1억 당첨되면 첫 지출은?", cat: "fantasy" },
  { text: "한 달 휴가 받으면 어디 갈래?", cat: "fantasy" },
  { text: "초능력 하나 가질 수 있다면?", cat: "fantasy" },
  { text: "동물로 환생한다면 뭐가 좋아?", cat: "fantasy" },
  { text: "내일 갑자기 다른 도시에 살게 된다면 어디?", cat: "fantasy" },
  { text: "타임머신 타고 가고 싶은 시기/장소?", cat: "fantasy" },
  { text: "어른이 되기 전의 나에게 한 마디 해준다면?", cat: "fantasy" },
  { text: "10년 전 나에게 한 마디?", cat: "fantasy" },
  { text: "10년 후 나에게 미리 한 마디?", cat: "fantasy" },

  // 일상 사소한
  { text: "오늘 입은 옷에서 가장 좋아하는 한 가지?", cat: "mundane" },
  { text: "오늘 마신 음료 중 베스트는?", cat: "mundane" },
  { text: "지금 책상/방 풍경 한 줄로 묘사하면?", cat: "mundane" },
  { text: "가장 자주 듣는 알람음/벨소리?", cat: "mundane" },
  { text: "최근에 새로 산 것 중 만족스러운 거?", cat: "mundane" },
  { text: "지금 핸드폰 배경화면 뭐야?", cat: "mundane" },
  { text: "오늘 첫 번째로 한 일은?", cat: "mundane" },
  { text: "오늘 마지막에 할 일은?", cat: "mundane" },
  { text: "최근 본 하늘 중 가장 예뻤던 색?", cat: "mundane" },
  { text: "오늘 들었던 노래 중 한 곡만.", cat: "mundane" },

  // 마음/내면
  { text: "최근에 부끄러웠던 작은 실수 하나?", cat: "mind" },
  { text: "요즘 가장 자주 하는 걱정은?", cat: "mind" },
  { text: "지금 가장 기다리는 것은?", cat: "mind" },
  { text: "최근에 누구한테 미안한 마음이 들었어?", cat: "mind" },
  { text: "스스로가 멋있다고 느낀 최근 순간?", cat: "mind" },
  { text: "요즘 잘 안 풀리는 거 하나?", cat: "mind" },
  { text: "포기하고 싶을 때 너를 붙잡는 건?", cat: "mind" },
  { text: "최근에 가장 크게 웃은 게 언제야?", cat: "mind" },
  { text: "오늘 하루 점수를 매긴다면 10점 만점에?", cat: "mind" },
  { text: "오늘의 나, 한 마디 칭찬해준다면?", cat: "mind" },

  // 추억/취향
  { text: "가장 좋아하는 계절 음식?", cat: "past" },
  { text: "어렸을 때 가장 좋아하던 만화/책?", cat: "past" },
  { text: "처음으로 모은 용돈으로 산 것?", cat: "past" },
  { text: "수학여행/MT 중 기억에 남는 한 장면?", cat: "past" },
  { text: "가족 중 가장 닮은 사람 누구야?", cat: "past" },
  { text: "어릴 때 장래희망과 지금, 어느 정도 가까워?", cat: "past" },
  { text: "가장 좋아하는 영화 한 편만 꼽으면?", cat: "past" },
  { text: "마지막으로 운 게 언제야?", cat: "past" },
  { text: "최근에 받은 칭찬 중 가장 기쁜 거?", cat: "past" },
  { text: "다음 생에는 뭘로 태어나고 싶어?", cat: "past" },

  // 커플 만약에 게임 (fantasy)
  { text: "하루 동안 서로 몸이 바뀐다면 제일 먼저 할 일은?", cat: "fantasy" },
  { text: "우리가 60살에 처음 만났다면 사귈 수 있었을까?", cat: "fantasy" },
  { text: "내가 갑자기 반려동물로 변한다면 무슨 동물?", cat: "fantasy" },
  { text: "오늘 당장 해외로 떠나야 한다면 어디 갈래?", cat: "fantasy" },
  { text: "내가 재벌 2세면 어떨 것 같아?", cat: "fantasy" },
  { text: "우리 둘이 유튜브를 시작한다면 어떤 콘텐츠일까?", cat: "fantasy" },
  { text: "내일 지구가 멸망한다면 오늘 뭐 할 거야?", cat: "fantasy" },
  { text: "오늘이 마지막 데이트라면 뭐 하고 싶어?", cat: "fantasy" },
  { text: "우리가 처음 만난 날로 돌아간다면 어떨까?", cat: "fantasy" },
  { text: "내 휴대폰을 하루 동안 쓸 수 있다면 뭐 할 거야?", cat: "fantasy" },

  // 달달하고 설레는 (us)
  { text: "처음 나한테 설렜던 순간이 기억나?", cat: "us" },
  { text: "나를 좋아하게 된 계기가 뭐야?", cat: "us" },
  { text: "내가 가장 예뻐 보이는 순간이 언제야?", cat: "us" },
  { text: "가장 기억에 남는 데이트는?", cat: "us" },
  { text: "나랑 꼭 한번 해보고 싶은 데이트는?", cat: "us" },
  { text: "내가 가장 귀여워 보일 때가 언제야?", cat: "us" },
  { text: "내가 안아줄 때 어떤 기분이야?", cat: "us" },
  { text: "가장 좋아하는 스킨십이 뭐야?", cat: "us" },
  { text: "지금 나한테 가장 듣고 싶은 말 있어?", cat: "us" },
  { text: "오늘 나한테 해주고 싶은 말은?", cat: "us" },

  // 장난치고 싶을 때 (play)
  { text: "나한테 이런 말버릇이 있다? 들킨 거 하나만.", cat: "play" },
  { text: "내가 잘 때 맨날 ○○ 하는 거 알지? ㅋㅋ", cat: "play" },
  { text: "가끔 내가 ○○ 할 때 살짝 킹받지 ㅋㅋ", cat: "play" },
  { text: "동물 중에 내가 닮은 거 딱 하나 골라봐.", cat: "play" },
  { text: "내 얼굴상을 한 단어로 표현하면?", cat: "play" },
  { text: "내가 자주 하는 말 TOP 3는?", cat: "play" },
  { text: "어릴 때 별명 뭐였어? 왜?", cat: "play" },
  { text: "나랑 절대 안 어울리는 직업 있어?", cat: "play" },
  { text: "솔직히 내가 입었던 옷 중에 별로였던 거 있어?", cat: "play" },
  { text: "넌 내가 뭐 할 때 질투 나?", cat: "play" },

  // 나를 맞춰 봐 퀴즈 (guess)
  { text: "내가 기분 좋을 때 자주 하는 행동은?", cat: "guess" },
  { text: "내가 사랑받는다고 느끼는 순간은 언제일 거 같아?", cat: "guess" },
  { text: "내 기분을 풀리게 하는 치트키는 뭘까?", cat: "guess" },
  { text: "내가 연락에서 중요하게 생각하는 건?", cat: "guess" },
  { text: "내가 화났을 때 가장 좋은 대처법은?", cat: "guess" },
  { text: "내가 힘들 때 공감받고 싶어할까, 해결책 듣고 싶어할까?", cat: "guess" },
  { text: "내가 가장 좋아하는 스킨십은 뭘까?", cat: "guess" },
  { text: "내가 혼자 있고 싶을 때는 보통 언제일까?", cat: "guess" },
  { text: "내가 너를 좋아하는 핵심 포인트, 뭐일 거 같아?", cat: "guess" },
  { text: "내가 가장 좋아하는 음식, 맞춰봐.", cat: "guess" },

  // 우리 둘만의 미래 계획 (future)
  { text: "같이 살면 어느 동네가 좋을까?", cat: "future" },
  { text: "나랑 같이 키우고 싶은 반려동물은?", cat: "future" },
  { text: "같이 살면 누가 더 깔끔할 것 같아?", cat: "future" },
  { text: "신혼여행은 어디로 가고 싶어?", cat: "future" },
  { text: "같이 살 때 이것만은 지켜줬으면 하는 거 있어?", cat: "future" },
  { text: "50년 뒤에 우리는 서로를 뭐라고 부를까?", cat: "future" },
  { text: "나중에 가장 그리워할 지금의 모습은 뭐일까?", cat: "future" },
  { text: "아이는 몇 명 낳고 싶어?", cat: "future" },
  { text: "나중에 우리 집 냉장고엔 뭐가 가득할까?", cat: "future" },
  { text: "결혼하면 꼭 해보고 싶은 로망 있어?", cat: "future" },
];

const KST_OFFSET_MS = 9 * 3600 * 1000;

// 결정적 해시: pool 인덱스 결정. dateStr 변경 시만 변경.
function hashIndex(dateStr: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) {
    h = (h * 31 + dateStr.charCodeAt(i)) | 0;
  }
  return ((h % mod) + mod) % mod;
}

function shiftKstDateStr(dateStr: string, deltaDays: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

// DB 없이 fallback. 전체 풀 중 결정적 매핑.
export function pickQuestionForDate(dateStr: string): string {
  const idx = hashIndex(dateStr, DAILY_QUESTIONS.length);
  return DAILY_QUESTIONS[idx].text;
}

// 최근 14일 텍스트 + 최근 3일 카테고리 제외 후 결정적 픽.
// DB read 후 cache hit 이면 그대로 반환 — 이미 결정된 질문 안 바꿈.
export async function getOrCreateDailyQuestion(
  dateStr: string,
  prisma: import("@prisma/client").PrismaClient,
): Promise<string> {
  const fallback = pickQuestionForDate(dateStr);
  try {
    const existed = await prisma.dailyQuestion.findUnique({
      where: { date: dateStr },
    });
    if (existed) return existed.question;

    // 최근 14일치 질문 fetch.
    const from = shiftKstDateStr(dateStr, -14);
    const recent = await prisma.dailyQuestion.findMany({
      where: { date: { gte: from, lt: dateStr } },
      select: { date: true, question: true },
    });
    const byDate = new Map(recent.map((r) => [r.date, r.question]));
    const recentTexts = new Set(recent.map((r) => r.question));

    // 최근 3일 카테고리 — 어제·그저께·그그저께 의 카테고리 회피.
    const recentCats = new Set<Category>();
    for (let i = 1; i <= 3; i++) {
      const d = shiftKstDateStr(dateStr, -i);
      const q = byDate.get(d);
      if (!q) continue;
      const found = DAILY_QUESTIONS.find((item) => item.text === q);
      if (found) recentCats.add(found.cat);
    }

    // 필터: 최근 텍스트 + 최근 카테고리 제외.
    let pool = DAILY_QUESTIONS.filter(
      (q) => !recentTexts.has(q.text) && !recentCats.has(q.cat),
    );
    // 너무 빡빡하면 텍스트만 unique.
    if (pool.length === 0) {
      pool = DAILY_QUESTIONS.filter((q) => !recentTexts.has(q.text));
    }
    // 그래도 없으면 전체.
    if (pool.length === 0) {
      pool = DAILY_QUESTIONS;
    }
    const idx = hashIndex(dateStr, pool.length);
    const chosen = pool[idx].text;

    try {
      await prisma.dailyQuestion.create({
        data: { date: dateStr, question: chosen },
      });
    } catch {
      const again = await prisma.dailyQuestion
        .findUnique({ where: { date: dateStr } })
        .catch(() => null);
      if (again) return again.question;
    }
    return chosen;
  } catch (e) {
    console.error("[daily-question] db error, using fallback", e);
    return fallback;
  }
}

export function todayKstDateStr(now: Date = new Date()): string {
  return new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}
