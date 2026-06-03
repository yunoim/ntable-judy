// Admin 진단 — 모든 DatePhoto URL 을 GET 으로 받아 sharp 로 decode 시도.
// HEAD 200 이라도 body 가 잘렸거나 깨진 이미지는 decode 단계에서 실패.
// 어떤 사진이 진짜 망가졌는지 (=재업로드 필요) 식별.
import { NextResponse } from "next/server";
import sharp from "sharp";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Diag = {
  id: number;
  dateId: string;
  dateNumber: number;
  dateTitle: string;
  url: string;
  key: string | null;
  status: number | "fetch_error";
  contentType: string | null;
  size: number | null;
  width: number | null;
  height: number | null;
  format: string | null;
  decodable: boolean;
  error?: string;
};

async function probe(
  url: string,
): Promise<
  Omit<Diag, "id" | "dateId" | "dateNumber" | "dateTitle" | "key">
> {
  try {
    const res = await fetch(url, { cache: "no-store", redirect: "follow" });
    if (!res.ok) {
      return {
        url,
        status: res.status,
        contentType: res.headers.get("content-type"),
        size: null,
        width: null,
        height: null,
        format: null,
        decodable: false,
        error: `HTTP ${res.status}`,
      };
    }
    const ab = await res.arrayBuffer();
    const buf = Buffer.from(ab);
    const size = buf.length;
    const contentType = res.headers.get("content-type");
    try {
      const meta = await sharp(buf).metadata();
      return {
        url,
        status: res.status,
        contentType,
        size,
        width: meta.width ?? null,
        height: meta.height ?? null,
        format: meta.format ?? null,
        decodable: true,
      };
    } catch (e: any) {
      return {
        url,
        status: res.status,
        contentType,
        size,
        width: null,
        height: null,
        format: null,
        decodable: false,
        error: `decode_failed: ${e?.message ?? "unknown"}`,
      };
    }
  } catch (e: any) {
    return {
      url,
      status: "fetch_error",
      contentType: null,
      size: null,
      width: null,
      height: null,
      format: null,
      decodable: false,
      error: e?.message ?? "unknown",
    };
  }
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const photos = await prisma.datePhoto.findMany({
    select: {
      id: true,
      url: true,
      key: true,
      date: {
        select: { id: true, number: true, title: true, scheduledAt: true },
      },
    },
    orderBy: { id: "asc" },
  });

  // 동시 4개 worker — body 다 받아오니 너무 병렬화하면 메모리 압박.
  const results: Diag[] = [];
  const queue = [...photos];
  const concurrency = 4;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (queue.length) {
        const p = queue.shift();
        if (!p) break;
        const probed = await probe(p.url);
        results.push({
          id: p.id,
          dateId: p.date.id,
          dateNumber: p.date.number,
          dateTitle: p.date.title,
          key: p.key,
          ...probed,
        });
      }
    }),
  );
  results.sort((a, b) => a.id - b.id);

  const decodable = results.filter((r) => r.decodable);
  const broken = results.filter((r) => !r.decodable);

  return NextResponse.json({
    total: results.length,
    decodableCount: decodable.length,
    brokenCount: broken.length,
    broken,
    decodable: decodable.map((r) => ({
      id: r.id,
      dateNumber: r.dateNumber,
      size: r.size,
      width: r.width,
      height: r.height,
      format: r.format,
    })),
    r2PublicUrl: process.env.R2_PUBLIC_URL ?? null,
  });
}
