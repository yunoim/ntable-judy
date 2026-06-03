"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

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
      {!loaded && !errored && (
        <span className="absolute text-bg/70 text-sm tracking-widest animate-pulse z-10">
          로딩 중…
        </span>
      )}
      {errored && (
        <div className="text-bg/80 text-sm text-center">
          <p>사진을 못 불러왔어요</p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setErrored(false);
              setLoaded(false);
              setRetry((r) => r + 1);
            }}
            className="tap mt-2 text-[11px] underline"
          >
            다시 시도
          </button>
        </div>
      )}
      {!errored && (
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

          <div
            className="shrink-0 bg-fg px-4 pt-4 pb-5 safe-bottom border-t border-bg/15 flex flex-col items-center gap-3 text-bg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 데이트 제목 — 가장 또렷하게 */}
            <Link
              href={`/dates/${lightbox.dateId}`}
              className="tap text-center font-display text-base text-bg leading-snug max-w-full px-4"
            >
              <span className="text-accent-soft text-[11px] tracking-[0.2em] block mb-0.5">
                #{String(lightbox.dateNumber).padStart(2, "0")}
              </span>
              <span className="underline decoration-bg/40 underline-offset-2">
                {lightbox.dateTitle}
              </span>
              <span className="text-accent-soft ml-1">→</span>
            </Link>
            {/* 메타 + 캡션 */}
            <div className="text-[11px] text-center text-bg/70 leading-snug">
              <p>
                {lightbox.uploadedBy.emoji ?? "👤"}{" "}
                {lightbox.uploadedBy.nickname}
                {" · "}
                {new Date(lightbox.dateScheduledAt).toLocaleDateString("ko", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              {lightbox.caption && (
                <p className="mt-1 text-bg/85 serif-italic">
                  {lightbox.caption}
                </p>
              )}
            </div>
            <div className="flex justify-between items-center w-full max-w-xs mt-1 gap-6">
              <div className="flex-1 flex justify-start">
                {(lightbox.uploadedBy.id === meId || meRole === "admin") && (
                  <button
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
                      "tap text-xs rounded-full px-4 py-1.5 border transition-colors",
                      confirmDelete
                        ? "bg-rain text-bg border-rain"
                        : "text-rain border-rain/60",
                    ].join(" ")}
                  >
                    {confirmDelete ? "정말 삭제 ✓" : "삭제"}
                  </button>
                )}
              </div>
              <button
                onClick={() => setLightbox(null)}
                className="tap text-xs text-bg border border-bg/60 rounded-full px-4 py-1.5"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
