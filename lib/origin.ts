// lib/origin.ts — Cloudflare/Railway proxy 뒤에서 안정적으로 public origin 결정
//
// 우선순위:
//   1. APP_URL 환경변수 (가장 확실)
//   2. x-forwarded-proto + x-forwarded-host (Cloudflare 가 보냄)
//   3. host 헤더
//   4. req.url 의 origin (Railway 내부 호스트일 수 있음 — 최후 수단)

export function publicOrigin(req: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");

  const headers = req.headers;
  const xfHost = headers.get("x-forwarded-host");
  if (xfHost) {
    const proto = headers.get("x-forwarded-proto") ?? "https";
    return `${proto}://${xfHost}`;
  }

  const host = headers.get("host");
  if (host) {
    const proto =
      headers.get("x-forwarded-proto") ??
      (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }

  return new URL(req.url).origin;
}
