// app/RecentActivity.tsx — 홈 페이지의 '최근 활동' 피드.
// 다양한 모델 (Date / Review / DateComment / DatePhoto / Anniversary / Bucket
// / TimeCapsule / PersonalEvent) 에서 최근 항목을 모아 시간 역순으로 노출.
// 누가 뭘 등록했는지 한눈에 보이도록.
import Link from "next/link";
import { prisma } from "@/lib/db";

type ActivityItem = {
  id: string;
  user: { id: string; nickname: string; emoji: string | null };
  text: string;
  href: string;
  createdAt: Date;
};

function relTime(d: Date): string {
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "방금";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return d.toLocaleDateString("ko", { month: "long", day: "numeric" });
}

export default async function RecentActivity({
  limit = 6,
}: {
  limit?: number;
}) {
  const userSel = { id: true, nickname: true, emoji: true };

  // 일부 모델/쿼리가 실패해도 다른 활동은 보여야 하므로 개별 catch.
  const safe = async <T,>(p: Promise<T[]>): Promise<T[]> => {
    try {
      return await p;
    } catch (e) {
      console.error("[RecentActivity] query failed", e);
      return [];
    }
  };

  const [dates, reviews, comments, photos, annis, buckets, capsules, events] =
    await Promise.all([
      safe(prisma.date.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          number: true,
          createdAt: true,
          createdBy: { select: userSel },
        },
      })),
      safe(prisma.review.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          stars: true,
          createdAt: true,
          user: { select: userSel },
          date: { select: { id: true, title: true, number: true } },
        },
      })),
      safe(prisma.dateComment.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          body: true,
          createdAt: true,
          user: { select: userSel },
          date: { select: { id: true, title: true, number: true } },
        },
      })),
      safe(prisma.datePhoto.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          createdAt: true,
          uploadedBy: { select: userSel },
          date: { select: { id: true, title: true, number: true } },
        },
      })),
      safe(prisma.anniversary.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          label: true,
          emoji: true,
          createdAt: true,
          createdBy: { select: userSel },
        },
      })),
      safe(prisma.bucket.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          done: true,
          createdAt: true,
          createdBy: { select: userSel },
        },
      })),
      safe(prisma.timeCapsule.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          createdAt: true,
          createdBy: { select: userSel },
        },
      })),
      safe(prisma.personalEvent.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          createdAt: true,
          user: { select: userSel },
        },
      })),
    ]);

  const items: ActivityItem[] = [];

  for (const d of dates) {
    items.push({
      id: `d${d.id}`,
      user: d.createdBy,
      text: `데이트 #${String(d.number).padStart(2, "0")} ${d.title}`,
      href: `/dates/${d.id}`,
      createdAt: d.createdAt,
    });
  }
  for (const r of reviews) {
    items.push({
      id: `r${r.id}`,
      user: r.user,
      text: `#${String(r.date.number).padStart(2, "0")} 후기 (★ ${r.stars})`,
      href: `/dates/${r.date.id}`,
      createdAt: r.createdAt,
    });
  }
  for (const c of comments) {
    items.push({
      id: `c${c.id}`,
      user: c.user,
      text: `#${String(c.date.number).padStart(2, "0")} 댓글: "${c.body.slice(0, 24)}${c.body.length > 24 ? "…" : ""}"`,
      href: `/dates/${c.date.id}`,
      createdAt: c.createdAt,
    });
  }
  for (const p of photos) {
    items.push({
      id: `p${p.id}`,
      user: p.uploadedBy,
      text: `#${String(p.date.number).padStart(2, "0")} 사진 추가`,
      href: `/dates/${p.date.id}`,
      createdAt: p.createdAt,
    });
  }
  for (const a of annis) {
    items.push({
      id: `a${a.id}`,
      user: a.createdBy,
      text: `${a.emoji ?? "📅"} 기념일 "${a.label}"`,
      href: `/us`,
      createdAt: a.createdAt,
    });
  }
  for (const b of buckets) {
    items.push({
      id: `bk${b.id}`,
      user: b.createdBy,
      text: `🪣 버킷리스트 "${b.title}"${b.done ? " 완료" : ""}`,
      href: `/buckets`,
      createdAt: b.createdAt,
    });
  }
  for (const c of capsules) {
    items.push({
      id: `tc${c.id}`,
      user: c.createdBy,
      text: `💌 타임캡슐 "${c.title}" 봉인`,
      href: `/capsules`,
      createdAt: c.createdAt,
    });
  }
  for (const e of events) {
    items.push({
      id: `e${e.id}`,
      user: e.user,
      text: `📌 일정 "${e.title}"`,
      href: `/timeline`,
      createdAt: e.createdAt,
    });
  }

  const sorted = items
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);

  return (
    <section className="space-y-2">
      <p className="text-[11px] text-fg-faint tracking-wider uppercase">
        최근 활동
      </p>
      {sorted.length === 0 ? (
        <p className="text-[11px] text-fg-faint italic px-1">
          아직 활동이 없어요.
        </p>
      ) : (
      <ul className="rounded-card border border-fg/10 divide-y divide-fg/8 overflow-hidden">
        {sorted.map((it) => (
          <li key={it.id}>
            <Link
              href={it.href}
              className="tap flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-bg-warm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base shrink-0">
                  {it.user.emoji ?? "👤"}
                </span>
                <p className="text-[12px] truncate">
                  <span className="font-display text-fg">
                    {it.user.nickname}
                  </span>
                  <span className="text-fg-soft"> · {it.text}</span>
                </p>
              </div>
              <span className="text-[10px] text-fg-faint shrink-0">
                {relTime(it.createdAt)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      )}
    </section>
  );
}
