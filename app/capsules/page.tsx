import { requireApproved } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { todayKstStr } from "@/lib/daily";
import CapsulesClient from "./CapsulesClient";

export const dynamic = "force-dynamic";

export default async function CapsulesPage() {
  const me = await requireApproved();
  const capsules = await prisma.timeCapsule.findMany({
    orderBy: { openAt: "asc" },
    include: { createdBy: { select: { id: true, nickname: true } } },
  });

  const todayKst = todayKstStr();

  return (
    <CapsulesClient
      meId={me.id}
      meRole={me.role}
      capsules={capsules.map((c) => ({
        id: c.id,
        title: c.title,
        body: c.body,
        openAt: c.openAt.toISOString(),
        opened: c.opened,
        openedAt: c.openedAt?.toISOString() ?? null,
        createdById: c.createdById,
        createdBy: c.createdBy,
        // KST 기준 날짜 비교 (서버 UTC 자정 비교 시 KST 0~9시에 안 열리는 버그 회피).
        canOpen: todayKstStr(new Date(c.openAt)) <= todayKst && !c.opened,
      }))}
    />
  );
}
