// Admin 진단 — 모든 DatePhoto URL 에 HEAD 요청해서 깨진 사진 식별.
// PWA 에서만 안 보이는 케이스 vs 객관적으로 깨진 케이스 구분용.
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type Diag = {
  id: number;
  dateId: string;
  dateNumber: number;
  dateTitle: string;
  url: string;
  key: string | null;
  status: number | "fetch_error";
  contentType: string | null;
  contentLength: string | null;
  error?: string;
};

async function probe(url: string): Promise<Omit<Diag, "id" | "dateId" | "dateNumber" | "dateTitle" | "key">> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      cache: "no-store",
      redirect: "follow",
    });
    return {
      url,
      status: res.status,
      contentType: res.headers.get("content-type"),
      contentLength: res.headers.get("content-length"),
    };
  } catch (e: any) {
    return {
      url,
      status: "fetch_error",
      contentType: null,
      contentLength: null,
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

  // 동시 6개 worker 로 HEAD.
  const results: Diag[] = [];
  const queue = [...photos];
  const concurrency = 6;
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

  const ok = results.filter(
    (r) => typeof r.status === "number" && r.status >= 200 && r.status < 300,
  );
  const bad = results.filter((r) => !ok.includes(r));

  return NextResponse.json({
    total: results.length,
    okCount: ok.length,
    badCount: bad.length,
    bad,
    ok: ok.map((r) => ({ id: r.id, status: r.status, contentType: r.contentType })),
    r2PublicUrl: process.env.R2_PUBLIC_URL ?? null,
  });
}
