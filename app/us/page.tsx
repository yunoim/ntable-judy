import { requireApproved } from "@/lib/auth";
import { prisma } from "@/lib/db";
import UsClient from "./UsClient";

export const dynamic = "force-dynamic";

export default async function UsPage() {
  const me = await requireApproved();

  const anniversaries = await prisma.anniversary.findMany({
    orderBy: { date: "asc" },
    include: { createdBy: { select: { id: true, nickname: true } } },
  });

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
        createdBy: a.createdBy,
      }))}
    />
  );
}
