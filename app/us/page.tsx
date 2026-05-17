import { requireApproved } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { COUPLE_START_KIND } from "@/lib/saju";
import { computeMilestones } from "@/lib/milestones";
import UsClient from "./UsClient";

export const dynamic = "force-dynamic";

export default async function UsPage() {
  const me = await requireApproved();

  const anniversaries = await prisma.anniversary.findMany({
    orderBy: { date: "asc" },
    include: { createdBy: { select: { id: true, nickname: true } } },
  });

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
    />
  );
}
