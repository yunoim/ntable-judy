import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { notifyOthers } from "@/lib/push";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
const MAX_VIDEO_BYTES = 80 * 1024 * 1024; // 80MB — 폰 짧은 영상 커버 (Cloudflare free 100MB 한도 안)
const ALLOWED_IMAGE_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/gif",
];
const ALLOWED_VIDEO_MIME = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
];

// 큰 영상 업로드가 Railway/Node 의 기본 timeout 에 걸리지 않게.
export const maxDuration = 60;

// multipart formData() 가 큰 영상에서 "Failed to parse body as FormData" 로
// 던지는 케이스 (undici 한계) 가 있어 multipart 자체를 우회 — 클라가 file 객체를
// 그대로 body 로 PUT 한다 (Content-Type=file.type). caption 은 X-Caption 헤더로.
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

  const fileType = (req.headers.get("content-type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  const caption = (req.headers.get("x-caption") ?? "").trim() || null;

  const isVideo = fileType.startsWith("video/");
  const isImage = fileType.startsWith("image/");
  if (!isVideo && !isImage) {
    return NextResponse.json(
      { error: "bad_mime", detail: `mime=${fileType || "(empty)"}` },
      { status: 400 },
    );
  }
  if (isVideo && !ALLOWED_VIDEO_MIME.includes(fileType)) {
    return NextResponse.json(
      { error: "bad_mime", detail: `video mime=${fileType}` },
      { status: 400 },
    );
  }
  if (isImage && !ALLOWED_IMAGE_MIME.includes(fileType)) {
    return NextResponse.json(
      { error: "bad_mime", detail: `image mime=${fileType}` },
      { status: 400 },
    );
  }
  const sizeCap = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  // 미리 Content-Length 가 있으면 빠른 거부.
  const declaredLen = Number(req.headers.get("content-length") ?? "0");
  if (declaredLen && declaredLen > sizeCap) {
    return NextResponse.json(
      {
        error: "too_large",
        detail: `${Math.round(declaredLen / 1024 / 1024)}MB > ${Math.round(sizeCap / 1024 / 1024)}MB`,
      },
      { status: 400 },
    );
  }

  // raw body 읽기 — multipart 파싱 안 함.
  let buffer: Buffer;
  try {
    buffer = Buffer.from(await req.arrayBuffer());
  } catch (e: any) {
    console.error("[photos] body read failed", e);
    return NextResponse.json(
      { error: "body_parse_failed", detail: e?.message ?? String(e) },
      { status: 400 },
    );
  }
  if (buffer.byteLength === 0) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }
  if (buffer.byteLength > sizeCap) {
    return NextResponse.json(
      {
        error: "too_large",
        detail: `${Math.round(buffer.byteLength / 1024 / 1024)}MB > ${Math.round(sizeCap / 1024 / 1024)}MB`,
      },
      { status: 400 },
    );
  }

  const EXT: Record<string, string> = {
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
    "image/gif": "gif",
    "image/jpeg": "jpg",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm",
    "video/x-m4v": "m4v",
  };
  const ext = EXT[fileType] ?? "bin";
  const path = `dates/${id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  try {
    const { url, key } = await storage.put({
      path,
      data: buffer,
      contentType: fileType,
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
