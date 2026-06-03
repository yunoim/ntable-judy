// 채팅 이미지 첨부 — multipart 로 file (+ optional body) 받아 R2 업로드 후
// ChatMessage 한 건 생성. 텍스트는 body 필드, 이미지 URL/key 는 imageUrl/Key.
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { notifyOthers } from "@/lib/push";
import { emitChat } from "@/lib/chatStream";

export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/gif",
];

export async function POST(req: Request) {
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

  const form = await req.formData();
  const file = form.get("file");
  const bodyText = (form.get("body") ?? "").toString().trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 400 });
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json({ error: "bad_mime" }, { status: 400 });
  }
  if (bodyText.length > 2000) {
    return NextResponse.json({ error: "bad_body" }, { status: 400 });
  }

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : file.type === "image/heic"
          ? "heic"
          : file.type === "image/gif"
            ? "gif"
            : "jpg";
  const arrayBuf = await file.arrayBuffer();
  const buf = Buffer.from(arrayBuf);
  const path = `chat/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  let uploaded;
  try {
    uploaded = await storage.put({
      path,
      data: buf,
      contentType: file.type,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "upload_failed", detail: e?.message ?? "unknown" },
      { status: 500 },
    );
  }

  const created = await prisma.chatMessage.create({
    data: {
      userId: user.id,
      body: bodyText,
      imageUrl: uploaded.url,
      imageKey: uploaded.key,
    },
    include: { user: { select: { id: true, nickname: true, emoji: true } } },
  });

  // 본인 lastReadId 갱신.
  await prisma.chatRead
    .upsert({
      where: { userId: user.id },
      create: { userId: user.id, lastReadId: created.id },
      update: { lastReadId: created.id },
    })
    .catch(() => {});

  const wire = {
    id: created.id,
    body: created.body,
    imageUrl: created.imageUrl,
    createdAt: created.createdAt.toISOString(),
    user: created.user,
  };

  emitChat(wire);

  notifyOthers(user.id, {
    title: `📷 ${user.nickname}`,
    body: bodyText || "사진 보냄",
    url: "/chat",
    tag: "chat",
  }).catch((e) => console.error("[push] chat photo", e));

  return NextResponse.json(wire);
}
