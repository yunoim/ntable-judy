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

const SPEEDS_MS = [2000, 4000, 8000]; // 빠름 · 보통 · 느림
const DEFAULT_SPEED_IDX = 1;

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
  const [speedIdx, setSpeedIdx] = useState(DEFAULT_SPEED_IDX);
  const [controlsVisible, setControlsVisible] = useState(true);
  // 현재 슬라이드 이미지가 로드 완료되었는지 — 로드 전엔 타이머 안 시작.
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  // 재생 순서 — 셔플 off 면 0..n-1, on 이면 Fisher-Yates 로 섞은 인덱스.
  const total = slides.length;
  const [order, setOrder] = useState<number[]>(() =>
    Array.from({ length: total }, (_, i) => i),
  );
  const onEnding = index >= total;
  const currentSlide = total > 0 && !onEnding ? slides[order[index]] : null;
  const slideKey = currentSlide ? `${currentSlide.id}-${index}` : "";
  const currentLoaded = loadedKey === slideKey;
  const currentFailed = failedKey === slideKey;
  const slideMs = SPEEDS_MS[speedIdx];
  const imgSrc = currentSlide
    ? retryCount > 0
      ? `${currentSlide.url}${currentSlide.url.includes("?") ? "&" : "?"}r=${retryCount}`
      : currentSlide.url
    : "";

  // 슬라이드 바뀌면 retryCount 초기화.
  useEffect(() => {
    setRetryCount(0);
  }, [slideKey]);

  // 영구 실패 슬라이드는 600ms 뒤 자동 스킵.
  useEffect(() => {
    if (!currentFailed || paused || onEnding) return;
    const t = setTimeout(() => {
      setIndex((i) => Math.min(i + 1, total));
    }, 600);
    return () => clearTimeout(t);
  }, [currentFailed, paused, onEnding, total]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 다음 슬라이드 preload — 전환 시 깜빡임/부분 노출 줄임.
  useEffect(() => {
    if (!started || onEnding || index + 1 >= total) return;
    const nextSlide = slides[order[index + 1]];
    if (!nextSlide) return;
    const pre = new window.Image();
    pre.src = nextSlide.url;
  }, [index, started, onEnding, total, slides, order]);

  useEffect(() => {
    if (!started || paused || onEnding || total === 0) return;
    if (!currentLoaded) return; // 이미지 로드 전엔 대기.
    timerRef.current = setTimeout(() => {
      setIndex((i) => Math.min(i + 1, total));
    }, slideMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [index, paused, started, onEnding, total, currentLoaded, slideMs]);

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
      {/* 사진 — onLoad 까지 opacity-0, 실패 시 자동 스킵.
          가로폭 맞춤 (object-contain): 잘리지 않고 전체가 보이도록.
          위아래 남는 공간은 ink-card 배경 + 살짝 그라데이션. */}
      <div className="absolute inset-0 flex items-center justify-center">
        {!currentFailed && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={`${slideKey}-${retryCount}`}
            src={imgSrc}
            alt=""
            decoding="async"
            onLoad={() => setLoadedKey(slideKey)}
            onError={() => {
              if (retryCount < 1) {
                setRetryCount((r) => r + 1);
              } else {
                setFailedKey(slideKey);
                setLoadedKey(slideKey);
              }
            }}
            className={[
              "block w-full max-h-full object-contain transition-opacity duration-300",
              currentLoaded ? "opacity-100" : "opacity-0",
            ].join(" ")}
          />
        )}
        {/* 위/아래 그라데이션 — 진행바·캡션 영역 가독성용 (이미지 없는 letterbox 영역에서도 자연스럽게 깔림) */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/60 via-transparent to-black/30" />
      </div>

      {/* 사진 영역 탭 — 컨트롤 바 토글. 좌/우 가장자리는 prev/next 우선. */}
      <button
        type="button"
        aria-label="이전"
        className="absolute left-0 top-12 bottom-32 w-1/4 z-10"
        onClick={() => setIndex((i) => Math.max(0, i - 1))}
      />
      <button
        type="button"
        aria-label="다음"
        className="absolute right-0 top-12 bottom-32 w-1/4 z-10"
        onClick={() => setIndex((i) => Math.min(total, i + 1))}
      />
      <button
        type="button"
        aria-label="컨트롤 토글"
        className="absolute left-1/4 right-1/4 top-12 bottom-32 z-10"
        onClick={() => setControlsVisible((v) => !v)}
      />

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

      {/* 로딩 / 실패 인디케이터 */}
      {!currentLoaded && !currentFailed && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <span className="text-bg/70 text-sm tracking-widest animate-pulse">
            로딩 중…
          </span>
        </div>
      )}
      {currentFailed && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <span className="text-bg/40 text-xs tracking-widest">
            이 사진은 못 불러왔어요 — 다음으로 →
          </span>
        </div>
      )}

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

      {/* 컨트롤 바 — 탭으로 숨김/노출. */}
      <div
        className={[
          "absolute left-0 right-0 bottom-0 px-4 pb-6 safe-bottom z-20 flex items-center justify-center gap-2 transition-opacity duration-200",
          controlsVisible
            ? "opacity-100"
            : "opacity-0 pointer-events-none",
        ].join(" ")}
      >
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
          <CtlBtn
            label="재생 속도"
            onClick={() => setSpeedIdx((i) => (i + 1) % SPEEDS_MS.length)}
            wide
          >
            <span className="text-[10px] font-display">
              ⏱{slideMs / 1000}s
            </span>
          </CtlBtn>
        </div>
      </div>

      {/* 컨트롤 숨김 상태에선 작은 힌트 (1.5s 페이드) */}
      {!controlsVisible && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <span className="text-[10px] text-bg/40">탭으로 컨트롤</span>
        </div>
      )}

      {paused && controlsVisible && (
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
  wide,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  primary?: boolean;
  active?: boolean;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={[
        "tap flex items-center justify-center rounded-full",
        primary
          ? "w-11 h-11 text-lg"
          : wide
            ? "h-9 px-2.5 text-xs"
            : "w-9 h-9 text-sm",
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
