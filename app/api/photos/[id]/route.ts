import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId)) {
    return NextResponse.json({ error: "bad_id" }, { status: 400 });
  }
  const existing = await prisma.datePhoto.findUnique({
    where: { id: numId },
  });
  if (!existing)
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (user.role !== "admin" && existing.uploadedById !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      await del(existing.url);
    } catch {
      // 블롭 정리 실패는 무시 (DB row만 삭제)
    }
  }
  await prisma.datePhoto.delete({ where: { id: numId } });
  revalidatePath(`/dates/${existing.dateId}`);
  return NextResponse.json({ ok: true });
}
