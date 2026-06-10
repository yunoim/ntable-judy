"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  uploadPhotoForDate,
  photoUploadErrorMessage,
} from "@/lib/uploadPhoto";

export type UploadTargetDate = {
  id: string;
  number: number;
  title: string;
  scheduledAt: string;
  area: string | null;
};

export default function AlbumUploadFlow({
  dates,
}: {
  dates: UploadTargetDate[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ count: number; title: string } | null>(
    null,
  );
  // 진행률: current / total. null 이면 표시 안 함.
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  // ESC 로 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    if (busyId) return; // 업로드 중엔 못 닫음
    setOpen(false);
    setError(null);
    setDone(null);
  }

  async function upload(
    date: UploadTargetDate,
    files: FileList | null,
    kindHint: "image" | "video",
  ) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    setBusyId(date.id);
    setError(null);
    setDone(null);
    setProgress({ current: 0, total: list.length });
    let uploaded = 0;
    try {
      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        setProgress({ current: i + 1, total: list.length });
        try {
          await uploadPhotoForDate(date.id, file, kindHint);
          uploaded += 1;
        } catch (e) {
          setError(photoUploadErrorMessage(e));
          break;
        }
      }
      if (uploaded > 0) {
        setDone({ count: uploaded, title: date.title });
        startTransition(() => router.refresh());
      }
    } catch (e: any) {
      setError(e?.message ?? "네트워크 오류");
    } finally {
      setBusyId(null);
      setProgress(null);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tap fixed bottom-24 right-5 z-30 bg-ink-card text-bg rounded-full w-14 h-14 flex items-center justify-center font-display text-2xl leading-none"
        style={{
          boxShadow:
            "0 6px 16px -6px rgba(44,32,23,0.35), 0 2px 0 rgba(44,32,23,0.1)",
        }}
        aria-label="사진 등록"
      >
        +
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-fg/60 flex items-end sm:items-center justify-center"
          onClick={close}
        >
          <div
            className="bg-bg w-full max-w-[390px] rounded-t-card sm:rounded-card max-h-[80vh] flex flex-col animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="px-5 pt-4 pb-2 border-b border-fg/10 flex items-center justify-between">
              <div>
                <p className="font-display text-base">어느 데이트의 사진?</p>
                <p className="text-[10px] text-fg-faint mt-0.5">
                  📷 사진 8MB · 🎞️ 영상 80MB 이내 (mp4·mov·webm)
                </p>
              </div>
              <button
                onClick={close}
                disabled={!!busyId}
                className="text-fg-faint text-sm disabled:opacity-40"
                aria-label="닫기"
              >
                ✕
              </button>
            </header>

            {progress && (
              <div className="mx-5 mt-3 px-3 py-2.5 rounded-card bg-bg-warm border border-accent/30 space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[11px] font-display">
                    📤 업로드 중…
                  </span>
                  <span className="text-[11px] text-fg-faint tabular-nums">
                    {progress.current} / {progress.total}장
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-fg/10 overflow-hidden">
                  <div
                    className="h-full bg-accent transition-[width] duration-200"
                    style={{
                      width: `${Math.round((progress.current / progress.total) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
            {error && (
              <p className="mx-5 mt-3 text-xs text-rain bg-rain/10 px-3 py-2 rounded-card">
                {error}
              </p>
            )}
            {done && !progress && (
              <p className="mx-5 mt-3 text-xs text-accent bg-accent/10 px-3 py-2 rounded-card">
                ✓ {done.title} 에 {done.count}장 추가됨
              </p>
            )}

            {dates.length === 0 ? (
              <div className="px-5 py-10 text-center text-fg-faint text-sm">
                아직 등록된 데이트가 없어요.
              </div>
            ) : (
              <ul className="flex-1 overflow-y-auto pb-4">
                {dates.map((d) => {
                  const busy = busyId === d.id;
                  return (
                    <li key={d.id}>
                      <div
                        className={[
                          "flex items-center gap-3 px-5 py-3 border-b border-fg/8",
                          busy ? "opacity-50" : "hover:bg-bg-warm",
                        ].join(" ")}
                      >
                        <span className="font-display text-[15px] text-fg-soft tabular-nums w-9 shrink-0">
                          {String(d.number).padStart(2, "0")}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-display text-sm truncate">
                            {d.title}
                          </p>
                          <p className="text-[10px] text-fg-faint mt-0.5">
                            {new Date(d.scheduledAt).toLocaleDateString("ko", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                            {d.area ? ` · ${d.area}` : ""}
                          </p>
                        </div>
                        {/* 두 갈래 picker — 사진 / GIF 별도. Samsung 갤러리가
                            image/* 만으로 GIF 폴더를 안 보여주는 케이스 대응. */}
                        <label
                          className={[
                            "tap shrink-0 text-base px-2",
                            busy ? "cursor-wait" : "cursor-pointer",
                          ].join(" ")}
                          aria-label="사진 선택"
                        >
                          📷
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            disabled={!!busyId}
                            onChange={(e) => upload(d, e.target.files, "image")}
                            className="hidden"
                          />
                        </label>
                        <label
                          className={[
                            "tap shrink-0 text-base px-2",
                            busy ? "cursor-wait" : "cursor-pointer",
                          ].join(" ")}
                          aria-label="GIF 선택"
                        >
                          🎞️
                          <input
                            type="file"
                            accept="image/gif,video/mp4,video/quicktime"
                            multiple
                            disabled={!!busyId}
                            onChange={(e) => upload(d, e.target.files, "video")}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
