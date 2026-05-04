import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const buckets = await prisma.bucket.findMany({
    orderBy: [{ done: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
    include: {
      doneDate: { select: { id: true, number: true, title: true } },
      createdBy: { select: { id: true, nickname: true } },
    },
  });
  return NextResponse.json({ buckets });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });
  if (!["admin", "approved"].includes(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const title = (body.title ?? "").toString().trim();
  if (!title || title.length > 60) {
    return NextResponse.json({ error: "bad_title" }, { status: 400 });
  }
  const emoji = (body.emoji ?? "").toString().trim() || null;
  const description =
    body.description != null
      ? (body.description ?? "").toString().trim() || null
      : null;
  const area =
    body.area != null ? (body.area ?? "").toString().trim() || null : null;
  const priority = Number.isInteger(body.priority) ? body.priority : 0;

  const created = await prisma.bucket.create({
    data: {
      title,
      emoji,
      description,
      area,
      priority,
      createdById: user.id,
    },
  });
  revalidatePath("/buckets");
  revalidatePath("/");
  return NextResponse.json({ id: created.id });
}
