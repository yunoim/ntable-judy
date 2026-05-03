"use client";

import { useSearchParams } from "next/navigation";

function errorMessage(error: string | null): string | null {
  if (!error) return null;
  if (error === "state") return "인증 상태가 일치하지 않아요. 다시 시도해주세요.";
  if (error === "rejected") return "접근이 거부된 계정이에요.";
  if (error === "server") return "로그인 처리 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.";
  return "로그인 중 문제가 발생했어요.";
}

export default function LoginClient() {
  const params = useSearchParams();
  const message = errorMessage(params.get("error"));

  return (
    <main className="min-h-screen flex flex-col bg-bg">
      <div
        className="relative h-[60vh] bg-bg-warm border-b border-fg/15"
        style={{
          backgroundImage:
            "linear-gradient(135deg, transparent 49%, rgba(44,32,23,0.18) 49% 51%, transparent 51%), linear-gradient(45deg, transparent 49%, rgba(44,32,23,0.18) 49% 51%, transparent 51%)",
        }}
      >
        <span className="absolute bottom-4 left-4 text-[10px] tracking-widest uppercase text-fg-soft">
          judy · ntable · kr
        </span>
      </div>

      <section className="flex-1 px-6 pt-7 pb-8 flex flex-col justify-between">
        <div>
          <h1 className="font-display text-3xl leading-tight">
            오늘은{" "}
            <em className="not-italic font-display italic text-accent">어디</em>{" "}
            갈까?
          </h1>
          <p className="mt-3 text-sm text-fg-soft leading-relaxed">
            매번 똑같은 코스 말고,
            <br />
            AI랑 같이 짜보자.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {message && (
            <p className="text-xs text-red-700" role="alert">
              {message}
            </p>
          )}
          <a
            href="/api/auth/kakao"
            className="block w-full bg-kakao text-fg rounded-card py-3.5 font-semibold text-center"
          >
            카카오로 시작하기
          </a>
          <p className="text-center text-[11px] text-fg-faint pt-1">
            관리자 승인 후 사용 가능 · 비공개
          </p>
        </div>
      </section>
    </main>
  );
}
