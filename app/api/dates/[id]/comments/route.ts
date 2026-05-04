import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });
  if (!["admin", "approved"].includes(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const date = await prisma.date.findUnique({ where: { id } });
  if (!date) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const text = (body.body ?? "").toString().trim();
  if (!text || text.length > 2000) {
    return NextResponse.json({ error: "bad_body" }, { status: 400 });
  }

  const created = await prisma.dateComment.create({
    data: { dateId: id, userId: user.id, body: text },
    include: { user: { select: { id: true, nickname: true, emoji: true } } },
  });

  revalidatePath(`/dates/${id}`);
  return NextResponse.json({
    id: created.id,
    body: created.body,
    createdAt: created.createdAt.toISOString(),
    user: created.user,
  });
}
