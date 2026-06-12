// 사진/영상 업로드 — 단일 엔드포인트, 서버가 raw 바디를 R2 에 스트리밍.
// 클라이언트 → 서버 (same-origin, CORS 무관) → R2 (서버 권한으로 PUT).
// 메모리는 part 단위(5MB) 만 유지 → 큰 영상도 OK.
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { notifyOthers } from "@/lib/push";
import {
  EXT_BY_MIME,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  checkMimeAndSize,
} from "@/lib/photo-limits";

// Railway/Node 기본 timeout 이 짧지 않게.
export const maxDuration = 300;

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
  const declaredLen = Number(req.headers.get("content-length") ?? "0");

  const check = checkMimeAndSize(
    fileType,
    declaredLen > 0 ? declaredLen : null,
  );
  if (!check.ok) {
    return NextResponse.json(
      { error: check.error, detail: check.detail },
      { status: check.status },
    );
  }
  const sizeCap = check.isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;

  const ext = EXT_BY_MIME[fileType] ?? "bin";
  const path = `dates/${id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  if (!req.body) {
    return NextResponse.json({ error: "no_body" }, { status: 400 });
  }

  // 작은 파일은 그냥 버퍼링 — 메모리 부담 X, stream 변환 버그 회피.
  // 큰 파일도 80MB 까지는 Railway 메모리 여유 안 — 다 버퍼링.
  let buffer: Buffer;
  try {
    const ab = await req.arrayBuffer();
    buffer = Buffer.from(ab);
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

  let putResult: { url: string; key: string };
  try {
    putResult = await storage.put({
      path,
      data: buffer,
      contentType: fileType,
    });
  } catch (e: any) {
    console.error("[photos] R2 upload failed", e);
    const name = e?.name ?? e?.Code ?? null;
    const msg = e?.message ?? String(e);
    return NextResponse.json(
      { error: "upload_failed", detail: name ? `${name}: ${msg}` : msg },
      { status: 500 },
    );
  }

  try {
    const created = await prisma.datePhoto.create({
      data: {
        dateId: id,
        url: putResult.url,
        key: putResult.key,
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
    console.error("[photos] db create failed", e);
    return NextResponse.json(
      { error: "db_failed", detail: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}
