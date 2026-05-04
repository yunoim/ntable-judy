import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sendPushTo } from "@/lib/push";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const r = await sendPushTo(user.id, {
    title: "judy.ntable · 테스트",
    body: "푸시 알림이 잘 작동해요 ✓",
    url: "/",
  });
  return NextResponse.json(r);
}
