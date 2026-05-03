import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminUser = await prisma.user.findFirst({ where: { role: "admin" } });
  if (!adminUser) {
    console.error("⚠️ Admin user not found. Skip seed - login first via Kakao.");
    return;
  }
  console.log(`✓ Admin user found: ${adminUser.nickname} (${adminUser.kakaoId})`);

  await prisma.date.upsert({
    where: { number: 1 },
    update: {},
    create: {
      number: 1,
      title: "설악산",
      area: "설악산",
      scheduledAt: new Date("2026-01-15T09:00:00+09:00"),
      status: "done",
      historyLabel: "설악산",
      createdById: adminUser.id,
    },
  });
  await prisma.date.upsert({
    where: { number: 2 },
    update: {},
    create: {
      number: 2,
      title: "댕댕런",
      area: "서울",
      scheduledAt: new Date("2026-02-10T10:00:00+09:00"),
      status: "done",
      historyLabel: "댕댕런",
      createdById: adminUser.id,
    },
  });
  await prisma.date.upsert({
    where: { number: 3 },
    update: {},
    create: {
      number: 3,
      title: "벚꽃드라이브",
      area: "벚꽃길",
      scheduledAt: new Date("2026-04-05T14:00:00+09:00"),
      status: "done",
      historyLabel: "벚꽃드라이브",
      createdById: adminUser.id,
    },
  });

  const d4 = await prisma.date.upsert({
    where: { number: 4 },
    update: {
      title: "우리의 네 번째 날",
      subtitle: "성수동 데이트 스케줄",
      themeNote: "오늘은 결론 내는 날 아니고, 제대로 얘기하는 날 🐰🦊",
    },
    create: {
      number: 4,
      title: "우리의 네 번째 날",
      subtitle: "성수동 데이트 스케줄",
      area: "성수동",
      scheduledAt: new Date("2026-05-04T14:00:00+09:00"),
      startTime: "14:00",
      endTime: "22:00",
      status: "planned",
      themeNote: "오늘은 결론 내는 날 아니고, 제대로 얘기하는 날 🐰🦊",
      weather: "rain",
      historyLabel: "성수동",
      createdById: adminUser.id,
    },
  });

  await prisma.stop.deleteMany({ where: { dateId: d4.id } });
  await prisma.stop.createMany({
    data: [
      {
        dateId: d4.id,
        stepOrder: 1,
        time: "14:00",
        emoji: "🛍️",
        name: "올리브영N 성수",
        address: "서울 성동구 연무장7길 13 팩토리얼 성수",
        type: "쇼핑",
        description: "비 피하면서 어색함 푸는 시간. 구경하면서 자연스럽게 시작해요.",
        mapQuery: "올리브영N 성수",
        naverMapUrl: "https://naver.me/FN70Cx7O",
      },
      {
        dateId: d4.id,
        stepOrder: 2,
        time: "16:00",
        emoji: "🍵",
        name: "맥파이앤타이거",
        address: "서울 성동구 성수이로 97 5층",
        type: "티 바",
        description: "차분한 티 바에서 빗소리 들으며. 일상 얘기, 천천히 분위기 쌓기.",
        mapQuery: "맥파이앤타이거 성수",
        naverMapUrl: "https://naver.me/5G5Y2j2X",
      },
      {
        dateId: d4.id,
        stepOrder: 3,
        time: "18:00",
        emoji: "🍽️",
        name: "그리노 성수",
        address: "서울 성동구 성수이로 147 1층 103호",
        type: "한식",
        description: "건강한 재료로 만든 분위기 있는 저녁. 여기서부터 진짜 얘기 조금씩 시작해요.",
        mapQuery: "그리노 성수",
        naverMapUrl: "https://naver.me/FpMlLDL0",
        reserved: true,
      },
      {
        dateId: d4.id,
        stepOrder: 4,
        time: "20:00",
        emoji: "🍸",
        name: "신데렐라 바",
        address: "서울 성동구 아차산로7가길 3-4 1층",
        type: "와인바",
        description: "낮은 조명, 재즈 음악, 나란히 앉아서. 하고 싶었던 얘기들 천천히.",
        mapQuery: "신데렐라 바 성수",
        naverMapUrl: "https://naver.me/5mBlkm8u",
        reserved: true,
      },
    ],
  });

  console.log(`✓ Seed complete. 4번째 데이트 ID: ${d4.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
