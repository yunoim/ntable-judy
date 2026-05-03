// app/api/reviews/route.ts — 리뷰 작성
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { MOCK_DATES } from "@/lib/data";

export async function POST(req: Request) {
  const c = await cookies();
  const uid = c.get("uid")?.value as "judy" | "me" | undefined;
  if (!uid) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const { dateId, stars, oneLine, tags } = await req.json();
  // Claude Code: replace with prisma upsert
  const d = MOCK_DATES.find((x) => x.id === dateId);
  if (!d) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const existing = d.reviews.findIndex((r) => r.userId === uid);
  const review = { userId: uid, stars, oneLine };
  if (existing >= 0) d.reviews[existing] = review;
  else d.reviews.push(review);
  if (tags?.length) d.tags = [...new Set([...(d.tags ?? []), ...tags])];

  return NextResponse.json({ ok: true });
}
