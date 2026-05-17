"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

// 캘린더 날짜 클릭 시 자동으로 뜨는 액션 시트.
// 그 날의 기존 데이트/이벤트 + 4가지 등록 액션 표시.
// 닫기는 URL 에서 day 제거.

export type DayDateSummary = {
  id: string;
  number: number;
  title: string;
  area: string;
  status: string;
  stops: number;
};

export type DayEventSummary = {
  id: number;
  title: string;
  allDay: boolean;
  startsAt: string;
  userId: string;
  userNickname: string;
};

export default function TimelineActions({
  selectedDayStr,
  ymStr,
  monthLabel,
  weekdayLabel,
  isPastDay,
  isToday,
  adminId,
  existingDate,
  existingEvents,
}: {
  selectedDayStr: string | null;
  ymStr: string;
  monthLabel: string;
  weekdayLabel: string;
  isPastDay: boolean;
  isToday: boolean;
  adminId: string | null;
  existingDate: DayDateSummary | null;
  existingEvents: DayEventSummary[];
}) {
  const router = useRouter();
  const open = selectedDayStr !== null;

  function close() {
    router.push(`/timeline?ym=${ymStr}`);
  }

  if (!open || !selectedDayStr) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-fg/60"
        onClick={close}
      />
      <div
        className="fixed left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-bg rounded-t-card overflow-y-auto animate-slide-up z-30"
        style={{
          bottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
          maxHeight:
            "calc(100vh - 72px - env(safe-area-inset-bottom, 0px) - 16px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-bg/95 backdrop-blur px-5 pt-3 pb-2 border-b border-fg/10 flex items-center justify-between">
          <div>
            <p className="font-display text-base">
              {monthLabel}
              {weekdayLabel && (
                <span className="text-[11px] text-fg-faint ml-1.5">
                  {weekdayLabel}
                </span>
              )}
              {isToday && (
                <span className="ml-2 text-[10px] text-accent font-medium">
                  오늘
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="닫기"
            className="text-fg-faint text-sm"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-3 space-y-3">
          {(existingDate || existingEvents.length > 0) && (
            <div className="space-y-2">
              {existingDate && (
                <Link
                  href={`/dates/${existingDate.id}`}
                  onClick={close}
                  className="tap lift block bg-bg border border-accent/30 rounded-card px-3 py-2.5"
                >
                  <p className="text-[10px] text-accent tracking-wider">
                    {existingDate.status === "planned" ? "♡ 예정" : "♡ 다녀온"}
                    {" · #"}
                    {String(existingDate.number).padStart(2, "0")}
                  </p>
                  <p className="font-display text-sm mt-0.5 truncate">
                    {existingDate.title}
                  </p>
                  <p className="text-[10px] text-fg-faint mt-0.5">
                    {existingDate.area} · {existingDate.stops} stops
                  </p>
                </Link>
              )}
              {existingEvents.length > 0 && (
                <ul className="space-y-1.5">
                  {existingEvents.map((e) => (
                    <li
                      key={e.id}
                      className="bg-bg border border-fg/10 rounded-card px-3 py-2 flex items-baseline gap-2"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0 translate-y-1"
                        style={{
                          background:
                            e.userId === adminId
                              ? "var(--accent)"
                              : "var(--rain)",
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{e.title}</p>
                        <p className="text-[10px] text-fg-faint">
                          {e.userNickname}
                          {!e.allDay
                            ? " · " +
                              new Date(e.startsAt).toLocaleTimeString("ko", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : " · 하루"}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="border-t border-fg/8 pt-3">
            <p className="eyebrow mb-2">새로 등록</p>
            <ul className="divide-y divide-fg/8 border border-fg/10 rounded-card overflow-hidden">
              {!isPastDay && (
                <li>
                  <Link
                    href={`/plan/new?mode=ai&date=${selectedDayStr}`}
                    className="tap flex items-center gap-3 px-4 py-3 hover:bg-bg-warm"
                  >
                    <span className="text-lg">✨</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-sm">AI로 코스 짜기</p>
                      <p className="text-[10px] text-fg-faint">
                        자연어로 알려주면 3안 추천
                      </p>
                    </div>
                  </Link>
                </li>
              )}
              {!isPastDay && (
                <li>
                  <Link
                    href={`/plan/new?mode=direct&date=${selectedDayStr}`}
                    className="tap flex items-center gap-3 px-4 py-3 hover:bg-bg-warm"
                  >
                    <span className="text-lg">✏️</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-sm">직접 입력</p>
                      <p className="text-[10px] text-fg-faint">
                        제목·시간만 빠르게
                      </p>
                    </div>
                  </Link>
                </li>
              )}
              {isPastDay && (
                <li>
                  <Link
                    href={`/plan/new?mode=past&date=${selectedDayStr}`}
                    className="tap flex items-center gap-3 px-4 py-3 hover:bg-bg-warm"
                  >
                    <span className="text-lg">📓</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-sm">
                        다녀온 데이트 기록
                      </p>
                      <p className="text-[10px] text-fg-faint">
                        지난 일을 한 줄로
                      </p>
                    </div>
                  </Link>
                </li>
              )}
              <li>
                <button
                  type="button"
                  onClick={() => {
                    router.push(
                      `/timeline?ym=${ymStr}&day=${selectedDayStr}#add-event`,
                    );
                  }}
                  className="tap w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-bg-warm"
                >
                  <span className="text-lg">📌</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-sm">개인 일정 등록</p>
                    <p className="text-[10px] text-fg-faint">
                      회식·약속 등 캘린더에만 표시
                    </p>
                  </div>
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
