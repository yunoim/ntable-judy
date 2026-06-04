import { requireApproved } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { todayKstStr } from "@/lib/daily";
import CapsulesClient from "./CapsulesClient";

export const dynamic = "force-dynamic";

export default async function CapsulesPage() {
  const me = await requireApproved();
  const isAdmin = me.role === "admin";
  const [capsules, deleted] = await Promise.all([
    prisma.timeCapsule.findMany({
      where: { deletedAt: null },
      orderBy: { openAt: "asc" },
      include: { createdBy: { select: { id: true, nickname: true } } },
    }),
    isAdmin
      ? prisma.timeCapsule.findMany({
          where: { deletedAt: { not: null } },
          orderBy: { deletedAt: "desc" },
          include: { createdBy: { select: { id: true, nickname: true } } },
        })
      : Promise.resolve([]),
  ]);

  const todayKst = todayKstStr();
  const toItem = (c: (typeof capsules)[number]) => {
    const isOwner = c.createdById === me.id;
    // 봉인 + 비소유자에게는 본문 숨김 (네트워크 누수 방지).
    const visibleBody = c.opened || isOwner || isAdmin ? c.body : "";
    return {
      id: c.id,
      title: c.title,
      body: visibleBody,
      openAt: c.openAt.toISOString(),
      opened: c.opened,
      openedAt: c.openedAt?.toISOString() ?? null,
      createdById: c.createdById,
      createdBy: c.createdBy,
      canOpen: todayKstStr(new Date(c.openAt)) <= todayKst && !c.opened,
    };
  };

  return (
    <CapsulesClient
      meId={me.id}
      meRole={me.role}
      capsules={capsules.map(toItem)}
      deletedCapsules={deleted.map(toItem)}
    />
  );
}
