// app/api/reviews/route.ts — 리뷰 작성/수정
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });
  if (!["admin", "approved"].includes(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { dateId, stars, oneLine, tags } = await req.json();
  if (!dateId || typeof stars !== "number" || stars < 1 || stars > 5) {
    return NextResponse.json({ error: "bad_input" }, { status: 400 });
  }

  const date = await prisma.date.findUnique({ where: { id: dateId } });
  if (!date) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await prisma.review.upsert({
    where: { dateId_userId: { dateId, userId: user.id } },
    update: { stars, oneLine: oneLine ?? null },
    create: { dateId, userId: user.id, stars, oneLine: oneLine ?? null },
  });

  if (Array.isArray(tags) && tags.length) {
    const clean = (tags as unknown[])
      .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
      .map((t) => t.trim().slice(0, 32));
    if (clean.length) {
      await prisma.dateTag.createMany({
        data: clean.map((tag) => ({ dateId, tag })),
        skipDuplicates: true,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
