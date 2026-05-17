import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

const dateInclude = {
  stops: { orderBy: { stepOrder: "asc" as const } },
  reviews: { include: { user: true } },
  tags: true,
  createdBy: true,
};

export async function getDateById(id: string) {
  const d = await prisma.date.findUnique({ where: { id }, include: dateInclude });
  return d ? adaptDate(d) : null;
}

export async function getDateByNumber(number: number) {
  const d = await prisma.date.findUnique({ where: { number }, include: dateInclude });
  return d ? adaptDate(d) : null;
}

export async function getAllDates() {
  const dates = await prisma.date.findMany({
    orderBy: { number: "desc" },
    include: dateInclude,
  });
  return dates.map(adaptDate);
}

// Re-derive `Date.number` so it reflects chronological order of `scheduledAt`
// (with `createdAt` as tiebreaker). Two-step temp-negate avoids colliding with
// the `@unique` constraint while values are being shuffled.
export async function renumberDates() {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      WITH ordered AS (
        SELECT id, ROW_NUMBER() OVER (
          ORDER BY "scheduledAt" ASC, "createdAt" ASC
        ) AS new_num
        FROM "judy"."Date"
      )
      UPDATE "judy"."Date" d
      SET number = -ordered.new_num
      FROM ordered
      WHERE d.id = ordered.id
    `;
    await tx.$executeRaw`UPDATE "judy"."Date" SET number = -number WHERE number < 0`;
  });
}

function startOfTodayKstUtc(): Date {
  // 서버 TZ에 무관하게 KST 자정 기준의 UTC 인스턴트를 반환.
  const now = new Date();
  const kstYmd = now.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  return new Date(`${kstYmd}T00:00:00+09:00`);
}

export async function getNextDate() {
  const startOfToday = startOfTodayKstUtc();
  // 다일 데이트(여행 등): scheduledEndAt 가 오늘 이후면 "진행 중/예정" 으로 잡힘.
  const d = await prisma.date.findFirst({
    where: {
      status: "planned",
      OR: [
        { scheduledAt: { gte: startOfToday } },
        { scheduledEndAt: { gte: startOfToday } },
      ],
    },
    orderBy: { scheduledAt: "asc" },
    include: dateInclude,
  });
  return d ? adaptDate(d) : null;
}

export async function getPastDates(limit?: number) {
  const startOfToday = startOfTodayKstUtc();
  // 다일 데이트: 종료가 오늘 이전(또는 단일이면서 시작이 오늘 이전) 만 "지난" 으로.
  const dates = await prisma.date.findMany({
    where: {
      status: { not: "cancelled" },
      OR: [
        { AND: [{ scheduledEndAt: null }, { scheduledAt: { lt: startOfToday } }] },
        { scheduledEndAt: { lt: startOfToday } },
      ],
    },
    orderBy: { scheduledAt: "desc" },
    ...(typeof limit === "number" ? { take: limit } : {}),
    include: dateInclude,
  });
  return dates.map(adaptDate);
}

export async function getActiveUsers() {
  return prisma.user.findMany({
    where: { role: { in: ["admin", "approved"] } },
    orderBy: { createdAt: "asc" },
  });
}

export async function getPartnerUser() {
  return prisma.user.findFirst({ where: { partner: true } });
}

export async function avgStarsByUserId(userId: string) {
  const reviews = await prisma.review.findMany({ where: { userId } });
  if (!reviews.length) return 0;
  const avg = reviews.reduce((s, r) => s + r.stars, 0) / reviews.length;
  return Math.round(avg * 10) / 10;
}

export type StopAlt = {
  emoji: string | null;
  name: string;
  address: string | null;
  type: string | null;
  description: string | null;
  mapQuery: string;
  estimatedCost: number;
};

export type AdaptedStop = {
  time: string;
  emoji: string | null;
  name: string;
  address: string;
  type: string;
  description: string | null;
  cost: number;
  mapQuery: string;
  naverMapUrl: string | null;
  reservationUrl: string | null;
  reserved: boolean;
  alternatives: StopAlt[];
};

export type AdaptedReview = {
  userId: string;
  userKakaoId: string;
  userNickname: string;
  userEmoji: string | null;
  stars: number;
  oneLine: string;
};

export type AdaptedDate = {
  id: string;
  number: number;
  title: string;
  subtitle: string | null;
  scheduledAt: string;
  scheduledEndAt: string | null;
  startTime: string | null;
  endTime: string | null;
  area: string;
  status: string;
  estimatedCost: number;
  themeNote: string | null;
  weather: string | null;
  historyLabel: string | null;
  plan: { stops: AdaptedStop[]; estimatedTotal: number; summary: string };
  tags: string[];
  reviews: AdaptedReview[];
  createdBy: { id: string; nickname: string; emoji: string | null } | null;
};

function adaptDate(d: any): AdaptedDate {
  const stops = d.stops.map((s: any) => ({
    time: s.time,
    emoji: s.emoji,
    name: s.name,
    address: s.address ?? "",
    type: s.type ?? "",
    description: s.description,
    cost: s.cost,
    mapQuery: s.mapQuery,
    naverMapUrl: s.naverMapUrl,
    reservationUrl: s.reservationUrl,
    reserved: s.reserved,
    alternatives: Array.isArray(s.alternatives)
      ? (s.alternatives as any[]).map((a) => ({
          emoji: a?.emoji ?? null,
          name: String(a?.name ?? ""),
          address: a?.address ?? null,
          type: a?.type ?? null,
          description: a?.description ?? null,
          mapQuery: String(a?.mapQuery ?? a?.name ?? ""),
          estimatedCost: Number(a?.estimatedCost ?? 0) || 0,
        }))
      : [],
  }));
  const computedTotal = d.stops.reduce(
    (sum: number, st: any) => sum + (st.cost ?? 0),
    0,
  );
  return {
    id: d.id,
    number: d.number,
    title: d.title,
    subtitle: d.subtitle,
    scheduledAt: d.scheduledAt.toISOString(),
    scheduledEndAt: d.scheduledEndAt ? d.scheduledEndAt.toISOString() : null,
    startTime: d.startTime,
    endTime: d.endTime,
    area: d.area,
    status: d.status,
    estimatedCost: d.estimatedCost ?? computedTotal,
    themeNote: d.themeNote,
    weather: d.weather,
    historyLabel: d.historyLabel,
    plan: {
      stops,
      estimatedTotal: d.estimatedCost ?? computedTotal,
      summary: d.subtitle ?? d.summary ?? "",
    },
    tags: d.tags.map((t: any) => t.tag),
    reviews: d.reviews.map((r: any) => ({
      userId: r.userId,
      userKakaoId: r.user.kakaoId,
      userNickname: r.user.nickname,
      userEmoji: r.user.emoji,
      stars: r.stars,
      oneLine: r.oneLine ?? "",
    })),
    createdBy: d.createdBy
      ? {
          id: d.createdBy.id,
          nickname: d.createdBy.nickname,
          emoji: d.createdBy.emoji,
        }
      : null,
  };
}
