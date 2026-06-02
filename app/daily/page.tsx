// app/daily/page.tsx — 데일리 Q&A 히스토리 (둘 다 답한 날만).
import Link from "next/link";
import { prisma, getActiveUsers } from "@/lib/db";
import { requireApproved } from "@/lib/auth";
import { todayKstStr } from "@/lib/daily";
import { TabBar } from "@/components/ui";

export const dynamic = "force-dynamic";

type HistoryEntry = {
  date: string;
  question: string;
  my: { body: string; emoji: string | null } | null;
  partner: { body: string; emoji: string | null } | null;
};

export default async function DailyHistoryPage() {
  const me = await requireApproved();
  const users = await getActiveUsers();
  const partner =
    users.find((u) => u.partner && u.id !== me.id) ??
    users.find(
      (u) => u.id !== me.id && (u.role === "admin" || u.role === "approved"),
    );

  if (!partner) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="px-5 pt-3 pb-2 safe-top border-b border-fg/10 flex items-center gap-3">
          <Link href="/" className="tap text-xs text-fg-faint">
            ← 홈
          </Link>
          <p className="font-display text-base">지난 질문</p>
        </header>
        <main className="flex-1 px-5 pt-10 text-center text-fg-faint text-sm">
          파트너가 없어요.
        </main>
        <TabBar active="home" />
      </div>
    );
  }

  // 오늘 질문은 홈에서 진행 중이라 히스토리에 포함하면 reveal 메커니즘이 깨짐
  // (한쪽만 답해도 답이 노출됨). 어제 이전만.
  const todayKst = todayKstStr();
  const allEntries = await prisma.dailyEntry.findMany({
    where: {
      userId: { in: [me.id, partner.id] },
      date: { lt: todayKst },
    },
    orderBy: { date: "desc" },
    select: { date: true, userId: true, body: true, emoji: true },
  });

  const byDate = new Map<
    string,
    {
      me?: { body: string; emoji: string | null };
      partner?: { body: string; emoji: string | null };
    }
  >();
  for (const e of allEntries) {
    const entry = byDate.get(e.date) ?? {};
    if (e.userId === me.id) entry.me = { body: e.body, emoji: e.emoji };
    else entry.partner = { body: e.body, emoji: e.emoji };
    byDate.set(e.date, entry);
  }

  // 한쪽이라도 답한 날 모두 포함 (둘 다 답한 날 + 한쪽만 답한 날).
  const allDates = [...byDate.keys()].sort((a, b) => b.localeCompare(a));

  const questions = await prisma.dailyQuestion.findMany({
    where: { date: { in: allDates } },
  });
  const qMap = new Map(questions.map((q) => [q.date, q.question]));

  const entries: HistoryEntry[] = allDates.map((d) => {
    const v = byDate.get(d)!;
    return {
      date: d,
      question: qMap.get(d) ?? "",
      my: v.me ?? null,
      partner: v.partner ?? null,
    };
  });

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-5 pt-3 pb-2 safe-top border-b border-fg/10 flex items-center gap-3">
        <Link href="/" className="tap text-xs text-fg-faint">
          ← 홈
        </Link>
        <p className="font-display text-base">지난 질문</p>
        <span className="text-[11px] text-fg-faint ml-auto">
          {entries.length}일
        </span>
      </header>

      <main className="flex-1 px-5 pt-4 pb-28 space-y-4">
        {entries.length === 0 ? (
          <p className="text-center text-fg-faint text-sm pt-10 italic">
            아직 답한 질문이 없어요.
            <br />
            오늘 먼저 답해보세요!
          </p>
        ) : (
          entries.map((p) => {
            const both = !!p.my && !!p.partner;
            return (
              <article
                key={p.date}
                className="editorial-card px-4 py-3.5 space-y-2.5"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[10px] text-fg-faint tracking-wider">
                    {formatDate(p.date)}
                  </p>
                  {!both && (
                    <span className="text-[10px] text-fg-faint italic">
                      {p.my ? `${partner.nickname} 미응답` : "내 미응답"}
                    </span>
                  )}
                </div>
                {p.question && (
                  <p className="font-display text-[14px] leading-snug text-fg-soft">
                    Q. {p.question}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {p.my ? (
                    <div className="bg-accent/10 rounded-card px-3 py-2">
                      <p className="text-[10px] text-fg-faint mb-0.5">
                        {me.nickname}
                      </p>
                      <p className="text-[13px] leading-snug">
                        {p.my.emoji && (
                          <span className="mr-1">{p.my.emoji}</span>
                        )}
                        {p.my.body}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-card px-3 py-2 border border-dashed border-fg/15">
                      <p className="text-[10px] text-fg-faint mb-0.5">
                        {me.nickname}
                      </p>
                      <p className="text-[12px] text-fg-faint italic">
                        미응답
                      </p>
                    </div>
                  )}
                  {p.partner ? (
                    <div className="bg-bg-warm rounded-card px-3 py-2">
                      <p className="text-[10px] text-fg-faint mb-0.5">
                        {partner.nickname}
                      </p>
                      <p className="text-[13px] leading-snug">
                        {p.partner.emoji && (
                          <span className="mr-1">{p.partner.emoji}</span>
                        )}
                        {p.partner.body}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-card px-3 py-2 border border-dashed border-fg/15">
                      <p className="text-[10px] text-fg-faint mb-0.5">
                        {partner.nickname}
                      </p>
                      <p className="text-[12px] text-fg-faint italic">
                        미응답
                      </p>
                    </div>
                  )}
                </div>
              </article>
            );
          })
        )}
      </main>

      <TabBar active="home" />
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((now.getTime() - target.getTime()) / 86400000);
  if (diff === 0) return "오늘";
  if (diff === 1) return "어제";
  return d.toLocaleDateString("ko", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}
