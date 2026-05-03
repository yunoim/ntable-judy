import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Action = "approve" | "reject" | "unblock";

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

  if (!action || !["approve", "reject", "unblock"].includes(action)) {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (target.role === "admin")
    return NextResponse.json({ error: "cannot_modify_admin" }, { status: 403 });

  const update: Record<string, unknown> = {};
  if (action === "approve") {
    update.role = "approved";
    update.approvedAt = new Date();
    update.approvedBy = admin.id;
    update.rejectedAt = null;
    update.rejectedBy = null;
  } else if (action === "reject") {
    update.role = "rejected";
    update.rejectedAt = new Date();
    update.rejectedBy = admin.id;
    await prisma.session.deleteMany({ where: { userId: id } });
  } else {
    update.role = "pending";
    update.rejectedAt = null;
    update.rejectedBy = null;
  }

  const updated = await prisma.user.update({ where: { id }, data: update });
  return NextResponse.json({
    user: { id: updated.id, role: updated.role, nickname: updated.nickname },
  });
}
