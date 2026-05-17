"use client";

import { useState } from "react";
import BucketsClient, { type Bucket } from "./buckets/BucketsClient";
import CapsulesClient, { type Capsule } from "./capsules/CapsulesClient";

// "둘만의 기록" 카드 두 개 + 시트 모달.
// /us, 홈 등 어디서든 동일하게 동작. 시트는 z-30 + TabBar 위 (bottom calc)
// 로 TabBar 가리지 않도록.
export default function CoupleSheets({
  meId,
  meRole,
  buckets,
  capsules,
}: {
  meId: string;
  meRole: string;
  buckets: Bucket[];
  capsules: Capsule[];
}) {
  const [sheet, setSheet] = useState<"buckets" | "capsules" | null>(null);
  return (
    <>
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => setSheet("buckets")}
          className="tap lift editorial-card px-4 py-3 flex flex-col gap-0.5 text-left"
        >
          <span className="text-base">📋</span>
          <p className="font-display text-sm">버킷리스트</p>
          <p className="text-[10px] text-fg-faint">{buckets.length}개</p>
        </button>
        <button
          type="button"
          onClick={() => setSheet("capsules")}
          className="tap lift editorial-card px-4 py-3 flex flex-col gap-0.5 text-left"
        >
          <span className="text-base">💌</span>
          <p className="font-display text-sm">타임캡슐</p>
          <p className="text-[10px] text-fg-faint">{capsules.length}개</p>
        </button>
      </div>

      {sheet && (
        <>
          <div
            className="fixed inset-0 z-30 bg-fg/60"
            onClick={() => setSheet(null)}
          />
          <div
            className="fixed left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-bg rounded-t-card overflow-y-auto animate-slide-up-centered z-30"
            style={{
              bottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
              maxHeight:
                "calc(85vh - 72px - env(safe-area-inset-bottom, 0px))",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 bg-bg/95 backdrop-blur px-5 pt-3 pb-2 border-b border-fg/10 flex items-center justify-between">
              <p className="font-display text-base">
                {sheet === "buckets" ? "버킷리스트" : "타임캡슐"}
              </p>
              <button
                type="button"
                onClick={() => setSheet(null)}
                aria-label="닫기"
                className="text-fg-faint text-sm"
              >
                ✕
              </button>
            </div>
            {sheet === "buckets" ? (
              <BucketsClient
                meId={meId}
                meRole={meRole}
                buckets={buckets}
                embedded
              />
            ) : (
              <CapsulesClient
                meId={meId}
                meRole={meRole}
                capsules={capsules}
                embedded
              />
            )}
          </div>
        </>
      )}
    </>
  );
}
