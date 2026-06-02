"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // hash 가 #add-event 면 EventsSection 의 form 이 떠야 하므로 이 sheet 는 숨김.
  const [hashAddEvent, setHashAddEvent] = useState(false);
  useEffect(() => {
    function check() {
      setHashAddEvent(
        typeof window !== "undefined" &&
          window.location.hash === "#add-event",
      );
    }
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, []);
  // Next.js soft-nav 가 hash 클리어해도 hashchange 가 안 뜰 수 있어
  // pathname/searchParams 변화도 트리거.
  useEffect(() => {
    if (typeof window === "undefined") return;
    setHashAddEvent(window.location.hash === "#add-event");
  }, [pathname, searchParams]);
  const open = selectedDayStr !== null && !hashAddEvent;

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
        className="fixed left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-bg rounded-t-card overflow-y-auto animate-slide-up-centered z-30"
        style={{
          bottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
          maxHeight: "60vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-bg/95 backdrop-blur px-5 pt-2.5 pb-2 border-b border-fg/10 flex items-center justify-between">
          <p className="font-display text-sm">
            {monthLabel}
            {weekdayLabel && (
              <span className="text-[10px] text-fg-faint ml-1.5">
                {weekdayLabel}
              </span>
            )}
            {isToday && (
              <span className="ml-2 text-[10px] text-accent font-medium">
                오늘
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={close}
            aria-label="닫기"
            className="text-fg-faint text-sm"
          >
            ✕
          </button>
        </div>

        <div className="px-4 py-2.5 space-y-2.5">
          {(existingDate || existingEvents.length > 0) && (
            <div className="space-y-1.5">
              {existingDate && (
                <Link
                  href={`/dates/${existingDate.id}`}
                  onClick={close}
                  className="tap lift block bg-bg border border-accent/30 rounded-card px-3 py-2 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="font-display text-sm truncate">
                      {existingDate.title}
                    </p>
                    <p className="text-[10px] text-fg-faint">
                      {existingDate.status === "planned" ? "예정" : "다녀온"}
                      {" · #"}
                      {String(existingDate.number).padStart(2, "0")}
                      {existingDate.area && ` · ${existingDate.area}`}
                    </p>
                  </div>
                  <span className="text-accent text-base shrink-0">♡</span>
                </Link>
              )}
              {existingEvents.length > 0 && (
                <ul className="space-y-1">
                  {existingEvents.map((e) => (
                    <li
                      key={e.id}
                      className="bg-bg border border-fg/10 rounded-card px-3 py-1.5 flex items-center gap-2"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{
                          background:
                            e.userId === adminId
                              ? "var(--accent)"
                              : "var(--rain)",
                        }}
                      />
                      <p className="text-[12px] flex-1 truncate">
                        {e.title}
                      </p>
                      <p className="text-[10px] text-fg-faint shrink-0">
                        {e.userNickname}
                        {!e.allDay &&
                          " · " +
                            new Date(e.startsAt).toLocaleTimeString("ko", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <ul className="divide-y divide-fg/8 border border-fg/10 rounded-card overflow-hidden">
            {!isPastDay && (
              <li>
                <Link
                  href={`/plan/new?mode=ai&date=${selectedDayStr}`}
                  className="tap flex items-center gap-3 px-3 py-2.5 hover:bg-bg-warm"
                >
                  <span className="text-base">✨</span>
                  <p className="font-display text-sm flex-1">AI로 코스 짜기</p>
                </Link>
              </li>
            )}
            {!isPastDay && (
              <li>
                <Link
                  href={`/plan/new?mode=direct&date=${selectedDayStr}`}
                  className="tap flex items-center gap-3 px-3 py-2.5 hover:bg-bg-warm"
                >
                  <span className="text-base">✏️</span>
                  <p className="font-display text-sm flex-1">직접 입력</p>
                </Link>
              </li>
            )}
            {isPastDay && (
              <li>
                <Link
                  href={`/plan/new?mode=past&date=${selectedDayStr}`}
                  className="tap flex items-center gap-3 px-3 py-2.5 hover:bg-bg-warm"
                >
                  <span className="text-base">📓</span>
                  <p className="font-display text-sm flex-1">
                    다녀온 데이트 기록
                  </p>
                </Link>
              </li>
            )}
            <li>
              <button
                type="button"
                onClick={() => {
                  // router.push 의 soft-nav 는 hashchange 이벤트를 안 쏨.
                  // EventsSection 이 hashchange 로 폼 오픈을 감지하므로 직접 설정.
                  window.location.hash = "add-event";
                }}
                className="tap w-full text-left flex items-center gap-3 px-3 py-2.5 hover:bg-bg-warm"
              >
                <span className="text-base">📌</span>
                <p className="font-display text-sm flex-1">개인 일정 등록</p>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
