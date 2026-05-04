"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
// import PushToggle from "@/components/PushToggle"; // 알림 보류 (2026-05-04)

export default function ProfileClient({
  user,
  emojis,
}: {
  user: {
    id: string;
    nickname: string;
    emoji: string | null;
    profileImage: string | null;
    role: string;
    birthday: string | null;
    birthTime: string | null;
  };
  emojis: string[];
}) {
  const router = useRouter();
  const [nickname, setNickname] = useState(user.nickname);
  const [emoji, setEmoji] = useState<string | null>(user.emoji);
  const [birthday, setBirthday] = useState<string>(user.birthday ?? "");
  const [birthTime, setBirthTime] = useState<string>(user.birthTime ?? "");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname,
          emoji: emoji ?? "",
          birthday: birthday || null,
          birthTime: birthTime || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `실패 (${res.status})`);
        return;
      }
      setSavedAt(Date.now());
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "네트워크 오류");
    } finally {
      setSaving(false);
    }
  }

  const dirty =
    nickname !== user.nickname ||
    emoji !== user.emoji ||
    (birthday || "") !== (user.birthday ?? "") ||
    (birthTime || "") !== (user.birthTime ?? "");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-bg/95 backdrop-blur border-b border-fg/15 px-4 pt-4 pb-3 safe-top flex items-center justify-between">
        <Link href="/" className="text-sm text-fg-faint">
          ← 홈
        </Link>
        <p className="font-display text-base">
          내 <em className="italic text-accent">프로필</em>
        </p>
        <span className="w-12" />
      </header>

      <main className="flex-1 px-4 py-5 space-y-6 pb-32">
        <section className="flex flex-col items-center gap-3 pt-3">
          {user.profileImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.profileImage}
              alt=""
              className="w-20 h-20 rounded-full object-cover bg-bg-warm"
            />
          ) : (
            <span className="w-20 h-20 rounded-full bg-bg-warm flex items-center justify-center text-3xl">
              {emoji ?? "👤"}
            </span>
          )}
          {user.role === "admin" && (
            <span className="text-[10px] uppercase tracking-wider text-accent">
              admin
            </span>
          )}
        </section>

        <section className="space-y-1.5">
          <label className="text-[11px] tracking-widest uppercase text-fg-faint">
            닉네임
          </label>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value.slice(0, 20))}
            className="w-full bg-bg-warm/40 border border-fg/20 rounded-card px-3 py-2.5 text-sm focus:outline-none focus:border-accent"
          />
          <p className="text-[10px] text-fg-faint italic">
            카카오 닉네임이 기본값. 자유롭게 바꿀 수 있어요.
          </p>
        </section>

        <section className="space-y-2">
          <label className="text-[11px] tracking-widest uppercase text-fg-faint">
            이모지
          </label>
          <div className="grid grid-cols-8 gap-2">
            {emojis.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(emoji === e ? null : e)}
                className={[
                  "aspect-square rounded-card text-xl flex items-center justify-center transition-colors",
                  emoji === e
                    ? "bg-accent text-bg"
                    : "bg-bg-warm/40 hover:bg-bg-warm/70",
                ].join(" ")}
              >
                {e}
              </button>
            ))}
          </div>
          {emoji && (
            <button
              type="button"
              onClick={() => setEmoji(null)}
              className="text-[11px] text-fg-faint underline"
            >
              해제
            </button>
          )}
        </section>

        <section className="space-y-1.5">
          <label className="text-[11px] tracking-widest uppercase text-fg-faint">
            생일
          </label>
          <input
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            className="w-full bg-bg-warm/40 border border-fg/20 rounded-card px-3 py-2.5 text-sm focus:outline-none focus:border-accent"
          />
          <p className="text-[10px] text-fg-faint italic">
            저장하면 <em className="not-italic text-accent">우리</em>에 생일 기념일이 자동으로 추가돼요.
          </p>
          {birthday && (
            <button
              type="button"
              onClick={() => setBirthday("")}
              className="text-[11px] text-fg-faint underline"
            >
              지우기
            </button>
          )}
        </section>

        <section className="space-y-1.5">
          <label className="text-[11px] tracking-widest uppercase text-fg-faint">
            태어난 시간 <span className="lowercase tracking-normal text-fg-faint">(선택)</span>
          </label>
          <input
            type="time"
            value={birthTime}
            onChange={(e) => setBirthTime(e.target.value)}
            className="w-full bg-bg-warm/40 border border-fg/20 rounded-card px-3 py-2.5 text-sm focus:outline-none focus:border-accent"
          />
          <p className="text-[10px] text-fg-faint italic">
            사주/궁합용. 모르면 비워둬도 돼요.
          </p>
        </section>

        {/* 알림 보류 (2026-05-04) — 채팅 기능 도입 시 부활
        <section className="space-y-1.5 pt-4 border-t border-fg/10">
          <label className="text-[11px] tracking-widest uppercase text-fg-faint">
            푸시 알림
          </label>
          <p className="text-[10px] text-fg-faint italic mb-2">
            기념일·데이트·마일스톤·캡슐 알림. 끄면 더 이상 안 와요.
          </p>
          <PushToggle />
        </section>
        */}

        {savedAt && (
          <p className="text-xs text-accent text-center italic">
            저장됨 ✓
          </p>
        )}
        {error && <p className="text-xs text-rain text-center">{error}</p>}
      </main>

      <div className="sticky bottom-0 bg-bg/95 backdrop-blur border-t border-fg/15 px-4 py-3 safe-bottom">
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className="w-full bg-ink-card text-bg rounded-card py-3 font-semibold disabled:opacity-40"
        >
          {saving ? "저장 중..." : dirty ? "저장 ✓" : "변경 없음"}
        </button>
      </div>
    </div>
  );
}
