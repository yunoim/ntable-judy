"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

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

  async function remove(id: number) {
    if (busy) return;
    if (!confirm("사진을 삭제할까요?")) return;
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
          className="fixed inset-0 z-50 bg-fg/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="max-w-full max-h-full flex flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.url}
              alt={lightbox.caption ?? lightbox.dateTitle}
              className="max-w-full max-h-[72vh] object-contain rounded-card"
            />
            <div className="text-bg text-xs text-center serif-italic space-y-1">
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
              {lightbox.caption && <p>{lightbox.caption}</p>}
            </div>
            <Link
              href={`/dates/${lightbox.dateId}`}
              className="tap text-xs text-bg/80 underline serif-italic"
            >
              #{lightbox.dateNumber} {lightbox.dateTitle} →
            </Link>
            <div className="flex gap-3">
              {(lightbox.uploadedBy.id === meId || meRole === "admin") && (
                <button
                  onClick={() => remove(lightbox.id)}
                  disabled={busy}
                  className="text-xs text-rain underline"
                >
                  삭제
                </button>
              )}
              <button
                onClick={() => setLightbox(null)}
                className="text-xs text-bg/70 underline"
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
