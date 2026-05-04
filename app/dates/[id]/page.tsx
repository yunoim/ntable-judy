// app/dates/[id]/page.tsx — 데이트 상세 (date_schedule_v4 기반)
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDateById, getAllDates, prisma } from "@/lib/db";
import { requireApproved } from "@/lib/auth";
import { TabBar } from "@/components/ui";
import Rain from "@/components/Rain";
import CommentsSection from "./CommentsSection";
import PhotosSection from "./PhotosSection";

export const dynamic = "force-dynamic";

const KO_ORDINALS = [
  "",
  "첫",
  "두",
  "세",
  "네",
  "다섯",
  "여섯",
  "일곱",
  "여덟",
  "아홉",
  "열",
];

function ordinal(n: number) {
  return KO_ORDINALS[n] ?? `${n}`;
}

export default async function DateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await requireApproved();
  const { id } = await params;
  const [date, all, comments, photos] = await Promise.all([
    getDateById(id),
    getAllDates(),
    prisma.dateComment.findMany({
      where: { dateId: id },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, nickname: true, emoji: true } } },
    }),
    prisma.datePhoto.findMany({
      where: { dateId: id },
      orderBy: { createdAt: "desc" },
      include: {
        uploadedBy: { select: { id: true, nickname: true, emoji: true } },
      },
    }),
  ]);
  if (!date) notFound();
  const canEdit = ["admin", "approved"].includes(me.role);
  const history = all
    .filter((d) => d.number <= date.number && d.historyLabel)
    .sort((a, b) => a.number - b.number)
    .map((d) => d.historyLabel as string);

  const dt = new Date(date.scheduledAt);
  const dateLabel = dt.toLocaleDateString("ko", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  const timeRange =
    date.startTime && date.endTime
      ? `${date.startTime} - ${date.endTime}`
      : null;

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {date.weather === "rain" && <Rain />}

      {canEdit && (
        <Link
          href={`/dates/${date.id}/edit`}
          className="absolute top-3 right-3 z-20 text-[11px] text-fg-faint border border-fg/20 rounded-full px-2.5 py-1 bg-bg/80 backdrop-blur"
          aria-label="편집"
        >
          ✏ 편집
        </Link>
      )}

      <main className="relative z-10 px-5 pt-10 pb-24 w-full flex-1">
        <header className="text-center mb-8">
          <span
            className="inline-block text-[10px] tracking-[3px] uppercase border border-accent rounded-full px-3.5 py-1.5 mb-4"
            style={{ color: "var(--fg-soft)" }}
          >
            {dateLabel} · {date.area}
          </span>
          <h1 className="font-display text-4xl leading-tight">
            우리의
            <br />
            <em className="not-italic font-display italic text-accent">
              {ordinal(date.number)} 번째
            </em>{" "}
            날
          </h1>
          {date.subtitle && (
            <p
              className="text-xs tracking-widest uppercase mt-2.5"
              style={{ color: "var(--fg-soft)" }}
            >
              {date.subtitle}
            </p>
          )}
          {date.weather === "rain" && (
            <span className="inline-flex items-center gap-1.5 text-xs text-rain bg-rain/10 px-3.5 py-1 rounded-full mt-3.5">
              ☔ 비 오는 날
            </span>
          )}
          {timeRange && (
            <p className="text-[11px] text-fg-faint mt-2 tracking-wider">
              {timeRange}
            </p>
          )}
        </header>

        {date.themeNote && (
          <section className="mb-8 p-5 rounded-card bg-bg-warm border border-accent/30">
            <p className="text-[10px] tracking-[3px] uppercase text-accent mb-3">
              ✦ 오늘의 테마
            </p>
            {history.length > 1 && (
              <p className="text-[11px] text-fg-faint mb-3 tracking-wider">
                {history.join(" · ")}
              </p>
            )}
            <p className="text-sm leading-loose" style={{ color: "var(--fg-soft)" }}>
              {date.themeNote}
            </p>
          </section>
        )}

        {date.plan.stops.length > 0 && (
          <ol className="relative pl-6 space-y-5">
            <span
              className="absolute left-[7px] top-2 bottom-2 w-px"
              style={{
                background:
                  "repeating-linear-gradient(to bottom, var(--accent) 0 4px, transparent 4px 8px)",
              }}
              aria-hidden
            />
            {date.plan.stops.map((stop, idx) => (
              <li key={idx} className="relative">
                <span
                  className="absolute left-[-21px] top-3 w-3 h-3 rounded-full border-2 border-bg"
                  style={{ background: "var(--accent)" }}
                  aria-hidden
                />
                <div className="bg-bg-warm/70 rounded-card p-4 border border-fg/10">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="font-display text-base text-accent tracking-wider">
                      {stop.time}
                    </span>
                    <span className="text-lg leading-none">{stop.emoji}</span>
                  </div>
                  <p className="font-display text-lg leading-tight">
                    {stop.name}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    {stop.type && (
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-fg/30 text-fg-faint">
                        {stop.type}
                      </span>
                    )}
                    {stop.reserved && (
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent text-bg">
                        예약 완료
                      </span>
                    )}
                  </div>
                  {stop.description && (
                    <p
                      className="text-xs leading-relaxed mt-2 italic"
                      style={{ color: "var(--fg-soft)" }}
                    >
                      {stop.description}
                    </p>
                  )}
                  {stop.address && (
                    <p className="text-[11px] text-fg-faint mt-2">
                      📍 {stop.address}
                    </p>
                  )}
                  <div className="flex gap-1.5 mt-3">
                    <a
                      href={
                        stop.naverMapUrl ??
                        `https://map.naver.com/p/search/${encodeURIComponent(stop.mapQuery)}`
                      }
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-[11px] px-2.5 py-1 rounded-full border border-fg/30 hover:border-accent"
                    >
                      🗺 네이버 지도
                    </a>
                    {stop.reservationUrl && (
                      <a
                        href={stop.reservationUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-[11px] px-2.5 py-1 rounded-full border border-fg/30 hover:border-accent"
                      >
                        🔗 예약
                      </a>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}

        {(date.reviews.length > 0 || (canEdit && date.status === "done")) && (
          <section className="mt-10 space-y-3">
            <p className="eyebrow">★ 후기 · {date.reviews.length}</p>
            {date.reviews.length > 0 && (
              <ul className="space-y-2.5">
                {date.reviews.map((r) => {
                  const filled = "★".repeat(r.stars);
                  const empty = "★".repeat(Math.max(0, 5 - r.stars));
                  return (
                    <li
                      key={r.userId}
                      className="editorial-card px-4 py-3 flex gap-3 items-start"
                    >
                      <span className="text-base shrink-0 mt-0.5">
                        {r.userEmoji ?? "👤"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="font-display text-sm">
                            {r.userNickname}
                          </span>
                          <span className="font-display text-accent text-sm tracking-wider">
                            {filled}
                            <span className="text-fg-faint/40">{empty}</span>
                          </span>
                        </div>
                        {r.oneLine && (
                          <p className="text-sm text-fg-soft leading-relaxed mt-1.5 italic">
                            &ldquo;{r.oneLine}&rdquo;
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {canEdit && date.status === "done" && (
              <div className="flex justify-center pt-1">
                <Link
                  href={`/dates/${date.id}/review`}
                  className="text-xs px-4 py-2 rounded-full border border-accent text-accent"
                >
                  ★ 리뷰{" "}
                  {date.reviews.some((r) => r.userId === me?.id)
                    ? "수정"
                    : "남기기"}
                </Link>
              </div>
            )}
          </section>
        )}

        <PhotosSection
          dateId={date.id}
          initial={photos.map((p) => ({
            id: p.id,
            url: p.url,
            caption: p.caption,
            width: p.width,
            height: p.height,
            uploadedBy: p.uploadedBy,
            createdAt: p.createdAt.toISOString(),
          }))}
          meId={me.id}
          meRole={me.role}
        />

        <CommentsSection
          dateId={date.id}
          initial={comments.map((c) => ({
            id: c.id,
            body: c.body,
            createdAt: c.createdAt.toISOString(),
            user: c.user,
          }))}
          meId={me.id}
          meRole={me.role}
        />

        <footer className="text-center mt-11">
          <div className="text-2xl tracking-widest mb-2.5">🦊 🌧️ 🐰</div>
          <p
            className="text-xs italic tracking-wider"
            style={{ color: "var(--fg-soft)" }}
          >
            용광로와 무쇠의 {ordinal(date.number)} 번째 날
          </p>
        </footer>
      </main>

      <TabBar active="home" />
    </div>
  );
}
