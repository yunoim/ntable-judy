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
): Promise<UploadedPhoto> {
  // 1. init — presigned URL 발급.
  const initRes = await fetch(`/api/dates/${dateId}/photos/upload-init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contentType: file.type || "application/octet-stream",
      size: file.size,
    }),
  });
  const init = await initRes.json().catch(() => ({}));
  if (!initRes.ok) {
    throw new PhotoUploadError(
      "init",
      initRes.status,
      init.error ?? "init_failed",
      init.detail,
    );
  }
  const { uploadUrl, key, publicUrl } = init as {
    uploadUrl: string;
    key: string;
    publicUrl: string;
  };

  // 2. PUT to R2.
  let putRes: Response;
  try {
    putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
    });
  } catch (e: any) {
    throw new PhotoUploadError(
      "put",
      0,
      "r2_fetch_failed",
      e?.message ?? String(e),
    );
  }
  if (!putRes.ok) {
    const txt = await putRes.text().catch(() => "");
    throw new PhotoUploadError(
      "put",
      putRes.status,
      "r2_put_failed",
      txt.slice(0, 200),
    );
  }

  // 3. finalize.
  const finRes = await fetch(`/api/dates/${dateId}/photos/upload-finalize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, publicUrl }),
  });
  const fin = await finRes.json().catch(() => ({}));
  if (!finRes.ok) {
    throw new PhotoUploadError(
      "finalize",
      finRes.status,
      fin.error ?? "finalize_failed",
      fin.detail,
    );
  }
  return fin as UploadedPhoto;
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
    if (e.error === "object_missing")
      return "업로드는 됐는데 R2 에 안 보여요. 다시 시도해 주세요.";
    if (e.stage === "put") {
      // R2 PUT 실패 — CORS 미설정이면 fetch 가 throw 하거나 200 외 코드.
      if (e.status === 0)
        return "R2 직접 업로드 실패 — 네트워크 또는 CORS 설정 확인 필요";
      return `R2 ${e.status} ${e.error}${e.detail ? " " + e.detail : ""}`;
    }
    if (e.stage === "init")
      return `업로드 준비 실패: ${e.detail ?? e.error}`;
    if (e.stage === "finalize")
      return `업로드 마무리 실패: ${e.detail ?? e.error}`;
    return e.message;
  }
  return (e as { message?: string })?.message ?? "네트워크 오류";
}
