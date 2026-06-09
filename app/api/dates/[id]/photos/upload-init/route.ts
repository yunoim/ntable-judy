// Presigned URL 발급 — 클라가 R2 에 직접 PUT 한다.
// Cloudflare/Railway 프록시 우회 → 큰 영상도 100MB+ 가능.
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { EXT_BY_MIME, checkMimeAndSize } from "@/lib/photo-limits";

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

  const body = await req.json().catch(() => ({}));
  const contentType: string =
    typeof body.contentType === "string" ? body.contentType : "";
  const size: number =
    typeof body.size === "number" && Number.isFinite(body.size) ? body.size : 0;

  const check = checkMimeAndSize(contentType, size > 0 ? size : null);
  if (!check.ok) {
    return NextResponse.json(
      { error: check.error, detail: check.detail },
      { status: check.status },
    );
  }
  const t = contentType.split(";")[0].trim().toLowerCase();
  const ext = EXT_BY_MIME[t] ?? "bin";
  const path = `dates/${id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  try {
    const presigned = await storage.getPresignedPutUrl({
      path,
      contentType: t,
      expiresSec: 600,
    });
    return NextResponse.json(presigned);
  } catch (e: any) {
    console.error("[photos/init]", e);
    return NextResponse.json(
      { error: "presign_failed", detail: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}
