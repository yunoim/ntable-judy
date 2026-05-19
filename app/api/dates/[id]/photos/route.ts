import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { notifyOthers } from "@/lib/push";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });
  if (!["admin", "approved"].includes(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!storage.isConfigured()) {
    return NextResponse.json(
      { error: "storage_not_configured" },
      { status: 503 },
    );
  }

  const { id } = await params;
  const date = await prisma.date.findUnique({ where: { id } });
  if (!date) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file");
  const caption = (form.get("caption") ?? "").toString().trim() || null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 400 });
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json({ error: "bad_mime" }, { status: 400 });
  }

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : file.type === "image/heic"
          ? "heic"
          : "jpg";
  const path = `dates/${id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { url, key } = await storage.put({
      path,
      data: buffer,
      contentType: file.type,
    });

    const created = await prisma.datePhoto.create({
      data: {
        dateId: id,
        url,
        key,
        caption,
        uploadedById: user.id,
      },
      include: {
        uploadedBy: { select: { id: true, nickname: true, emoji: true } },
      },
    });

    revalidatePath(`/dates/${id}`);

    notifyOthers(user.id, {
      title: `📷 ${user.nickname} 이 사진 추가`,
      body: `#${String(date.number).padStart(2, "0")} ${date.title}`,
      url: `/dates/${id}`,
      tag: `photo-${created.id}`,
    }).catch((e) => console.error("[push] photo", e));

    return NextResponse.json({
      id: created.id,
      url: created.url,
      caption: created.caption,
      width: created.width,
      height: created.height,
      uploadedBy: created.uploadedBy,
      createdAt: created.createdAt.toISOString(),
    });
  } catch (e: any) {
    console.error("photo upload failed", e);
    const name = e?.name ?? e?.Code ?? null;
    const msg = e?.message ?? String(e);
    return NextResponse.json(
      {
        error: "upload_failed",
        detail: name ? `${name}: ${msg}` : msg,
      },
      { status: 500 },
    );
  }
}
