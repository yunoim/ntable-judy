// scripts/seed-content.ts
// 자연스러운 콘텐츠 1회 주입. 멱등 (이미 있는 건 스킵).
// 실행: pnpm tsx scripts/seed-content.ts

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const NICK_ID = "cmop7ncdv0000wuo0uzipt6rf";
const JUDY_ID = "cmopf97i90000p10ktp12yghs";

async function main() {
  const dates = await prisma.date.findMany({ orderBy: { number: "asc" } });
  const byNumber = new Map(dates.map((d) => [d.number, d]));

  // ── Reviews ────────────────────────────────────────
  const reviews: Array<{
    number: number;
    userId: string;
    stars: number;
    oneLine: string;
  }> = [
    { number: 1, userId: NICK_ID, stars: 4, oneLine: "주디 등산 처음이라더니 잘 따라옴" },
    { number: 1, userId: JUDY_ID, stars: 5, oneLine: "사람 진짜 많은데 정상 김밥 진짜 짱" },
    { number: 2, userId: NICK_ID, stars: 5, oneLine: "주디 강아지 좋아하는 거 알고는 있었는데 그 정도일 줄은 ㅎ" },
    { number: 2, userId: JUDY_ID, stars: 4, oneLine: "다음엔 강아지 직접 만나는 데로 갑시다" },
    { number: 3, userId: NICK_ID, stars: 4, oneLine: "차 안에서 한 얘기 다 기억남" },
    { number: 3, userId: JUDY_ID, stars: 5, oneLine: "그날 음악이 진짜 좋았어" },
  ];
  let reviewCount = 0;
  for (const r of reviews) {
    const d = byNumber.get(r.number);
    if (!d) continue;
    await prisma.review.upsert({
      where: { dateId_userId: { dateId: d.id, userId: r.userId } },
      create: {
        dateId: d.id,
        userId: r.userId,
        stars: r.stars,
        oneLine: r.oneLine,
      },
      update: { stars: r.stars, oneLine: r.oneLine },
    });
    reviewCount++;
  }
  console.log(`reviews upserted: ${reviewCount}`);

  // ── Comments ───────────────────────────────────────
  // 데이트 후 며칠에 걸쳐 자연스럽게 분산
  type Cmt = { uid: string; body: string; offsetMin: number };
  const commentSets: Array<{ number: number; items: Cmt[] }> = [
    {
      number: 1,
      items: [
        { uid: JUDY_ID, body: "정상 사진 보내줘", offsetMin: 60 * 6 },
        { uid: NICK_ID, body: "ㅇㅋ 정리해서", offsetMin: 60 * 8 },
        { uid: JUDY_ID, body: "근데 다음엔 좀 짧은 코스로 ㅠ", offsetMin: 60 * 24 + 30 },
        { uid: NICK_ID, body: "공룡능선이 풀코스긴 했지", offsetMin: 60 * 27 },
      ],
    },
    {
      number: 2,
      items: [
        { uid: NICK_ID, body: "그 시바견 진짜 잘생겼지", offsetMin: 60 * 4 },
        { uid: JUDY_ID, body: "ㅋㅋ 너 사람보다 강아지 보는 표정이 더 좋더라", offsetMin: 60 * 4 + 12 },
        { uid: NICK_ID, body: "그건 부정 못함", offsetMin: 60 * 5 },
      ],
    },
    {
      number: 3,
      items: [
        { uid: JUDY_ID, body: "플레이리스트 공유 좀", offsetMin: 60 * 3 },
        { uid: NICK_ID, body: "보냄. 7번 트랙 추천", offsetMin: 60 * 3 + 25 },
        { uid: JUDY_ID, body: "들어볼게 ㅇ", offsetMin: 60 * 5 },
        { uid: JUDY_ID, body: "그 곡 진짜 운전할 때 듣기 좋네", offsetMin: 60 * 24 * 2 },
      ],
    },
    {
      number: 4,
      items: [
        { uid: NICK_ID, body: "오늘부터 1일이라니", offsetMin: 60 * 22 },
        { uid: JUDY_ID, body: "ㅎㅎ", offsetMin: 60 * 22 + 4 },
        {
          uid: NICK_ID,
          body: "맥파이 다음에 또 가자. 자리 안 났던 거 아쉬워",
          offsetMin: 60 * 22 + 6,
        },
        { uid: JUDY_ID, body: "ㅇㅇ 평일 낮에 한 번 가자", offsetMin: 60 * 23 },
      ],
    },
  ];
  let commentCount = 0;
  for (const cs of commentSets) {
    const d = byNumber.get(cs.number);
    if (!d) continue;
    const exists = await prisma.dateComment.count({ where: { dateId: d.id } });
    if (exists > 0) {
      console.log(`  date #${cs.number} already has comments — skip`);
      continue;
    }
    const base = new Date(d.scheduledAt).getTime();
    for (const item of cs.items) {
      await prisma.dateComment.create({
        data: {
          dateId: d.id,
          userId: item.uid,
          body: item.body,
          createdAt: new Date(base + item.offsetMin * 60 * 1000),
        },
      });
      commentCount++;
    }
  }
  console.log(`comments created: ${commentCount}`);

  // ── Buckets ────────────────────────────────────────
  const bucketCount = await prisma.bucket.count();
  if (bucketCount === 0) {
    const buckets = [
      {
        title: "설악산 한 번 더 (이번엔 좀 짧은 코스)",
        emoji: "⛰️",
        area: "강원",
        priority: 0,
        by: NICK_ID,
      },
      {
        title: "맥파이앤타이거 자리 잡기",
        emoji: "🍵",
        area: "성수",
        description: "지난번에 못 들어감",
        priority: 1,
        by: JUDY_ID,
      },
      {
        title: "양양 서핑 (둘 다 처음)",
        emoji: "🌊",
        area: "양양",
        priority: 0,
        by: JUDY_ID,
      },
      {
        title: "노보리베츠 온천 (눈 올 때)",
        emoji: "♨️",
        area: "홋카이도",
        priority: 0,
        by: NICK_ID,
      },
      {
        title: "강아지 카페 다른 곳도",
        emoji: "🐕",
        priority: 0,
        by: NICK_ID,
      },
      {
        title: "본 영화 100편 채우기",
        emoji: "🎬",
        description: "지금까지 기억나는 거 7편",
        priority: 0,
        by: JUDY_ID,
      },
      {
        title: "케이크 같이 굽기",
        emoji: "🎂",
        description: "실패해도 ㄱㅊ",
        priority: 0,
        by: JUDY_ID,
      },
      {
        title: "둘만 사는 집 꾸미기",
        emoji: "🏠",
        description: "조명까지 같이 고르기",
        priority: 1,
        by: NICK_ID,
      },
      {
        title: "1주년에 성수 다시 가기",
        emoji: "💝",
        area: "성수",
        priority: 0,
        by: NICK_ID,
      },
      {
        title: "가을 단풍 드라이브",
        emoji: "🍁",
        priority: 0,
        by: JUDY_ID,
      },
    ];
    for (const b of buckets) {
      await prisma.bucket.create({
        data: {
          title: b.title,
          emoji: b.emoji,
          area: b.area ?? null,
          description: b.description ?? null,
          priority: b.priority,
          createdById: b.by,
        },
      });
    }
    console.log(`buckets created: ${buckets.length}`);
  } else {
    console.log(`buckets exist (${bucketCount}) — skip`);
  }

  // ── Time capsules ──────────────────────────────────
  const capsuleCount = await prisma.timeCapsule.count();
  if (capsuleCount === 0) {
    await prisma.timeCapsule.create({
      data: {
        title: "1주년에",
        body: `1년 전 닉이 1년 후 닉한테.
첫날 맥파이 못 들어가서 그리노 갔던 거. 결국 그게 더 잘 풀렸지.
1년이 비슷하게 흘러갔길.

— 닉`,
        openAt: new Date("2027-05-03T00:00:00.000Z"),
        createdById: NICK_ID,
      },
    });
    await prisma.timeCapsule.create({
      data: {
        title: "100일",
        body: `100일이면 8월일까
지금은 좀 어색한데 그게 좋아
100일엔 좀 더 익숙해져 있길

— 주디`,
        openAt: new Date("2026-08-10T00:00:00.000Z"),
        createdById: JUDY_ID,
      },
    });
    console.log("capsules created: 2");
  } else {
    console.log(`capsules exist (${capsuleCount}) — skip`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
