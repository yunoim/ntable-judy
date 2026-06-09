// Presigned PUT 완료 후 DatePhoto row 생성.
// key 는 init 에서 받은 값. 위·변조 방지를 위해 `dates/{id}/` prefix 검증.
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { notifyOthers } from "@/lib/push";

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
  const key: string = typeof body.key === "string" ? body.key : "";
  const caption: string | null =
    typeof body.caption === "string" && body.caption.trim()
      ? body.caption.trim()
      : null;
  const publicUrl: string =
    typeof body.publicUrl === "string" ? body.publicUrl : "";

  // 위·변조 방지: 본인이 init 으로 받은 dateId 매칭 prefix 만 허용.
  if (!key.startsWith(`dates/${id}/`)) {
    return NextResponse.json({ error: "bad_key" }, { status: 400 });
  }
  if (!publicUrl) {
    return NextResponse.json({ error: "no_public_url" }, { status: 400 });
  }

  // R2 에 진짜 올라와 있는지 확인 — 빈 finalize 호출로 row 만 만드는 거 차단.
  const exists = await storage.headExists(key);
  if (!exists) {
    return NextResponse.json(
      { error: "object_missing", detail: "R2 객체를 찾을 수 없어요" },
      { status: 400 },
    );
  }

  try {
    const created = await prisma.datePhoto.create({
      data: {
        dateId: id,
        url: publicUrl,
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
    console.error("[photos/finalize]", e);
    return NextResponse.json(
      { error: "finalize_failed", detail: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}
