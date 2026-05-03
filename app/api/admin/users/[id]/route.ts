import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Action = "approve" | "reject" | "unblock" | "setPartner";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentUser();
  if (!admin) return NextResponse.json({ error: "unauth" }, { status: 401 });
  if (admin.role !== "admin")
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = body.action as Action | undefined;

  if (
    !action ||
    !["approve", "reject", "unblock", "setPartner"].includes(action)
  ) {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (target.role === "admin" && action !== "setPartner")
    return NextResponse.json({ error: "cannot_modify_admin" }, { status: 403 });

  if (action === "setPartner") {
    if (!["approved", "admin"].includes(target.role)) {
      return NextResponse.json(
        { error: "must_be_approved" },
        { status: 400 },
      );
    }
    // 기존 partner 해제 후 이 사용자만 set
    await prisma.$transaction([
      prisma.user.updateMany({
        where: { partner: true, NOT: { id: target.id } },
        data: { partner: false },
      }),
      prisma.user.update({ where: { id: target.id }, data: { partner: true } }),
    ]);
    return NextResponse.json({ ok: true, partnerId: target.id });
  }

  const update: Record<string, unknown> = {};
  if (action === "approve") {
    update.role = "approved";
    update.approvedAt = new Date();
    update.approvedBy = admin.id;
    update.rejectedAt = null;
    update.rejectedBy = null;
    // 파트너가 아직 아무도 없으면 자동 지정 (첫 approved 사용자 편의)
    const hasPartner = await prisma.user.count({ where: { partner: true } });
    if (hasPartner === 0) update.partner = true;
  } else if (action === "reject") {
    update.role = "rejected";
    update.rejectedAt = new Date();
    update.rejectedBy = admin.id;
    update.partner = false; // 차단되면 파트너 자격도 해제
    await prisma.session.deleteMany({ where: { userId: id } });
  } else {
    update.role = "pending";
    update.rejectedAt = null;
    update.rejectedBy = null;
    update.partner = false;
  }

  const updated = await prisma.user.update({ where: { id }, data: update });
  return NextResponse.json({
    user: {
      id: updated.id,
      role: updated.role,
      nickname: updated.nickname,
      partner: updated.partner,
    },
  });
}
