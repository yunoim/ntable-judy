import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { COUPLE_START_KIND } from "@/lib/saju";

const AUTO_MANAGED_KINDS = new Set(["birthday"]);

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

  const existing = await prisma.anniversary.findUnique({ where: { id: numId } });
  if (!existing)
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (user.role !== "admin" && existing.createdById !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (existing.kind && AUTO_MANAGED_KINDS.has(existing.kind)) {
    return NextResponse.json({ error: "auto_managed" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (typeof body.label === "string") {
    const label = body.label.trim();
    if (!label || label.length > 30) {
      return NextResponse.json({ error: "bad_label" }, { status: 400 });
    }
    data.label = label;
  }

  if (typeof body.date === "string") {
    const d = new Date(body.date);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "bad_date" }, { status: 400 });
    }
    data.date = d;
  }

  if ("emoji" in body) {
    const e = body.emoji;
    if (e === null || e === "") data.emoji = null;
    else if (typeof e === "string") data.emoji = e.trim() || null;
    else return NextResponse.json({ error: "bad_emoji" }, { status: 400 });
  }

  if (typeof body.recurring === "boolean") {
    data.recurring = existing.kind === COUPLE_START_KIND ? false : body.recurring;
  }

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
  }

  const updated = await prisma.anniversary.update({
    where: { id: numId },
    data,
  });
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

  const existing = await prisma.anniversary.findUnique({ where: { id: numId } });
  if (!existing)
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (user.role !== "admin" && existing.createdById !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (existing.kind && AUTO_MANAGED_KINDS.has(existing.kind)) {
    return NextResponse.json({ error: "auto_managed" }, { status: 400 });
  }

  await prisma.anniversary.delete({ where: { id: numId } });
  return NextResponse.json({ ok: true });
}
