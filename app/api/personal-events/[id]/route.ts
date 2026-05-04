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
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId)) {
    return NextResponse.json({ error: "bad_id" }, { status: 400 });
  }
  const existing = await prisma.personalEvent.findUnique({
    where: { id: numId },
  });
  if (!existing)
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  // 커플 앱이라 admin/approved면 서로 수정 가능
  if (!["admin", "approved"].includes(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (typeof body.title === "string") {
    const t = body.title.trim();
    if (!t || t.length > 80) {
      return NextResponse.json({ error: "bad_title" }, { status: 400 });
    }
    data.title = t;
  }
  if (typeof body.startsAt === "string") {
    const d = new Date(body.startsAt);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "bad_startsAt" }, { status: 400 });
    }
    data.startsAt = d;
  }
  if ("endsAt" in body) {
    if (body.endsAt === null || body.endsAt === "") data.endsAt = null;
    else if (typeof body.endsAt === "string") {
      const d = new Date(body.endsAt);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: "bad_endsAt" }, { status: 400 });
      }
      data.endsAt = d;
    }
  }
  if (typeof body.allDay === "boolean") data.allDay = body.allDay;
  if ("category" in body) {
    data.category =
      typeof body.category === "string"
        ? body.category.trim().slice(0, 20) || null
        : null;
  }
  if ("emoji" in body) {
    data.emoji =
      typeof body.emoji === "string" ? body.emoji.trim() || null : null;
  }
  if ("note" in body) {
    data.note =
      typeof body.note === "string"
        ? body.note.trim().slice(0, 500) || null
        : null;
  }

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
  }

  const updated = await prisma.personalEvent.update({
    where: { id: numId },
    data,
  });
  revalidatePath("/timeline");
  return NextResponse.json({ id: updated.id });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId)) {
    return NextResponse.json({ error: "bad_id" }, { status: 400 });
  }
  const existing = await prisma.personalEvent.findUnique({
    where: { id: numId },
  });
  if (!existing)
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!["admin", "approved"].includes(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  await prisma.personalEvent.delete({ where: { id: numId } });
  revalidatePath("/timeline");
  return NextResponse.json({ ok: true });
}
