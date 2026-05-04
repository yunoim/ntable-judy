"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

type Photo = {
  id: number;
  url: string;
  caption: string | null;
  width: number | null;
  height: number | null;
  uploadedBy: { id: string; nickname: string; emoji: string | null };
  createdAt: string;
};

export default function PhotosSection({
  dateId,
  initial,
  meId,
  meRole,
}: {
  dateId: string;
  initial: Photo[];
  meId: string;
  meRole: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [photos, setPhotos] = useState<Photo[]>(initial);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<Photo | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(`/api/dates/${dateId}/photos`, {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        if (!res.ok) {
          setError(
            data.error === "blob_not_configured"
              ? "사진 저장소가 아직 설정되지 않았어요 (BLOB_READ_WRITE_TOKEN)"
              : data.error === "too_large"
                ? "파일이 너무 커요 (8MB 이하)"
                : data.error === "bad_mime"
                  ? "이미지 파일만 가능"
                  : data.error ?? "업로드 실패",
          );
          break;
        }
        setPhotos((ps) => [data, ...ps]);
      }
      startTransition(() => router.refresh());
    } catch (e: any) {
      setError(e?.message ?? "네트워크 오류");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(id: number) {
    if (!confirm("사진을 삭제할까요?")) return;
    try {
      const res = await fetch(`/api/photos/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "실패");
        return;
      }
      setPhotos((ps) => ps.filter((p) => p.id !== id));
      if (lightbox?.id === id) setLightbox(null);
      startTransition(() => router.refresh());
    } catch (e: any) {
      setError(e?.message ?? "네트워크 오류");
    }
  }

  return (
    <section className="mt-8 space-y-3">
      <div className="flex items-center justify-between">
        <p className="eyebrow">圖 · 사진 {photos.length}</p>
        <label className="text-[11px] text-accent underline cursor-pointer">
          {uploading ? "올리는 중..." : "+ 추가"}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            disabled={uploading}
            onChange={(e) => upload(e.target.files)}
            className="hidden"
          />
        </label>
      </div>
      {error && (
        <p className="text-xs text-rain bg-rain/10 px-3 py-2 rounded-card">
          {error}
        </p>
      )}
      {photos.length === 0 ? (
        <p className="text-[11px] text-fg-faint serif-italic px-1">
          아직 사진이 없어요.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {photos.map((p) => (
            <button
              key={p.id}
              onClick={() => setLightbox(p)}
              className="relative aspect-square overflow-hidden rounded-card bg-bg-warm/40 group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={p.caption ?? ""}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}

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
              alt={lightbox.caption ?? ""}
              className="max-w-full max-h-[80vh] object-contain rounded-card"
            />
            <div className="text-bg text-xs text-center serif-italic">
              {lightbox.uploadedBy.emoji ?? "👤"} {lightbox.uploadedBy.nickname}
              {" · "}
              {new Date(lightbox.createdAt).toLocaleString("ko", {
                month: "numeric",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
              {lightbox.caption && <p className="mt-1">{lightbox.caption}</p>}
            </div>
            <div className="flex gap-3">
              {(lightbox.uploadedBy.id === meId || meRole === "admin") && (
                <button
                  onClick={() => remove(lightbox.id)}
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
    </section>
  );
}
