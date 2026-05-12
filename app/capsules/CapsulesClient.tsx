"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Eyebrow, Rule, SectionTitle, TabBar } from "@/components/ui";

type Capsule = {
  id: number;
  title: string;
  body: string;
  openAt: string;
  opened: boolean;
  openedAt: string | null;
  createdById: string;
  createdBy: { id: string; nickname: string };
  canOpen: boolean;
};

function daysUntil(target: Date) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const t = new Date(target);
  t.setHours(0, 0, 0, 0);
  return Math.round((t.getTime() - now.getTime()) / 86400000);
}

export default function CapsulesClient({
  meId,
  meRole,
  capsules,
}: {
  meId: string;
  meRole: string;
  capsules: Capsule[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [openAt, setOpenAt] = useState("");
  const [saving, setSaving] = useState(false);

  const sealed = capsules.filter((c) => !c.opened);
  const opened = capsules.filter((c) => c.opened);

  async function add() {
    if (!title.trim() || !body.trim() || !openAt) {
      setError("제목·내용·열 날짜 모두 필수");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/capsules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, openAt }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error === "openAt_past"
            ? "열 날짜는 미래여야 해요"
            : data.error ?? "실패",
        );
        return;
      }
      setTitle("");
      setBody("");
      setOpenAt("");
      setAdding(false);
      startTransition(() => router.refresh());
    } catch (e: any) {
      setError(e?.message ?? "네트워크 오류");
    } finally {
      setSaving(false);
    }
  }

  async function open(c: Capsule) {
    if (busyId) return;
    setBusyId(c.id);
    setError(null);
    try {
      const res = await fetch(`/api/capsules/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "open" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "실패");
        return;
      }
      setRevealed((r) => ({ ...r, [c.id]: true }));
      startTransition(() => router.refresh());
    } catch (e: any) {
      setError(e?.message ?? "네트워크 오류");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: number) {
    if (busyId) return;
    if (!confirm("삭제할까요?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/capsules/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "실패");
        return;
      }
      startTransition(() => router.refresh());
    } catch (e: any) {
      setError(e?.message ?? "네트워크 오류");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-5 pt-5 pb-4 safe-top flex items-start justify-between">
        <Link href="/" className="text-xs text-fg-faint pt-1">
          ← 홈
        </Link>
        <div className="text-center">
          <Eyebrow>函 · time capsule</Eyebrow>
          <p className="font-display text-2xl mt-1">
            <em className="italic">미래</em>에 보내는
          </p>
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className="text-fg-faint text-base pt-1 w-8 text-right"
          aria-label="추가"
        >
          {adding ? "✕" : "+"}
        </button>
      </header>

      <Rule variant="dot" className="mx-5" />

      {error && (
        <div className="mx-5 mt-3 px-3 py-2 rounded-card border border-rain/40 bg-rain/10 text-xs text-rain">
          {error}
        </div>
      )}

      {adding && (
        <section className="mx-5 mt-4 p-5 editorial-card-warm space-y-3">
          <Eyebrow>새 캡슐</Eyebrow>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 80))}
            placeholder="제목 (예: 1주년에게)"
            className="w-full bg-bg border border-fg/20 rounded-card px-3 py-2.5 text-sm focus:outline-none focus:border-accent"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 5000))}
            placeholder="편지 내용. 미래의 우리가 읽을 글."
            rows={6}
            className="w-full bg-bg border border-fg/20 rounded-card px-3 py-2.5 text-sm focus:outline-none focus:border-accent resize-none"
          />
          <div>
            <label className="eyebrow block mb-1.5">열 날짜</label>
            <input
              type="date"
              value={openAt}
              onChange={(e) => setOpenAt(e.target.value)}
              min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
              className="w-full bg-bg border border-fg/20 rounded-card px-3 py-2.5 text-sm focus:outline-none focus:border-accent"
            />
          </div>
          <p className="text-[10px] text-fg-faint italic">
            한번 봉인하면 그 날짜까지는 둘 다 못 봐요.
          </p>
          <button
            type="button"
            onClick={add}
            disabled={saving || !title.trim() || !body.trim() || !openAt}
            className="w-full bg-ink-card text-bg rounded-card py-2.5 text-sm font-semibold disabled:opacity-40"
          >
            {saving ? "봉인 중..." : "봉인 ✓"}
          </button>
        </section>
      )}

      <main className="flex-1 px-5 pt-5 pb-28 space-y-7">
        <section className="space-y-3">
          <SectionTitle title="봉인된 캡슐" hint={`${sealed.length}개`} />
          {sealed.length === 0 ? (
            <div className="text-center pt-4 pb-4">
              <span className="text-4xl">📜</span>
              <p className="font-display text-base mt-3">
                <em className="italic">처음 한 통</em>을 써볼까요
              </p>
              <p className="text-[11px] text-fg-faint mt-2">
                + 버튼으로 첫 캡슐 추가
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {sealed.map((c) => {
                const days = daysUntil(new Date(c.openAt));
                const isMine = c.createdById === meId;
                return (
                  <li
                    key={c.id}
                    className={[
                      "editorial-card-warm relative px-5 py-4",
                      c.canOpen ? "!border-accent" : "",
                    ].join(" ")}
                  >
                    <span className="corner-mark">封 No.{c.id}</span>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-display text-base truncate">
                        {c.title}
                      </p>
                      <span
                        className={[
                          "font-display text-sm shrink-0",
                          c.canOpen ? "text-accent" : "text-fg-soft",
                        ].join(" ")}
                      >
                        {c.canOpen || days === 0 ? "오늘" : `D-${days}`}
                      </span>
                    </div>
                    <p className="text-[11px] text-fg-faint mt-1">
                      {new Date(c.openAt).toLocaleDateString("ko", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}{" "}
                      에 열림 · {c.createdBy.nickname}
                    </p>
                    {c.canOpen ? (
                      <button
                        type="button"
                        onClick={() => open(c)}
                        disabled={busyId === c.id}
                        className="w-full mt-3 bg-ink-card text-bg rounded-card py-2 text-sm font-semibold"
                      >
                        {busyId === c.id ? "여는 중..." : "지금 열기"}
                      </button>
                    ) : isMine || meRole === "admin" ? (
                      <button
                        onClick={() => remove(c.id)}
                        className="text-[10px] text-fg-faint underline mt-1.5"
                      >
                        삭제 (봉인 전)
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {opened.length > 0 && (
          <section className="space-y-3">
            <SectionTitle title="열린 편지" hint={`${opened.length}개`} />
            <ul className="space-y-3">
              {opened.map((c) => {
                const showBody = revealed[c.id] !== false;
                return (
                  <li
                    key={c.id}
                    className="editorial-card relative px-5 py-4 space-y-3"
                  >
                    <span className="corner-mark">開 No.{c.id}</span>
                    <header>
                      <p className="font-display text-base">{c.title}</p>
                      <p className="text-[10px] text-fg-faint mt-0.5">
                        {new Date(c.openAt).toLocaleDateString("ko")} 열림 ·{" "}
                        <span className="serif-italic">
                          {c.createdBy.nickname}
                        </span>
                      </p>
                    </header>
                    {showBody ? (
                      <p className="text-sm whitespace-pre-wrap leading-relaxed text-fg-soft">
                        {c.body}
                      </p>
                    ) : (
                      <button
                        onClick={() =>
                          setRevealed((r) => ({ ...r, [c.id]: true }))
                        }
                        className="text-[11px] text-accent underline"
                      >
                        다시 보기
                      </button>
                    )}
                    {showBody && (
                      <button
                        onClick={() =>
                          setRevealed((r) => ({ ...r, [c.id]: false }))
                        }
                        className="text-[10px] text-fg-faint underline"
                      >
                        접기
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </main>

      <TabBar active="us" />
    </div>
  );
}
