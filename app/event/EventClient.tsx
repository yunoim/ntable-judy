"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type Slide = {
  id: number;
  url: string;
  caption: string | null;
  dateNumber: number;
  dateTitle: string;
  dateLabel: string;
};

const SLIDE_MS = 3800;

export default function EventClient({
  phase,
  previewing,
  daysLeft,
  eventDateLabel,
  slides,
  dayNo,
  dateCount,
  photoCount,
  names,
  backLink,
}: {
  phase: "before" | "open" | "after";
  previewing: boolean;
  daysLeft: number;
  eventDateLabel: string;
  slides: Slide[];
  dayNo: number;
  dateCount: number;
  photoCount: number;
  names: string[];
  backLink: React.ReactNode;
}) {
  // index === slides.length 면 통계 엔딩 화면.
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [started, setStarted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  // 재생 순서 — 셔플 off 면 0..n-1, on 이면 Fisher-Yates 로 섞은 인덱스.
  const total = slides.length;
  const [order, setOrder] = useState<number[]>(() =>
    Array.from({ length: total }, (_, i) => i),
  );
  const onEnding = index >= total;
  const currentSlide = total > 0 && !onEnding ? slides[order[index]] : null;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!started || paused || onEnding || total === 0) return;
    timerRef.current = setTimeout(() => {
      setIndex((i) => Math.min(i + 1, total));
    }, SLIDE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [index, paused, started, onEnding, total]);

  function toggleShuffle() {
    setShuffle((s) => {
      const next = !s;
      const arr = Array.from({ length: total }, (_, i) => i);
      if (next) {
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
      }
      setOrder(arr);
      setIndex(0);
      return next;
    });
  }

  // ─── before: 카운트다운 ───
  if (phase === "before") {
    return (
      <Shell backLink={backLink}>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-4">
          <p className="text-[11px] tracking-[0.3em] opacity-60 uppercase">
            Coming soon
          </p>
          <p className="font-display text-3xl leading-tight">
            {eventDateLabel}
            <br />
            <em className="italic text-accent-soft">하루만 열리는 추억</em>
          </p>
          <div className="mt-2 text-5xl font-display text-accent-soft">
            D-{daysLeft}
          </div>
          <p className="text-sm opacity-70 mt-2 leading-relaxed">
            그날, 우리가 함께한 시간을
            <br />
            한 편의 영상처럼 모아둘게요.
          </p>
        </div>
      </Shell>
    );
  }

  // ─── after: 닫힘 ───
  if (phase === "after") {
    return (
      <Shell backLink={backLink}>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-3">
          <p className="text-4xl">🎞️</p>
          <p className="font-display text-2xl leading-tight">
            이벤트는 끝났어요
          </p>
          <p className="text-sm opacity-70 leading-relaxed">
            그날의 추억 상영회는 막을 내렸어요.
            <br />
            다음 특별한 날을 기다려요.
          </p>
        </div>
      </Shell>
    );
  }

  // ─── open: 슬라이드쇼 ───
  if (total === 0) {
    return (
      <Shell backLink={backLink}>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-3">
          <p className="text-4xl">📷</p>
          <p className="font-display text-xl">아직 사진이 없어요</p>
          <p className="text-sm opacity-70">
            데이트에 사진을 올리면 여기 모여요.
          </p>
        </div>
      </Shell>
    );
  }

  // 인트로 (시작 전)
  if (!started) {
    return (
      <Shell backLink={backLink}>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-5">
          {previewing && (
            <span className="text-[10px] tracking-widest opacity-50 uppercase">
              미리보기 (admin)
            </span>
          )}
          <p className="text-[11px] tracking-[0.3em] opacity-60 uppercase">
            오늘만 열리는
          </p>
          <p className="font-display text-3xl leading-tight">
            우리의{" "}
            <em className="italic text-accent-soft">
              {dayNo > 0 ? `${dayNo}일` : "기록"}
            </em>
          </p>
          <p className="text-sm opacity-70">
            {names.join(" · ")} 의 추억 상영회
          </p>
          <button
            type="button"
            onClick={() => setStarted(true)}
            className="tap mt-3 bg-accent text-bg rounded-full px-7 py-3 font-display text-base"
          >
            ▶ 상영 시작
          </button>
          <p className="text-[11px] opacity-50">
            사진 {photoCount}장 · 데이트 {dateCount}번
          </p>
        </div>
      </Shell>
    );
  }

  // 엔딩 통계
  if (onEnding) {
    return (
      <Shell backLink={backLink}>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-6">
          <p className="text-[11px] tracking-[0.3em] opacity-60 uppercase">
            함께한 시간
          </p>
          <div className="space-y-5">
            <Stat big value={dayNo > 0 ? `${dayNo}` : "—"} unit="일째 함께" />
            <div className="flex gap-8 justify-center">
              <Stat value={`${dateCount}`} unit="번의 데이트" />
              <Stat value={`${photoCount}`} unit="장의 사진" />
            </div>
          </div>
          <p className="text-sm opacity-70 leading-relaxed mt-2">
            앞으로도 이렇게
            <br />
            한 장씩 쌓아가요 🤍
          </p>
          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={() => {
                setIndex(0);
                setPaused(false);
              }}
              className="tap border border-bg/40 rounded-full px-5 py-2.5 text-sm"
            >
              ↺ 다시 보기
            </button>
            <Link
              href="/album"
              className="tap bg-accent text-bg rounded-full px-5 py-2.5 text-sm font-semibold"
            >
              사진첩 →
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  // 슬라이드
  const slide = currentSlide!;
  return (
    <div className="fixed inset-0 bg-ink-card text-bg overflow-hidden select-none">
      {/* 사진 */}
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={`${slide.id}-${index}`}
          src={slide.url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover animate-fade-in"
        />
        {/* 위/아래 그라데이션 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40" />
      </div>

      {/* 진행 바 */}
      <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 safe-top z-10">
        {order.map((_, i) => (
          <div
            key={i}
            className="flex-1 h-0.5 rounded-full bg-bg/30 overflow-hidden"
          >
            <div
              className="h-full bg-bg"
              style={{ width: i <= index ? "100%" : "0%" }}
            />
          </div>
        ))}
      </div>

      {/* 닫기 */}
      <div className="absolute top-0 right-0 p-3 safe-top z-20">
        <Link href="/" className="tap text-bg/80 text-sm">
          ✕
        </Link>
      </div>

      {/* 캡션 */}
      <div className="absolute bottom-20 left-0 right-0 px-6 pb-2 z-10">
        <p className="text-[11px] tracking-widest text-accent-soft mb-1">
          #{String(slide.dateNumber).padStart(2, "0")} · {slide.dateLabel}
        </p>
        <p className="font-display text-xl leading-snug">{slide.dateTitle}</p>
        {slide.caption && (
          <p className="text-sm opacity-80 mt-1 leading-relaxed">
            {slide.caption}
          </p>
        )}
      </div>

      {/* 컨트롤 바 */}
      <div className="absolute left-0 right-0 bottom-0 px-4 pb-6 safe-bottom z-20 flex items-center justify-center gap-2">
        <div className="flex items-center gap-1 bg-fg/40 backdrop-blur-sm rounded-full px-2 py-1.5">
          <CtlBtn
            label="이전"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
          >
            ⏮
          </CtlBtn>
          <CtlBtn
            label={paused ? "재생" : "일시정지"}
            onClick={() => setPaused((p) => !p)}
            primary
          >
            {paused ? "▶" : "⏸"}
          </CtlBtn>
          <CtlBtn
            label="다음"
            onClick={() => setIndex((i) => Math.min(total, i + 1))}
          >
            ⏭
          </CtlBtn>
          <CtlBtn
            label="랜덤 재생"
            onClick={toggleShuffle}
            active={shuffle}
          >
            🔀
          </CtlBtn>
        </div>
      </div>

      {/* 탭 영역: 좌(이전) / 우(다음). 가운데는 컨트롤 바라 탭 X. */}
      <button
        type="button"
        aria-label="이전"
        className="absolute left-0 top-0 bottom-24 w-1/3 z-10"
        onClick={() => setIndex((i) => Math.max(0, i - 1))}
      />
      <button
        type="button"
        aria-label="다음"
        className="absolute right-0 top-0 bottom-24 w-1/3 z-10"
        onClick={() => setIndex((i) => Math.min(total, i + 1))}
      />

      {paused && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <span className="text-bg/80 text-5xl opacity-70">⏸</span>
        </div>
      )}
    </div>
  );
}

function CtlBtn({
  children,
  onClick,
  label,
  primary,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  primary?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={[
        "tap flex items-center justify-center rounded-full",
        primary ? "w-11 h-11 text-lg" : "w-9 h-9 text-sm",
        active
          ? "bg-accent text-bg"
          : primary
            ? "bg-bg text-ink-card"
            : "text-bg/90 hover:bg-bg/15",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Shell({
  children,
  backLink,
}: {
  children: React.ReactNode;
  backLink: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-ink-card text-bg flex flex-col overflow-hidden">
      <div className="safe-top px-4 pt-3 z-10">{backLink}</div>
      {children}
    </div>
  );
}

function Stat({
  value,
  unit,
  big,
}: {
  value: string;
  unit: string;
  big?: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <span
        className={[
          "font-display text-accent-soft leading-none",
          big ? "text-6xl" : "text-3xl",
        ].join(" ")}
      >
        {value}
      </span>
      <span className="text-xs opacity-70 mt-1.5">{unit}</span>
    </div>
  );
}
