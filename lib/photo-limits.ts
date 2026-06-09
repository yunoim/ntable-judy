// 사진/영상 업로드 공통 제한.
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
export const MAX_VIDEO_BYTES = 80 * 1024 * 1024; // 80MB

export const ALLOWED_IMAGE_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/gif",
];
export const ALLOWED_VIDEO_MIME = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
];

export const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "video/x-m4v": "m4v",
};

export type CheckResult =
  | { ok: true; isVideo: boolean }
  | { ok: false; error: string; detail?: string; status: number };

export function checkMimeAndSize(
  contentType: string,
  size: number | null,
): CheckResult {
  const t = (contentType ?? "").split(";")[0].trim().toLowerCase();
  const isVideo = t.startsWith("video/");
  const isImage = t.startsWith("image/");
  if (!isVideo && !isImage) {
    return {
      ok: false,
      error: "bad_mime",
      detail: `mime=${t || "(empty)"}`,
      status: 400,
    };
  }
  if (isVideo && !ALLOWED_VIDEO_MIME.includes(t)) {
    return {
      ok: false,
      error: "bad_mime",
      detail: `video mime=${t}`,
      status: 400,
    };
  }
  if (isImage && !ALLOWED_IMAGE_MIME.includes(t)) {
    return {
      ok: false,
      error: "bad_mime",
      detail: `image mime=${t}`,
      status: 400,
    };
  }
  const cap = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (size !== null && size > cap) {
    return {
      ok: false,
      error: "too_large",
      detail: `${Math.round(size / 1024 / 1024)}MB > ${Math.round(cap / 1024 / 1024)}MB`,
      status: 400,
    };
  }
  return { ok: true, isVideo };
}
