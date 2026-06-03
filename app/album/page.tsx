// app/album/page.tsx — 모든 데이트 사진 한 화면 (월별 그룹) + 사진 등록 진입
import { prisma, getPastDates } from "@/lib/db";
import { requireApproved } from "@/lib/auth";
import { TabBar } from "@/components/ui";
import AlbumGrid, { type AlbumPhoto } from "./AlbumGrid";
import AlbumUploadFlow, {
  type UploadTargetDate,
} from "./AlbumUploadFlow";

export const dynamic = "force-dynamic";

const KO_MONTH = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
];

function formatYm(ym: string): string {
  // YYYY-MM → "2026년 5월"
  const [y, m] = ym.split("-");
  return `${y}년 ${KO_MONTH[Number(m) - 1] ?? m + "월"}`;
}

export default async function AlbumPage() {
  const me = await requireApproved();

  const [photos, pastDates] = await Promise.all([
    prisma.datePhoto.findMany({
      orderBy: [{ date: { scheduledAt: "desc" } }, { createdAt: "desc" }],
      include: {
        date: {
          select: { id: true, title: true, scheduledAt: true, number: true },
        },
        uploadedBy: { select: { id: true, nickname: true, emoji: true } },
      },
    }),
    getPastDates(),
  ]);

  const uploadTargets: UploadTargetDate[] = pastDates.map((d) => ({
    id: d.id,
    number: d.number,
    title: d.title,
    scheduledAt: new Date(d.scheduledAt).toISOString(),
    area: d.area ?? null,
  }));

  // 데이트의 scheduledAt 기준 YYYY-MM 으로 그룹.
  // (사진 업로드 시점이 아닌 "그 데이트가 있었던 월" 기준이 회상에 자연스러움.)
  const groups = new Map<string, AlbumPhoto[]>();
  for (const p of photos) {
    const ym = p.date.scheduledAt.toISOString().slice(0, 7);
    const item: AlbumPhoto = {
      id: p.id,
      url: p.url,
      caption: p.caption,
      createdAt: p.createdAt.toISOString(),
      dateId: p.date.id,
      dateTitle: p.date.title,
      dateNumber: p.date.number,
      dateScheduledAt: p.date.scheduledAt.toISOString(),
      uploadedBy: p.uploadedBy,
    };
    const arr = groups.get(ym);
    if (arr) arr.push(item);
    else groups.set(ym, [item]);
  }
  const sortedGroups = Array.from(groups.entries()).sort(([a], [b]) =>
    b.localeCompare(a),
  );

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 px-5 pt-6 safe-top pb-28 space-y-7">
        {photos.length === 0 ? (
          <div className="text-center pt-16 pb-8 space-y-3">
            <p className="text-5xl">📷</p>
            <p className="font-display text-lg">
              아직 <em className="italic text-accent">사진</em>이 없어요
            </p>
            <p className="text-[11px] text-fg-faint leading-relaxed px-6">
              우측 하단 <em className="italic text-accent">+</em> 버튼으로
              데이트 골라 사진을 올려보세요.
            </p>
          </div>
        ) : (
          sortedGroups.map(([ym, items]) => (
            <section key={ym} className="space-y-2.5">
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-base">{formatYm(ym)}</h2>
                <span className="text-[11px] text-fg-faint">
                  {items.length}장
                </span>
              </div>
              <AlbumGrid items={items} meId={me.id} meRole={me.role} />
            </section>
          ))
        )}
      </main>

      <AlbumUploadFlow dates={uploadTargets} />
      <TabBar active="album" />
    </div>
  );
}
