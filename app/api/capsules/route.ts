import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notifyOthers } from "@/lib/push";
import { todayKstStr } from "@/lib/daily";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const rows = await prisma.timeCapsule.findMany({
    where: { deletedAt: null },
    orderBy: { openAt: "asc" },
    include: { createdBy: { select: { id: true, nickname: true } } },
  });
  const isAdmin = user.role === "admin";
  const capsules = rows.map((c) => {
    const isOwner = c.createdById === user.id;
    // 봉인 + 비소유자에게는 본문 숨김.
    if (!c.opened && !isOwner && !isAdmin) {
      return { ...c, body: "" };
    }
    return c;
  });
  return NextResponse.json({ capsules });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });
  if (!["admin", "approved"].includes(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const title = (body.title ?? "").toString().trim();
  const bodyText = (body.body ?? "").toString();
  const openAtStr = body.openAt as string | undefined;

  if (!title || title.length > 80) {
    return NextResponse.json({ error: "bad_title" }, { status: 400 });
  }
  if (!bodyText.trim() || bodyText.length > 5000) {
    return NextResponse.json({ error: "bad_body" }, { status: 400 });
  }
  const openAt = openAtStr ? new Date(openAtStr) : null;
  if (!openAt || Number.isNaN(openAt.getTime())) {
    return NextResponse.json({ error: "bad_openAt" }, { status: 400 });
  }
  // KST 기준 오늘 이하면 거부 (미래 날짜만 봉인 가능).
  if (todayKstStr(openAt) <= todayKstStr()) {
    return NextResponse.json({ error: "openAt_past" }, { status: 400 });
  }

  const created = await prisma.timeCapsule.create({
    data: { title, body: bodyText, openAt, createdById: user.id },
  });
  revalidatePath("/capsules");

  notifyOthers(user.id, {
    title: `💌 ${user.nickname} 이 타임캡슐 봉인`,
    body: `${title} · ${openAt.toLocaleDateString("ko", { year: "numeric", month: "long", day: "numeric" })}에 열림`,
    url: "/us",
    tag: `capsule-${created.id}`,
  }).catch((e) => console.error("[push] capsule", e));

  return NextResponse.json({ id: created.id });
}
