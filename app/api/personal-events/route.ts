import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const url = new URL(req.url);
  const fromStr = url.searchParams.get("from");
  const toStr = url.searchParams.get("to");

  const where: { startsAt?: { gte?: Date; lt?: Date } } = {};
  if (fromStr) {
    const from = new Date(fromStr);
    if (!Number.isNaN(from.getTime())) {
      where.startsAt = { ...(where.startsAt ?? {}), gte: from };
    }
  }
  if (toStr) {
    const to = new Date(toStr);
    if (!Number.isNaN(to.getTime())) {
      where.startsAt = { ...(where.startsAt ?? {}), lt: to };
    }
  }

  const events = await prisma.personalEvent.findMany({
    where,
    orderBy: { startsAt: "asc" },
    include: { user: { select: { id: true, nickname: true, emoji: true } } },
  });
  return NextResponse.json({ events });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });
  if (!["admin", "approved"].includes(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const title = (body.title ?? "").toString().trim();
  if (!title || title.length > 80) {
    return NextResponse.json({ error: "bad_title" }, { status: 400 });
  }
  const startsAt = body.startsAt ? new Date(body.startsAt) : null;
  if (!startsAt || Number.isNaN(startsAt.getTime())) {
    return NextResponse.json({ error: "bad_startsAt" }, { status: 400 });
  }
  const endsAt = body.endsAt ? new Date(body.endsAt) : null;
  if (endsAt && Number.isNaN(endsAt.getTime())) {
    return NextResponse.json({ error: "bad_endsAt" }, { status: 400 });
  }
  const category = body.category
    ? (body.category ?? "").toString().trim().slice(0, 20) || null
    : null;
  const emoji = body.emoji
    ? (body.emoji ?? "").toString().trim() || null
    : null;
  const note = body.note
    ? (body.note ?? "").toString().trim().slice(0, 500) || null
    : null;
  const allDay = !!body.allDay;

  const created = await prisma.personalEvent.create({
    data: {
      userId: user.id,
      title,
      startsAt,
      endsAt,
      allDay,
      category,
      emoji,
      note,
    },
  });

  revalidatePath("/timeline");
  return NextResponse.json({ id: created.id });
}
