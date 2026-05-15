import { Suspense } from "react";
import { requireApproved } from "@/lib/auth";
import { prisma } from "@/lib/db";
import PlanNewClient from "./PlanNewClient";

export const dynamic = "force-dynamic";

const STATIC_FALLBACK_CHIPS = [
  "#성수동",
  "#홍대",
  "#실내",
  "#한식",
  "#₩10만↓",
  "#차없이",
  "#비올때",
];

async function buildSuggestedChips(): Promise<string[]> {
  const dates = await prisma.date.findMany({
    select: { area: true },
    where: { area: { not: "" } },
  });
  const stops = await prisma.stop.findMany({
    select: { type: true },
    where: { type: { not: null } },
  });

  const areaCount = new Map<string, number>();
  for (const d of dates) {
    const a = d.area.trim();
    if (!a) continue;
    areaCount.set(a, (areaCount.get(a) ?? 0) + 1);
  }
  const typeCount = new Map<string, number>();
  for (const s of stops) {
    const t = (s.type ?? "").trim();
    if (!t) continue;
    typeCount.set(t, (typeCount.get(t) ?? 0) + 1);
  }

  const topAreas = [...areaCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([a]) => `#${a}`);
  const topTypes = [...typeCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => `#${t}`);

  const dynamic = [...topAreas, ...topTypes];
  if (dynamic.length >= 5) return dynamic.slice(0, 8);

  // 데이터 부족 → fallback 섞어서 채움
  const merged: string[] = [];
  const seen = new Set<string>();
  for (const c of [...dynamic, ...STATIC_FALLBACK_CHIPS]) {
    if (seen.has(c)) continue;
    seen.add(c);
    merged.push(c);
    if (merged.length >= 8) break;
  }
  return merged;
}

export default async function NewPlanPage() {
  await requireApproved();
  const chips = await buildSuggestedChips();
  return (
    <Suspense fallback={null}>
      <PlanNewClient chips={chips} />
    </Suspense>
  );
}
