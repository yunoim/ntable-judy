"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

// 캘린더 swipe 제스처 wrapper — 좌우 스와이프 시 다음/이전 달로 이동.
// 손가락 따라 실시간으로 캘린더가 따라가다가 임계점 넘으면 슬라이드 아웃 +
// router.push. 임계점 미달이면 spring back.
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
  const sp = useSearchParams();
  const ym = sp.get("ym");
  const startX = useRef(0);
  const startY = useRef(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exiting, setExiting] = useState<"left" | "right" | null>(null);

  // 라우팅 끝나서 ym 이 바뀌면 exiting/dragX 리셋 — 안 그러면 새 달 페이지에서도
  // 셀이 translateX(-100%) 남아서 검은 화면.
  useEffect(() => {
    setExiting(null);
    setDragX(0);
    setDragging(false);
  }, [ym]);

  function reset() {
    setDragging(false);
    setDragX(0);
  }

  return (
    <div
      onTouchStart={(e) => {
        if (exiting) return;
        startX.current = e.touches[0].clientX;
        startY.current = e.touches[0].clientY;
        setDragging(true);
      }}
      onTouchMove={(e) => {
        if (!dragging || exiting) return;
        const dx = e.touches[0].clientX - startX.current;
        const dy = e.touches[0].clientY - startY.current;
        // 수직이 더 크면 세로 스크롤로 보고 드래그 취소.
        if (Math.abs(dy) > Math.abs(dx) * 1.2) {
          reset();
          return;
        }
        // 손가락 따라가는 트랙. 저항 살짝 (0.85).
        setDragX(dx * 0.85);
      }}
      onTouchEnd={(e) => {
        if (!dragging || exiting) {
          reset();
          return;
        }
        const dx = e.changedTouches[0].clientX - startX.current;
        const dy = e.changedTouches[0].clientY - startY.current;
        reset();
        if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;
        // 임계점 통과 → 끝까지 슬라이드 아웃 + 라우팅.
        if (dx < 0) {
          setExiting("left");
          setTimeout(() => router.push(nextHref), 220);
        } else {
          setExiting("right");
          setTimeout(() => router.push(prevHref), 220);
        }
      }}
      style={{
        transform: exiting
          ? exiting === "left"
            ? "translateX(-100%)"
            : "translateX(100%)"
          : `translateX(${dragX}px)`,
        opacity: exiting ? 0 : 1,
        transition: dragging
          ? "none"
          : "transform 220ms ease-out, opacity 220ms ease-out",
        willChange: "transform",
      }}
    >
      {children}
    </div>
  );
}
