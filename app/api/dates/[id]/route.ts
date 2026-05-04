// app/api/dates/[id]/route.ts — PATCH (수정) / DELETE
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

type StopInput = {
  time?: string;
  emoji?: string | null;
  name?: string;
  address?: string | null;
  type?: string | null;
  description?: string | null;
  mapQuery?: string | null;
  naverMapUrl?: string | null;
  estimatedCost?: number;
  cost?: number;
  reservationUrl?: string | null;
  reserved?: boolean;
};

type Body = {
  title?: string;
  subtitle?: string | null;
  area?: string;
  scheduledAt?: string;
  startTime?: string | null;
  endTime?: string | null;
  status?: "planned" | "done" | "cancelled";
  themeNote?: string | null;
  weather?: string | null;
  historyLabel?: string | null;
  estimatedCost?: number | null;
  estimatedTotal?: number | null;
  stops?: StopInput[];
};

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
  const existing = await prisma.date.findUnique({ where: { id } });
  if (!existing)
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Body;

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title.trim();
  if (body.subtitle !== undefined)
    data.subtitle = body.subtitle?.trim() || null;
  if (body.area !== undefined) data.area = body.area.trim() || existing.area;
  if (body.scheduledAt !== undefined) {
    const d = new Date(body.scheduledAt);
    if (Number.isNaN(d.getTime()))
      return NextResponse.json(
        { error: "bad_scheduled_at" },
        { status: 400 },
      );
    data.scheduledAt = d;
  }
  if (body.startTime !== undefined) data.startTime = body.startTime || null;
  if (body.endTime !== undefined) data.endTime = body.endTime || null;
  if (body.status !== undefined) data.status = body.status;
  if (body.themeNote !== undefined) data.themeNote = body.themeNote || null;
  if (body.weather !== undefined) data.weather = body.weather || null;
  if (body.historyLabel !== undefined)
    data.historyLabel = body.historyLabel || null;
  if (body.estimatedCost !== undefined)
    data.estimatedCost = body.estimatedCost ?? null;
  else if (body.estimatedTotal !== undefined)
    data.estimatedCost = body.estimatedTotal ?? null;

  await prisma.date.update({ where: { id }, data });

  if (Array.isArray(body.stops)) {
    await prisma.$transaction([
      prisma.stop.deleteMany({ where: { dateId: id } }),
      prisma.stop.createMany({
        data: body.stops.map((s, i) => ({
          dateId: id,
          stepOrder: i + 1,
          time: s.time ?? "00:00",
          emoji: s.emoji ?? null,
          name: s.name ?? "",
          address: s.address ?? null,
          type: s.type ?? null,
          description: s.description ?? null,
          mapQuery: s.mapQuery ?? s.name ?? "",
          naverMapUrl: s.naverMapUrl ?? null,
          cost: s.estimatedCost ?? s.cost ?? 0,
          reservationUrl: s.reservationUrl ?? null,
          reserved: s.reserved ?? false,
        })),
      }),
    ]);
  }

  revalidatePath("/");
  revalidatePath("/timeline");
  revalidatePath(`/dates/${id}`);

  return NextResponse.json({ id, ok: true });
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
  const existing = await prisma.date.findUnique({ where: { id } });
  if (!existing)
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Only admin or original creator can delete
  if (user.role !== "admin" && existing.createdById !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await prisma.date.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/timeline");
  return NextResponse.json({ ok: true });
}
