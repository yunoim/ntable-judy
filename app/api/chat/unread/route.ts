// 안 읽은 채팅 메시지 수.
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ count: 0 });
  try {
    const read = await prisma.chatRead.findUnique({
      where: { userId: user.id },
    });
    const lastReadId = read?.lastReadId ?? 0;
    const count = await prisma.chatMessage.count({
      where: { id: { gt: lastReadId }, NOT: { userId: user.id } },
    });
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
