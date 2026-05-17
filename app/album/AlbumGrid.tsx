"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

export type AlbumPhoto = {
  id: number;
  url: string;
  caption: string | null;
  createdAt: string;
  dateId: string;
  dateTitle: string;
  dateNumber: number;
  uploadedBy: { id: string; nickname: string; emoji: string | null };
};

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
          <button
            key={p.id}
            onClick={() => setLightbox(p)}
            className="tap relative aspect-square overflow-hidden rounded-card bg-bg-warm/40 group"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.url}
              alt={p.caption ?? p.dateTitle}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-fg/95 flex flex-col"
          onClick={() => setLightbox(null)}
        >
          <div className="flex-1 flex items-center justify-center min-h-0 px-4 pt-4 pb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.url}
              alt={lightbox.caption ?? lightbox.dateTitle}
              className="max-w-full max-h-full object-contain rounded-card"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div
            className="shrink-0 bg-fg/90 backdrop-blur px-4 pt-3 pb-5 safe-bottom border-t border-bg/10 flex flex-col items-center gap-2.5 text-bg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xs text-center serif-italic">
              <p>
                {lightbox.uploadedBy.emoji ?? "👤"}{" "}
                {lightbox.uploadedBy.nickname}
                {" · "}
                {new Date(lightbox.createdAt).toLocaleString("ko", {
                  month: "numeric",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              {lightbox.caption && <p className="mt-0.5">{lightbox.caption}</p>}
            </div>
            <Link
              href={`/dates/${lightbox.dateId}`}
              className="tap text-[13px] underline serif-italic"
            >
              #{lightbox.dateNumber} {lightbox.dateTitle} →
            </Link>
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
