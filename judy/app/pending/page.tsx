import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function PendingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "approved" || user.role === "admin") redirect("/");
  if (user.role === "rejected") redirect("/login?error=rejected");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-bg">
      <div className="w-20 h-20 rounded-full bg-bg-warm flex items-center justify-center mb-6">
        <span className="text-4xl">🌱</span>
      </div>
      <h1 className="font-display text-2xl mb-2">
        승인 <em className="italic text-accent">대기 중</em>
      </h1>
      <p className="text-sm text-fg-soft mb-1">{user.nickname}님, 안녕하세요</p>
      <p className="text-xs text-fg-faint mb-8 leading-relaxed">
        관리자가 승인하면 사용 가능해요.
        <br />
        잠시만 기다려주세요.
      </p>
      <form action="/api/auth/logout" method="post">
        <button type="submit" className="text-xs text-fg-faint underline">
          로그아웃
        </button>
      </form>
    </main>
  );
}
