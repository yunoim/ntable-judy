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

  const existing = await prisma.bucket.findUnique({ where: { id: numId } });
  if (!existing)
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (user.role !== "admin" && existing.createdById !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (typeof body.title === "string") {
    const t = body.title.trim();
    if (!t || t.length > 60) {
      return NextResponse.json({ error: "bad_title" }, { status: 400 });
    }
    data.title = t;
  }
  if ("emoji" in body) {
    const e = body.emoji;
    data.emoji = typeof e === "string" ? e.trim() || null : null;
  }
  if ("description" in body) {
    const d = body.description;
    data.description = typeof d === "string" ? d.trim() || null : null;
  }
  if ("area" in body) {
    const a = body.area;
    data.area = typeof a === "string" ? a.trim() || null : null;
  }
  if (Number.isInteger(body.priority)) data.priority = body.priority;

  if (typeof body.done === "boolean") {
    data.done = body.done;
    data.doneAt = body.done ? new Date() : null;
    if (!body.done) data.doneDateId = null;
  }
  if ("doneDateId" in body) {
    data.doneDateId = body.doneDateId || null;
  }

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
  }

  const updated = await prisma.bucket.update({ where: { id: numId }, data });
  revalidatePath("/buckets");
  revalidatePath("/");
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
  const existing = await prisma.bucket.findUnique({ where: { id: numId } });
  if (!existing)
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (user.role !== "admin" && existing.createdById !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  await prisma.bucket.delete({ where: { id: numId } });
  revalidatePath("/buckets");
  revalidatePath("/");
  return NextResponse.json({ ok: true });
}
