import { requireApproved } from "@/lib/auth";
import { prisma } from "@/lib/db";
import CapsulesClient from "./CapsulesClient";

export const dynamic = "force-dynamic";

export default async function CapsulesPage() {
  const me = await requireApproved();
  const capsules = await prisma.timeCapsule.findMany({
    orderBy: { openAt: "asc" },
    include: { createdBy: { select: { id: true, nickname: true } } },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

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
        canOpen:
          new Date(c.openAt).setHours(0, 0, 0, 0) <= today.getTime() &&
          !c.opened,
      }))}
    />
  );
}
