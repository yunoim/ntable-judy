import { requireApproved } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { COUPLE_START_KIND } from "@/lib/saju";
import { computeMilestones } from "@/lib/milestones";
import UsClient from "./UsClient";

export const dynamic = "force-dynamic";

export default async function UsPage() {
  const me = await requireApproved();
  const now = new Date();

  const [anniversaries, buckets, capsules] = await Promise.all([
    prisma.anniversary.findMany({
      orderBy: { date: "asc" },
      include: { createdBy: { select: { id: true, nickname: true } } },
    }),
    prisma.bucket.findMany({
      orderBy: [{ done: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
      include: {
        doneDate: { select: { id: true, number: true, title: true } },
        createdBy: { select: { id: true, nickname: true } },
      },
    }),
    prisma.timeCapsule.findMany({
      orderBy: [{ opened: "asc" }, { openAt: "asc" }],
      include: { createdBy: { select: { id: true, nickname: true } } },
    }),
  ]);

  const coupleStart = anniversaries.find((a) => a.kind === COUPLE_START_KIND);
  const milestones = coupleStart
    ? computeMilestones(coupleStart.date.toISOString()).map((m) => ({
        key: m.key,
        label: m.label,
        emoji: m.emoji,
        date: m.date.toISOString(),
      }))
    : [];

  return (
    <UsClient
      meId={me.id}
      meRole={me.role}
      anniversaries={anniversaries.map((a) => ({
        id: a.id,
        label: a.label,
        date: a.date.toISOString(),
        emoji: a.emoji,
        recurring: a.recurring,
        kind: a.kind,
        createdBy: a.createdBy,
      }))}
      milestones={milestones}
      buckets={buckets.map((b) => ({
        id: b.id,
        title: b.title,
        emoji: b.emoji,
        description: b.description,
        area: b.area,
        priority: b.priority,
        done: b.done,
        doneAt: b.doneAt?.toISOString() ?? null,
        doneDate: b.doneDate
          ? { id: b.doneDate.id, number: b.doneDate.number, title: b.doneDate.title }
          : null,
        createdBy: b.createdBy,
      }))}
      capsules={capsules.map((c) => ({
        id: c.id,
        title: c.title,
        body: c.body,
        openAt: c.openAt.toISOString(),
        opened: c.opened,
        openedAt: c.openedAt?.toISOString() ?? null,
        createdById: c.createdById,
        createdBy: c.createdBy,
        canOpen: !c.opened && c.openAt.getTime() <= now.getTime(),
      }))}
    />
  );
}
