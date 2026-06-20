"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { isVideoUrl } from "@/lib/mediaType";

export type AlbumPhoto = {
  id: number;
  url: string;
  caption: string | null;
  createdAt: string;
  dateId: string;
  dateTitle: string;
  dateNumber: number;
  dateScheduledAt: string;
  uploadedBy: { id: string; nickname: string; emoji: string | null };
};

// 라이트박스 이미지 — 1장만 표시라 메모리 부담 X. 평범한 img + onLoad 게이팅.
// 로드 완료 전엔 opacity 0 (부분 노출 방지) + "로딩 중…" 표시.
// 실패 시 retry → 그래도 실패하면 fallback URL (cache-bust) → 그래도 실패하면 안내.
function LightboxImage({
  photo,
  onTap,
}: {
  photo: AlbumPhoto;
  onTap: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [retry, setRetry] = useState(0);
  const src =
    retry === 0
      ? photo.url
      : `${photo.url}${photo.url.includes("?") ? "&" : "?"}r=${retry}`;
  return (
    <div
      className="flex-1 flex items-center justify-center min-h-0 px-4 pt-4 pb-2 relative"
      onClick={onTap}
    >
      {!loaded && !errored && !isVideoUrl(photo.url) && (
        <span className="absolute text-bg/70 text-sm tracking-widest animate-pulse z-10">
          로딩 중…
        </span>
      )}
      {errored && (
        <div className="text-bg/80 text-sm text-center px-4">
          <p>{isVideoUrl(photo.url) ? "영상을 못 불러왔어요" : "사진을 못 불러왔어요"}</p>
          <div className="flex gap-3 justify-center mt-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setErrored(false);
                setLoaded(false);
                setRetry((r) => r + 1);
              }}
              className="tap text-[11px] underline"
            >
              다시 시도
            </button>
            <a
              href={photo.url}
              target="_blank"
              rel="noopener"
              onClick={(e) => e.stopPropagation()}
              className="tap text-[11px] underline"
            >
              새 창에서 열기
            </a>
          </div>
        </div>
      )}
      {!errored && isVideoUrl(photo.url) && (
        // 라이트박스 진입 시 자동재생. autoPlay 정책상 muted 필요 (모바일 Chrome
        // 은 unmuted autoPlay 차단). 사용자가 controls 의 음소거 해제 가능.
        <video
          key={retry}
          src={src}
          controls
          autoPlay
          muted
          playsInline
          preload="metadata"
          className="max-w-full max-h-full object-contain rounded-card"
          onError={() => {
            if (retry < 2) {
              setRetry((r) => r + 1);
            } else {
              setErrored(true);
            }
          }}
        />
      )}
      {!errored && !isVideoUrl(photo.url) && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          key={retry}
          src={src}
          alt={photo.caption ?? photo.dateTitle}
          decoding="async"
          className={[
            "max-w-full max-h-full object-contain rounded-card cursor-pointer transition-opacity duration-200",
            loaded ? "opacity-100" : "opacity-0",
          ].join(" ")}
          onLoad={() => setLoaded(true)}
          onError={() => {
            if (retry < 2) {
              setRetry((r) => r + 1);
            } else {
              setErrored(true);
            }
          }}
          onClick={onTap}
        />
      )}
    </div>
  );
}

// 영상 셀 — 첫 프레임 시도, 실패하면 ▶ 플레이스홀더 (사진 누락 텍스트 X).
function VideoCell({
  photo,
  onOpen,
}: {
  photo: AlbumPhoto;
  onOpen: () => void;
}) {
  const [errored, setErrored] = useState(false);
  const baseClass =
    "tap relative aspect-square overflow-hidden rounded-card bg-bg-warm/40 group";
  if (errored) {
    return (
      <button
        onClick={onOpen}
        className={`${baseClass} bg-fg/85 flex items-center justify-center`}
        aria-label={`영상 — ${photo.dateTitle}`}
      >
        <span className="w-10 h-10 rounded-full bg-bg/95 flex items-center justify-center shadow-lg">
          <span className="text-fg text-base ml-0.5">▶</span>
        </span>
        <span className="absolute right-1.5 bottom-1.5 bg-bg/15 text-bg text-[9px] px-1.5 py-0.5 rounded-full font-display">
          🎞 영상
        </span>
      </button>
    );
  }
  return (
    <button onClick={onOpen} className={baseClass}>
      <video
        src={photo.url}
        muted
        playsInline
        preload="metadata"
        className="w-full h-full object-cover transition-transform group-hover:scale-105"
        onError={() => setErrored(true)}
      />
      <span className="absolute right-1.5 bottom-1.5 bg-fg/70 text-bg text-[9px] px-1.5 py-0.5 rounded-full font-display">
        ▶
      </span>
    </button>
  );
}

// 개별 그리드 셀 — 이미지 로딩 실패 시 최대 2회 재시도 (cache-busting query 로
// 캐리어/WebView 의 stale negative cache 우회), 그 후에도 실패하면 fallback.
const MAX_RETRY = 2;

function AlbumCell({
  photo,
  onOpen,
}: {
  photo: AlbumPhoto;
  onOpen: () => void;
}) {
  const [retry, setRetry] = useState(0);
  const [errored, setErrored] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const baseClass =
    "tap relative aspect-square overflow-hidden rounded-card bg-bg-warm/40 group";

  if (errored) {
    return (
      <Link
        href={`/dates/${photo.dateId}`}
        className={`${baseClass} flex flex-col items-center justify-center p-2 border border-dashed border-fg/15 text-center`}
        aria-label={`사진 누락 — ${photo.dateTitle}`}
      >
        <span className="text-[18px] mb-1 opacity-50">🖼️</span>
        <span className="text-[10px] text-fg-faint italic">사진 누락</span>
        <span className="text-[10px] text-fg-faint mt-0.5 line-clamp-1">
          #{String(photo.dateNumber).padStart(2, "0")}
        </span>
      </Link>
    );
  }

  // retry 시 query 한 비트씩 변경 — 새 URL 로 인식해 HTTP cache 우회.
  const src =
    retry === 0
      ? photo.url
      : `${photo.url}${photo.url.includes("?") ? "&" : "?"}r=${retry}`;

  function handleError() {
    if (retry < MAX_RETRY) {
      const next = retry + 1;
      // 백오프 — 300ms, 800ms.
      const delay = next === 1 ? 300 : 800;
      timerRef.current = setTimeout(() => setRetry(next), delay);
    } else {
      setErrored(true);
    }
  }

  if (isVideoUrl(photo.url)) {
    // 별도 컴포넌트 — 첫 프레임 시도, 실패 시 ▶ placeholder (사진 누락 텍스트 X).
    return <VideoCell photo={photo} onOpen={onOpen} />;
  }

  return (
    <button onClick={onOpen} className={baseClass}>
      <Image
        key={retry}
        src={src}
        alt=""
        width={200}
        height={200}
        sizes="(max-width: 390px) 130px, 200px"
        className="w-full h-full object-cover transition-transform group-hover:scale-105"
        onError={handleError}
      />
    </button>
  );
}

export default function AlbumGrid({
  items,
  meId,
  meRole,
}: {
  items: AlbumPhoto[];
  meId: string;
  meRole: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [lightbox, setLightbox] = useState<AlbumPhoto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // 라이트박스 닫히거나 사진 바뀌면 삭제 확인 리셋
  useEffect(() => {
    setConfirmDelete(false);
  }, [lightbox?.id]);
  // 3초 후 자동 취소
  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 3000);
    return () => clearTimeout(t);
  }, [confirmDelete]);

  async function remove(id: number) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/photos/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "삭제 실패");
        return;
      }
      setLightbox(null);
      startTransition(() => router.refresh());
    } catch (e: any) {
      setError(e?.message ?? "네트워크 오류");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {error && (
        <p className="text-xs text-rain bg-rain/10 px-3 py-2 rounded-card mb-2">
          {error}
        </p>
      )}
      <div className="grid grid-cols-3 gap-1.5">
        {items.map((p) => (
          <AlbumCell key={p.id} photo={p} onOpen={() => setLightbox(p)} />
        ))}
      </div>

      {/* 라이트박스 */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-fg/95 flex flex-col"
          onClick={() => setLightbox(null)}
        >
          <LightboxImage
            key={lightbox.id}
            photo={lightbox}
            onTap={() => setLightbox(null)}
          />

          {/* 하단 패널 — /timeline day-panel 과 동일한 스타일로 통일. */}
          <div
            className="shrink-0 bg-bg text-fg rounded-t-card safe-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-3 pb-2 border-b border-fg/10 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-sm truncate">
                  #{String(lightbox.dateNumber).padStart(2, "0")}{" "}
                  {lightbox.dateTitle}
                </p>
                <p className="text-[10px] text-fg-faint mt-0.5">
                  {lightbox.uploadedBy.emoji ?? "👤"}{" "}
                  {lightbox.uploadedBy.nickname}
                  {" · "}
                  {new Date(lightbox.dateScheduledAt).toLocaleDateString("ko", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLightbox(null)}
                aria-label="닫기"
                className="tap text-fg-faint text-sm shrink-0"
              >
                ✕
              </button>
            </div>

            {lightbox.caption && (
              <p className="px-5 py-2.5 text-[13px] text-fg-soft border-b border-fg/8">
                {lightbox.caption}
              </p>
            )}

            <ul className="divide-y divide-fg/8">
              <li>
                <Link
                  href={`/dates/${lightbox.dateId}`}
                  onClick={() => setLightbox(null)}
                  className="tap flex items-center gap-3 px-5 py-3 hover:bg-bg-warm"
                >
                  <span className="text-base">📓</span>
                  <p className="font-display text-sm flex-1">
                    데이트 상세 보기
                  </p>
                  <span className="text-fg-faint text-sm">→</span>
                </Link>
              </li>
              {isVideoUrl(lightbox.url) && (
                <li>
                  <a
                    href={lightbox.url}
                    target="_blank"
                    rel="noopener"
                    className="tap flex items-center gap-3 px-5 py-3 hover:bg-bg-warm"
                  >
                    <span className="text-base">↗</span>
                    <p className="font-display text-sm flex-1">
                      새 창에서 영상 열기
                    </p>
                    <span className="text-fg-faint text-xs">native</span>
                  </a>
                </li>
              )}
              {(lightbox.uploadedBy.id === meId || meRole === "admin") && (
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      if (!confirmDelete) {
                        setConfirmDelete(true);
                        return;
                      }
                      setConfirmDelete(false);
                      remove(lightbox.id);
                    }}
                    disabled={busy}
                    className={[
                      "tap w-full text-left flex items-center gap-3 px-5 py-3 hover:bg-bg-warm",
                      confirmDelete ? "bg-rain/10 text-rain" : "text-rain",
                    ].join(" ")}
                  >
                    <span className="text-base">🗑</span>
                    <p className="font-display text-sm flex-1">
                      {confirmDelete
                        ? "정말 삭제할까요?"
                        : "사진 삭제"}
                    </p>
                    {confirmDelete && (
                      <span className="text-xs font-display">탭하면 삭제</span>
                    )}
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
