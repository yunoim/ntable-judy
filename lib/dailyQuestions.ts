// 데일리 Q&A 질문 풀. 너무 무겁지도 가볍지도 않은, 짧게 답해도 되는 대화 trigger 류.
// 새 질문은 끝에 append 만 — 인덱스 변경 X (pool 변경 후에도 결정적 매핑 유지 보장 X,
// 그래서 DailyQuestion 테이블에 영구 보존하는 거).
export const DAILY_QUESTIONS: string[] = [
  // 오늘
  "오늘 가장 좋았던 순간 한 컷은?",
  "오늘 한 가지 감사한 일은?",
  "오늘 뜻밖에 웃었던 일은?",
  "오늘 가장 길게 생각한 것은?",
  "오늘 점심 뭐 먹었어? 어땠어?",
  "오늘 본 것 중 예뻤던 거 하나?",
  "오늘 누가 가장 보고 싶었어?",
  "오늘 기분을 한 단어로 표현하면?",

  // 우리
  "너랑 처음 만난 날, 기억나는 한 장면?",
  "최근에 나한테 고마웠던 거 하나만.",
  "내가 요즘 자주 하는 행동 중 귀여운 거?",
  "우리 다음 데이트 어디 가고 싶어?",
  "함께 가본 곳 중 다시 가고 싶은 곳은?",
  "우리가 가장 잘 어울리는 순간은 언제야?",
  "내가 너한테 더 자주 해줬으면 하는 한 가지?",
  "최근에 내가 한 말 중 기억에 남는 거?",
  "10년 뒤 우리는 어디서 뭐 하고 있을까?",
  "우리만의 작은 의식(루틴)을 하나 만든다면?",
  "내가 너에게 처음 끌렸던 점은?",
  "처음 사귀던 때랑 지금, 뭐가 가장 달라졌어?",

  // 너에 대해
  "요즘 가장 좋아하는 노래 한 곡은?",
  "요즘 빠져있는 게 뭐야?",
  "어릴 때 별명은? 왜 그렇게 불렸어?",
  "어렸을 때 가장 행복했던 기억 한 장면?",
  "지금 보고 싶은 사람 한 명은?",
  "최근에 본 영화/드라마 중 추천하고 싶은 거?",
  "스트레스 받을 때 너만의 해소법은?",
  "다시 학생이 된다면 어떤 동아리 하고 싶어?",
  "닮고 싶은 사람이 있다면 누구?",
  "꼭 배워보고 싶은 것 하나?",

  // 좋아하는 것
  "비 오는 날 vs 눈 오는 날, 어느 쪽?",
  "아침형 vs 저녁형, 본인은?",
  "지금 먹고 싶은 음식 딱 하나?",
  "혼자 있고 싶을 때 가는 장소는?",
  "주말에 푹 자거나 vs 일찍 움직이거나?",
  "여름 vs 가을, 더 좋아하는 계절은?",
  "바다 vs 산?",
  "고양이 vs 강아지?",
  "도시 vs 시골에서 한 달 살기?",
  "혼자 여행 vs 둘이 여행?",

  // 상상
  "내일 하루 자유시간 5시간이 주어진다면?",
  "복권 1억 당첨되면 첫 지출은?",
  "한 달 휴가 받으면 어디 갈래?",
  "초능력 하나 가질 수 있다면?",
  "동물로 환생한다면 뭐가 좋아?",
  "내일 갑자기 다른 도시에 살게 된다면 어디?",
  "타임머신 타고 가고 싶은 시기/장소?",
  "어른이 되기 전의 나에게 한 마디 해준다면?",
  "10년 전 나에게 한 마디?",
  "10년 후 나에게 미리 한 마디?",

  // 일상 사소한
  "오늘 입은 옷에서 가장 좋아하는 한 가지?",
  "오늘 마신 음료 중 베스트는?",
  "지금 책상/방 풍경 한 줄로 묘사하면?",
  "가장 자주 듣는 알람음/벨소리?",
  "최근에 새로 산 것 중 만족스러운 거?",
  "지금 핸드폰 배경화면 뭐야?",
  "오늘 첫 번째로 한 일은?",
  "오늘 마지막에 할 일은?",
  "최근 본 하늘 중 가장 예뻤던 색?",
  "오늘 들었던 노래 중 한 곡만.",

  // 마음/내면
  "최근에 부끄러웠던 작은 실수 하나?",
  "요즘 가장 자주 하는 걱정은?",
  "지금 가장 기다리는 것은?",
  "최근에 누구한테 미안한 마음이 들었어?",
  "스스로가 멋있다고 느낀 최근 순간?",
  "요즘 잘 안 풀리는 거 하나?",
  "포기하고 싶을 때 너를 붙잡는 건?",
  "최근에 가장 크게 웃은 게 언제야?",
  "오늘 하루 점수를 매긴다면 10점 만점에?",
  "오늘의 나, 한 마디 칭찬해준다면?",

  // 추억/취향
  "가장 좋아하는 계절 음식?",
  "어렸을 때 가장 좋아하던 만화/책?",
  "처음으로 모은 용돈으로 산 것?",
  "수학여행/MT 중 기억에 남는 한 장면?",
  "가족 중 가장 닮은 사람 누구야?",
  "어릴 때 장래희망과 지금, 어느 정도 가까워?",
  "가장 좋아하는 영화 한 편만 꼽으면?",
  "마지막으로 운 게 언제야?",
  "최근에 받은 칭찬 중 가장 기쁜 거?",
  "다음 생에는 뭘로 태어나고 싶어?",
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

export function pickQuestionForDate(dateStr: string): string {
  const idx = hashIndex(dateStr, DAILY_QUESTIONS.length);
  return DAILY_QUESTIONS[idx];
}

// DB 에 한 번 저장해두고 같은 날 다시 호출되면 read.
export async function getOrCreateDailyQuestion(
  dateStr: string,
  prisma: import("@prisma/client").PrismaClient,
): Promise<string> {
  const existed = await prisma.dailyQuestion.findUnique({
    where: { date: dateStr },
  });
  if (existed) return existed.question;
  const question = pickQuestionForDate(dateStr);
  try {
    await prisma.dailyQuestion.create({
      data: { date: dateStr, question },
    });
  } catch {
    // race: 다른 요청이 먼저 만들었을 수 있음 — re-read.
    const again = await prisma.dailyQuestion.findUnique({
      where: { date: dateStr },
    });
    if (again) return again.question;
  }
  return question;
}

export function todayKstDateStr(now: Date = new Date()): string {
  return new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}
