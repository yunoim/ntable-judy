"use client";

import { useRouter } from "next/navigation";
import { useRef, type ReactNode } from "react";

// 캘린더 swipe 제스처 wrapper — 좌우 스와이프 시 다음/이전 달로 이동.
export default function CalendarSwipe({
  prevHref,
  nextHref,
  children,
}: {
  prevHref: string;
  nextHref: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const startX = useRef(0);
  const startY = useRef(0);

  return (
    <div
      onTouchStart={(e) => {
        startX.current = e.touches[0].clientX;
        startY.current = e.touches[0].clientY;
      }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - startX.current;
        const dy = e.changedTouches[0].clientY - startY.current;
        // 수평이 수직보다 분명히 크고 임계값 넘을 때만 (세로 스크롤 방해 X).
        if (Math.abs(dx) < 50) return;
        if (Math.abs(dy) > Math.abs(dx)) return;
        if (dx < 0) router.push(nextHref);
        else router.push(prevHref);
      }}
    >
      {children}
    </div>
  );
}
