import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });
  if (!["admin", "approved"].includes(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId)) {
    return NextResponse.json({ error: "bad_id" }, { status: 400 });
  }
  const existing = await prisma.timeCapsule.findUnique({ where: { id: numId } });
  if (!existing)
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));

  // 열기 액션
  if (body.action === "open") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const openTarget = new Date(existing.openAt);
    openTarget.setHours(0, 0, 0, 0);
    if (today.getTime() < openTarget.getTime()) {
      return NextResponse.json({ error: "not_yet" }, { status: 400 });
    }
    if (existing.opened) {
      return NextResponse.json({ id: existing.id, alreadyOpen: true });
    }
    await prisma.timeCapsule.update({
      where: { id: numId },
      data: { opened: true, openedAt: new Date() },
    });
    revalidatePath("/capsules");
    return NextResponse.json({ id: numId, opened: true });
  }

  // 일반 수정 (소유자만)
  if (user.role !== "admin" && existing.createdById !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (existing.opened) {
    return NextResponse.json({ error: "already_opened" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.title === "string") {
    const t = body.title.trim();
    if (!t || t.length > 80) {
      return NextResponse.json({ error: "bad_title" }, { status: 400 });
    }
    data.title = t;
  }
  if (typeof body.body === "string") {
    if (!body.body.trim() || body.body.length > 5000) {
      return NextResponse.json({ error: "bad_body" }, { status: 400 });
    }
    data.body = body.body;
  }
  if (typeof body.openAt === "string") {
    const d = new Date(body.openAt);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "bad_openAt" }, { status: 400 });
    }
    data.openAt = d;
  }

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
  }

  const updated = await prisma.timeCapsule.update({
    where: { id: numId },
    data,
  });
  revalidatePath("/capsules");
  return NextResponse.json({ id: updated.id });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });
  if (!["admin", "approved"].includes(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId)) {
    return NextResponse.json({ error: "bad_id" }, { status: 400 });
  }
  const existing = await prisma.timeCapsule.findUnique({ where: { id: numId } });
  if (!existing)
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (user.role !== "admin" && existing.createdById !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  await prisma.timeCapsule.delete({ where: { id: numId } });
  revalidatePath("/capsules");
  return NextResponse.json({ ok: true });
}
