// 클라이언트 사진 업로드 — 3단계 흐름:
// 1) /upload-init  : 서버에서 presigned PUT URL 발급
// 2) PUT to R2     : 클라가 R2 에 직접 (Cloudflare/Railway 프록시 우회)
// 3) /upload-finalize : 서버가 DatePhoto row 생성, 응답
//
// 한 곳에서만 에러 처리하면 되도록 묶음. 에러는 throw, 응답은 finalize 결과 반환.

export type UploadedPhoto = {
  id: number;
  url: string;
  caption: string | null;
  width: number | null;
  height: number | null;
  uploadedBy: { id: string; nickname: string; emoji: string | null };
  createdAt: string;
};

export class PhotoUploadError extends Error {
  status: number;
  error: string;
  detail?: string;
  stage: "init" | "put" | "finalize";
  constructor(
    stage: "init" | "put" | "finalize",
    status: number,
    error: string,
    detail?: string,
  ) {
    super(`${stage}: ${error}${detail ? " " + detail : ""}`);
    this.stage = stage;
    this.status = status;
    this.error = error;
    this.detail = detail;
  }
}

export async function uploadPhotoForDate(
  dateId: string,
  file: File,
  // 사용자가 어떤 피커(사진/영상) 로 골랐는지 — file.type 도 확장자도 없을 때
  // 최후 fallback 결정에 씀.
  kindHint?: "image" | "video",
): Promise<UploadedPhoto> {
  // Android 갤러리 등이 file.type 을 비우거나 확장자 없는 이름으로 주는 케이스를
  // 다 잡으려고 type → 확장자 → 힌트 → 기본 순서로 추론.
  const contentType = inferMime(file, kindHint);

  // 단일 POST — 서버가 raw 바디를 R2 에 스트리밍 (CORS 무관).
  let res: Response;
  try {
    res = await fetch(`/api/dates/${dateId}/photos`, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body: file,
    });
  } catch (e: any) {
    throw new PhotoUploadError(
      "put",
      0,
      "network_failed",
      e?.message ?? String(e),
    );
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new PhotoUploadError(
      "finalize",
      res.status,
      data.error ?? "upload_failed",
      data.detail,
    );
  }
  return data as UploadedPhoto;
}

// file.type → 파일명 확장자 → 피커 힌트 → 기본 순서로 mime 추론.
// Samsung Internet / Android picker 가 type 없이, 그리고 확장자도 없는 이름
// (예: "20260604_171530") 으로 주는 케이스까지 잡는다.
function inferMime(file: File, hint?: "image" | "video"): string {
  const t = (file.type || "").toLowerCase().trim();
  if (t && t !== "application/octet-stream") return t;
  const ext = (file.name.toLowerCase().split(".").pop() ?? "").trim();
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    heic: "image/heic",
    heif: "image/heif",
    gif: "image/gif",
    mp4: "video/mp4",
    m4v: "video/x-m4v",
    mov: "video/quicktime",
    webm: "video/webm",
  };
  // 확장자가 점 포함 (예: "video.mp4") 일 때만 map 조회.
  if (file.name.includes(".") && map[ext]) return map[ext];
  // 확장자 추론 실패 — 피커 힌트로 fallback.
  if (hint === "video") return "video/mp4";
  if (hint === "image") return "image/jpeg";
  return "application/octet-stream";
}

// 에러 → 사용자에게 보일 한국어 메시지.
export function photoUploadErrorMessage(e: unknown): string {
  if (e instanceof PhotoUploadError) {
    if (e.error === "storage_not_configured")
      return "사진 저장소 미설정 (R2 env)";
    if (e.error === "too_large")
      return `파일이 너무 커요 (${e.detail ?? "사진 8MB · 영상 80MB"})`;
    if (e.error === "bad_mime")
      return `지원 안 하는 형식 (${e.detail ?? "?"})`;
    if (e.error === "network_failed")
      return `네트워크 연결 실패 — 다시 시도해주세요 (${e.detail ?? ""})`;
    if (e.error === "hevc_unsupported")
      return "HEVC (H.265) 코덱 영상이라 브라우저에서 재생이 안 돼요. 갤럭시 카메라 → 설정 → 동영상 → '호환성 우선' 으로 바꾸고 다시 찍으면 H.264 로 저장돼요.";
    if (e.error === "upload_failed")
      return `업로드 실패: ${e.detail ?? "원인 불명"}`;
    if (e.error === "db_failed")
      return `DB 저장 실패: ${e.detail ?? ""}`;
    return `${e.error}${e.detail ? " " + e.detail : ""}`;
  }
  return (e as { message?: string })?.message ?? "네트워크 오류";
}
