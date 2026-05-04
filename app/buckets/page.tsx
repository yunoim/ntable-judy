import { requireApproved } from "@/lib/auth";
import { prisma } from "@/lib/db";
import BucketsClient from "./BucketsClient";

export const dynamic = "force-dynamic";

export default async function BucketsPage() {
  const me = await requireApproved();
  const buckets = await prisma.bucket.findMany({
    orderBy: [{ done: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
    include: {
      doneDate: { select: { id: true, number: true, title: true } },
      createdBy: { select: { id: true, nickname: true } },
    },
  });

  return (
    <BucketsClient
      meId={me.id}
      meRole={me.role}
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
    />
  );
}
