"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Eyebrow, Rule, SectionTitle, TabBar } from "@/components/ui";

type Bucket = {
  id: number;
  title: string;
  emoji: string | null;
  description: string | null;
  area: string | null;
  priority: number;
  done: boolean;
  doneAt: string | null;
  doneDate: { id: string; number: number; title: string } | null;
  createdBy: { id: string; nickname: string };
};

const EMOJIS = ["⛰️", "🌊", "🍣", "🎬", "🎨", "✈️", "📚", "🎄", "💍", "✨"];

export default function BucketsClient({
  meId,
  meRole,
  buckets,
}: {
  meId: string;
  meRole: string;
  buckets: Bucket[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("✨");
  const [description, setDescription] = useState("");
  const [area, setArea] = useState("");
  const [priority, setPriority] = useState(0);
  const [saving, setSaving] = useState(false);

  const todo = buckets.filter((b) => !b.done);
  const done = buckets.filter((b) => b.done);
  const formOpen = adding || editingId !== null;

  function resetForm() {
    setTitle("");
    setEmoji("✨");
    setDescription("");
    setArea("");
    setPriority(0);
    setAdding(false);
    setEditingId(null);
  }

  function startEdit(b: Bucket) {
    setAdding(false);
    setEditingId(b.id);
    setTitle(b.title);
    setEmoji(b.emoji ?? "✨");
    setDescription(b.description ?? "");
    setArea(b.area ?? "");
    setPriority(b.priority);
    setError(null);
  }

  async function add() {
    if (!title.trim()) {
      setError("이름은 필수");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/buckets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, emoji, description, area, priority }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "실패");
        return;
      }
      resetForm();
      startTransition(() => router.refresh());
    } catch (e: any) {
      setError(e?.message ?? "네트워크 오류");
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    if (editingId == null) return;
    if (!title.trim()) {
      setError("이름은 필수");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/buckets/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, emoji, description, area, priority }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "실패");
        return;
      }
      resetForm();
      startTransition(() => router.refresh());
    } catch (e: any) {
      setError(e?.message ?? "네트워크 오류");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(b: Bucket) {
    if (busyId) return;
    setBusyId(b.id);
    setError(null);
    try {
      const res = await fetch(`/api/buckets/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !b.done }),
      });
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

  async function remove(id: number) {
    if (busyId) return;
    if (!confirm("삭제할까요?")) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/buckets/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "실패");
        return;
      }
      if (editingId === id) resetForm();
      startTransition(() => router.refresh());
    } catch (e: any) {
      setError(e?.message ?? "네트워크 오류");
    } finally {
      setBusyId(null);
    }
  }

  function renderItem(b: Bucket) {
    const isMine = b.createdBy.id === meId;
    const canManage = isMine || meRole === "admin";
    return (
      <li
        key={b.id}
        className={[
          "editorial-card px-4 py-3 flex items-start gap-3",
          b.done ? "opacity-60" : "",
        ].join(" ")}
      >
        <button
          onClick={() => canManage && toggle(b)}
          disabled={!canManage || busyId === b.id}
          className={[
            "shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs leading-none mt-0.5",
            b.done
              ? "bg-accent border-accent text-bg"
              : "border-fg/30 hover:border-accent",
          ].join(" ")}
          aria-label="완료 토글"
        >
          {b.done ? "✓" : ""}
        </button>
        <span className="text-xl shrink-0 leading-tight">{b.emoji ?? "✨"}</span>
        <div className="flex-1 min-w-0">
          <p
            className={[
              "font-display text-base",
              b.done ? "line-through text-fg-faint" : "",
            ].join(" ")}
          >
            {b.title}
            {b.priority > 0 && !b.done && (
              <span className="ml-1.5 text-accent text-xs align-middle">★</span>
            )}
          </p>
          {(b.area || b.description) && (
            <p className="text-[11px] text-fg-faint mt-0.5">
              {b.area && (
                <>
                  <span className="serif-italic">{b.area}</span>
                  {b.description && (
                    <span className="mx-1.5 text-fg-faint/50">·</span>
                  )}
                </>
              )}
              {b.description}
            </p>
          )}
          {b.done && b.doneDate && (
            <Link
              href={`/dates/${b.doneDate.id}`}
              className="inline-block text-[10px] text-accent underline mt-1"
            >
              #{b.doneDate.number} {b.doneDate.title} 에서 완료 →
            </Link>
          )}
          {b.done && !b.doneDate && b.doneAt && (
            <p className="text-[10px] text-fg-faint mt-1 serif-italic">
              {new Date(b.doneAt).toLocaleDateString("ko", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}{" "}
              완료
            </p>
          )}
          {canManage && (
            <div className="flex gap-3 mt-1.5">
              {!b.done && (
                <button
                  onClick={() => startEdit(b)}
                  className="text-[10px] text-fg-faint underline"
                >
                  수정
                </button>
              )}
              <button
                onClick={() => remove(b.id)}
                disabled={busyId === b.id}
                className="text-[10px] text-fg-faint underline"
              >
                삭제
              </button>
            </div>
          )}
        </div>
      </li>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-5 pt-5 pb-4 safe-top flex items-start justify-between">
        <Link href="/" className="text-xs text-fg-faint pt-1">
          ← 홈
        </Link>
        <div className="text-center">
          <Eyebrow>志 · bucket list</Eyebrow>
          <p className="font-display text-2xl mt-1">
            <em className="italic">같이 가</em>고 싶은
          </p>
        </div>
        <button
          onClick={() => {
            if (formOpen) resetForm();
            else setAdding(true);
          }}
          className="text-fg-faint text-base pt-1 w-8 text-right"
          aria-label="추가"
        >
          {formOpen ? "✕" : "+"}
        </button>
      </header>

      <Rule variant="dot" className="mx-5" />

      {error && (
        <div className="mx-5 mt-3 px-3 py-2 rounded-card border border-rain/40 bg-rain/10 text-xs text-rain">
          {error}
        </div>
      )}

      {formOpen && (
        <section className="mx-5 mt-4 p-5 editorial-card-warm space-y-3">
          <Eyebrow>{editingId ? "수정" : "new bucket"}</Eyebrow>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 60))}
            placeholder="이름 (예: 강릉 바다)"
            className="w-full bg-bg border border-fg/20 rounded-card px-3 py-2.5 text-sm focus:outline-none focus:border-accent"
          />
          <input
            value={area}
            onChange={(e) => setArea(e.target.value.slice(0, 30))}
            placeholder="지역 (선택)"
            className="w-full bg-bg border border-fg/20 rounded-card px-3 py-2.5 text-sm focus:outline-none focus:border-accent"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 200))}
            placeholder="메모 (선택)"
            rows={2}
            className="w-full bg-bg border border-fg/20 rounded-card px-3 py-2.5 text-sm focus:outline-none focus:border-accent resize-none"
          />
          <div className="flex gap-1.5 flex-wrap">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={[
                  "w-9 h-9 rounded-card text-base flex items-center justify-center",
                  emoji === e
                    ? "bg-accent text-bg"
                    : "bg-bg border border-fg/20",
                ].join(" ")}
              >
                {e}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-fg-soft">
            <input
              type="checkbox"
              checked={priority > 0}
              onChange={(e) => setPriority(e.target.checked ? 1 : 0)}
            />
            우선순위 ★ (위쪽에 표시)
          </label>
          <button
            type="button"
            onClick={editingId ? saveEdit : add}
            disabled={saving || !title.trim()}
            className="w-full bg-ink-card text-bg rounded-card py-2.5 text-sm font-semibold disabled:opacity-40"
          >
            {saving
              ? "저장 중..."
              : editingId
                ? "수정 ✓"
                : "추가 ✓"}
          </button>
        </section>
      )}

      <main className="flex-1 px-5 pt-5 pb-28 space-y-7">
        <section className="space-y-3">
          <SectionTitle title="해보고 싶은 것" hint={`${todo.length}개`} />
          {todo.length === 0 ? (
            <div className="text-center pt-4 pb-4">
              <span className="text-4xl">🌱</span>
              <p className="font-display text-base mt-3">
                <em className="italic">씨앗</em>을 심어볼까요
              </p>
              <p className="text-[11px] text-fg-faint mt-2">
                + 버튼으로 첫 버킷 추가
              </p>
            </div>
          ) : (
            <ul className="space-y-2.5">{todo.map(renderItem)}</ul>
          )}
        </section>

        {done.length > 0 && (
          <section className="space-y-3">
            <SectionTitle title="해본 것" hint={`${done.length}개`} />
            <ul className="space-y-2.5">{done.map(renderItem)}</ul>
          </section>
        )}
      </main>

      <TabBar active="us" />
    </div>
  );
}
