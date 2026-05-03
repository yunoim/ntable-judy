import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { COUPLE_START_KIND } from "@/lib/saju";

const ALLOWED_KINDS = new Set(["", COUPLE_START_KIND]);

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });
  if (!["admin", "approved"].includes(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const label = (body.label ?? "").toString().trim();
  const dateStr = body.date as string | undefined;
  const emoji = (body.emoji ?? "").toString().trim() || null;
  const kindRaw = (body.kind ?? "").toString().trim();
  if (!ALLOWED_KINDS.has(kindRaw)) {
    return NextResponse.json({ error: "bad_kind" }, { status: 400 });
  }
  const kind = kindRaw || null;
  const recurring = kind === COUPLE_START_KIND ? false : body.recurring !== false;

  if (!label || label.length > 30) {
    return NextResponse.json({ error: "bad_label" }, { status: 400 });
  }
  const date = dateStr ? new Date(dateStr) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "bad_date" }, { status: 400 });
  }

  if (kind === COUPLE_START_KIND) {
    const dup = await prisma.anniversary.findFirst({
      where: { userId: null, kind: COUPLE_START_KIND },
    });
    if (dup) {
      return NextResponse.json({ error: "couple_start_exists" }, { status: 409 });
    }
  }

  const created = await prisma.anniversary.create({
    data: {
      label,
      date,
      emoji,
      recurring,
      createdById: user.id,
      kind,
    },
  });
  return NextResponse.json({ id: created.id });
}
