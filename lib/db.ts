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

export async function getNextDate() {
  const d = await prisma.date.findFirst({
    where: { status: "planned" },
    orderBy: { scheduledAt: "asc" },
    include: dateInclude,
  });
  return d ? adaptDate(d) : null;
}

export async function getPastDates(limit = 5) {
  const dates = await prisma.date.findMany({
    where: { status: "done" },
    orderBy: { scheduledAt: "desc" },
    take: limit,
    include: dateInclude,
  });
  return dates.map(adaptDate);
}

export async function getDoneCount() {
  return prisma.date.count({ where: { status: "done" } });
}

export async function getActiveUsers() {
  return prisma.user.findMany({
    where: { role: { in: ["admin", "approved"] } },
    orderBy: { createdAt: "asc" },
  });
}

export async function avgStarsByUserId(userId: string) {
  const reviews = await prisma.review.findMany({ where: { userId } });
  if (!reviews.length) return 0;
  const avg = reviews.reduce((s, r) => s + r.stars, 0) / reviews.length;
  return Math.round(avg * 10) / 10;
}

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
