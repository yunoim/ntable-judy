import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
  const recurring = body.recurring !== false;

  if (!label || label.length > 30) {
    return NextResponse.json({ error: "bad_label" }, { status: 400 });
  }
  const date = dateStr ? new Date(dateStr) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "bad_date" }, { status: 400 });
  }

  const created = await prisma.anniversary.create({
    data: { label, date, emoji, recurring, createdById: user.id },
  });
  return NextResponse.json({ id: created.id });
}
