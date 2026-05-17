"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

// timeline 우측 하단 FAB. 누르면 4가지 액션 sheet.
// dayStr 가 있으면 그 날짜로 prefill. 없으면 오늘.
export default function TimelineActions({
  selectedDayStr,
  ymStr,
}: {
  selectedDayStr: string | null;
  ymStr: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const targetDay = selectedDayStr ?? todayStr;
  const isPast = new Date(targetDay).getTime() < (() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t.getTime();
  })();

  function close() {
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tap fixed bottom-24 right-5 z-30 bg-ink-card text-bg rounded-full w-14 h-14 flex items-center justify-center font-display text-2xl leading-none"
        style={{
          boxShadow:
            "0 6px 16px -6px rgba(44,32,23,0.35), 0 2px 0 rgba(44,32,23,0.1)",
        }}
        aria-label="새 일정 추가"
      >
        +
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30 bg-fg/60"
            onClick={close}
          />
          <div
            className="fixed left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-bg rounded-t-card overflow-hidden animate-slide-up z-30"
            style={{
              bottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-3 pb-2 border-b border-fg/10 flex items-center justify-between">
              <div>
                <p className="font-display text-base">새 일정 추가</p>
                <p className="text-[10px] text-fg-faint mt-0.5">
                  {targetDay}{" "}
                  {selectedDayStr ? "선택된 날짜" : "오늘 (날짜 미선택)"}
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
            <ul className="divide-y divide-fg/8">
              {!isPast && (
                <li>
                  <Link
                    href={`/plan/new?mode=ai&date=${targetDay}`}
                    className="tap flex items-center gap-3 px-5 py-3.5 hover:bg-bg-warm"
                    onClick={close}
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
              {!isPast && (
                <li>
                  <Link
                    href={`/plan/new?mode=direct&date=${targetDay}`}
                    className="tap flex items-center gap-3 px-5 py-3.5 hover:bg-bg-warm"
                    onClick={close}
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
              {isPast && (
                <li>
                  <Link
                    href={`/plan/new?mode=past&date=${targetDay}`}
                    className="tap flex items-center gap-3 px-5 py-3.5 hover:bg-bg-warm"
                    onClick={close}
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
                    close();
                    router.push(
                      `/timeline?ym=${ymStr}&day=${targetDay}#add-event`,
                    );
                  }}
                  className="tap w-full text-left flex items-center gap-3 px-5 py-3.5 hover:bg-bg-warm"
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
        </>
      )}
    </>
  );
}
