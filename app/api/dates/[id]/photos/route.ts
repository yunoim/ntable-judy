// 사진/영상 업로드 — 단일 엔드포인트, 서버가 raw 바디를 R2 에 스트리밍.
// 클라이언트 → 서버 (same-origin, CORS 무관) → R2 (서버 권한으로 PUT).
// 메모리는 part 단위(5MB) 만 유지 → 큰 영상도 OK.
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Readable } from "node:stream";
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

  // Web ReadableStream → Node Readable (AWS SDK lib-storage 는 둘 다 받지만
  // 일부 버전에서 Web stream 처리가 불안정해 Node Readable 로 변환).
  // 변환 중 size cap 초과 감시 — 초과 즉시 abort.
  let received = 0;
  const abortedRef: { current: { error: string; detail?: string } | null } = {
    current: null,
  };
  const reader = req.body.getReader();
  const nodeStream = new Readable({
    async read() {
      if (abortedRef.current) {
        this.destroy(new Error(abortedRef.current.error));
        return;
      }
      try {
        const { value, done } = await reader.read();
        if (done) {
          this.push(null);
          return;
        }
        received += value.byteLength;
        if (received > sizeCap) {
          abortedRef.current = {
            error: "too_large",
            detail: `${Math.round(received / 1024 / 1024)}MB > ${Math.round(sizeCap / 1024 / 1024)}MB`,
          };
          this.destroy(new Error("too_large"));
          return;
        }
        this.push(Buffer.from(value));
      } catch (e: any) {
        this.destroy(e instanceof Error ? e : new Error(String(e)));
      }
    },
  });

  let putResult: { url: string; key: string };
  try {
    putResult = await storage.putStream({
      path,
      body: nodeStream,
      contentType: fileType,
    });
  } catch (e: any) {
    console.error("[photos] stream upload failed", e);
    if (abortedRef.current) {
      return NextResponse.json(
        {
          error: abortedRef.current.error,
          detail: abortedRef.current.detail,
        },
        { status: 400 },
      );
    }
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
