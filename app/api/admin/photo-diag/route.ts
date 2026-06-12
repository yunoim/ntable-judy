// Admin 진단 — 모든 DatePhoto URL 을 GET 으로 받아 sharp 로 decode 시도.
// HEAD 200 이라도 body 가 잘렸거나 깨진 이미지는 decode 단계에서 실패.
// 어떤 사진이 진짜 망가졌는지 (=재업로드 필요) 식별.
import { NextResponse } from "next/server";
import sharp from "sharp";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isVideoUrl } from "@/lib/mediaType";

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
  isVideo: boolean;
  error?: string;
};

async function probe(
  url: string,
): Promise<
  Omit<Diag, "id" | "dateId" | "dateNumber" | "dateTitle" | "key">
> {
  const isVideo = isVideoUrl(url);
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
        isVideo,
        error: `HTTP ${res.status}`,
      };
    }
    const ab = await res.arrayBuffer();
    const buf = Buffer.from(ab);
    const size = buf.length;
    const contentType = res.headers.get("content-type");
    if (isVideo) {
      // 영상은 sharp 디코드 X. 사이즈 + magic byte (ftyp box) 만 확인.
      // mp4: offset 4 부터 "ftyp" 가 있으면 일단 유효한 mp4.
      // brand (offset 8~12) 로 코덱 추정: isom/mp41/mp42 = H.264, hev1/hvc1 = HEVC.
      // ftyp 가 isom 같은 generic 이면 실제 트랙 코덱은 stsd 안의 atom 으로 결정 —
      // 처음 8KB 안에서 hvc1/hev1/avc1 signature 찾아 추가 확인.
      const hasFtyp = buf.length > 12 && buf.slice(4, 8).toString("ascii") === "ftyp";
      const brand = hasFtyp ? buf.slice(8, 12).toString("ascii") : null;
      const scanWindow = buf.slice(0, Math.min(buf.length, 8192));
      const hasHvc1 = scanWindow.includes(Buffer.from("hvc1"));
      const hasHev1 = scanWindow.includes(Buffer.from("hev1"));
      const hasAvc1 = scanWindow.includes(Buffer.from("avc1"));
      const codecGuess = !hasFtyp
        ? "mp4-no-ftyp"
        : hasHvc1 || hasHev1 || brand === "hvc1" || brand === "hev1" || brand === "heic"
          ? `HEVC (H.265) — Chrome 일부 device 만 재생 (brand=${brand}, hvc1=${hasHvc1}, hev1=${hasHev1})`
          : hasAvc1
            ? `H.264 — 거의 모든 브라우저 OK (brand=${brand}, avc1=true)`
            : `unknown codec (brand=${brand}, no hvc1/hev1/avc1 signature)`;
      return {
        url,
        status: res.status,
        contentType,
        size,
        width: null,
        height: null,
        format: codecGuess,
        decodable: size > 0 && (hasFtyp || size > 1024),
        isVideo,
        error:
          size === 0
            ? "empty_body"
            : hasFtyp
              ? undefined
              : "no_ftyp_marker (다른 영상 컨테이너일 수 있음)",
      };
    }
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
        isVideo,
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
        isVideo,
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
      isVideo,
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

  // R2 env 진단 (값은 노출 X, 존재 여부만).
  const env = {
    R2_ACCOUNT_ID: !!process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: !!process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: !!process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: !!process.env.R2_BUCKET_NAME,
    R2_PUBLIC_URL: process.env.R2_PUBLIC_URL ?? null,
  };

  // 최신 5개만 따로 표기 — 마지막 업로드 디버깅 편의.
  const recent = results.slice(-5).reverse();

  return NextResponse.json({
    env,
    total: results.length,
    decodableCount: decodable.length,
    brokenCount: broken.length,
    recent,
    broken,
    decodable: decodable.map((r) => ({
      id: r.id,
      dateNumber: r.dateNumber,
      size: r.size,
      width: r.width,
      height: r.height,
      format: r.format,
      isVideo: r.isVideo,
    })),
  });
}
