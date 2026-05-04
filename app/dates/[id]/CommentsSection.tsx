"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Comment = {
  id: number;
  body: string;
  createdAt: string;
  user: { id: string; nickname: string; emoji: string | null };
};

export default function CommentsSection({
  dateId,
  initial,
  meId,
  meRole,
}: {
  dateId: string;
  initial: Comment[];
  meId: string;
  meRole: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [comments, setComments] = useState<Comment[]>(initial);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editBody, setEditBody] = useState("");

  async function add() {
    const text = body.trim();
    if (!text) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/dates/${dateId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "실패");
        return;
      }
      setComments((cs) => [...cs, data]);
      setBody("");
      startTransition(() => router.refresh());
    } catch (e: any) {
      setError(e?.message ?? "네트워크 오류");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(c: Comment) {
    setEditingId(c.id);
    setEditBody(c.body);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditBody("");
  }

  async function saveEdit() {
    if (editingId == null) return;
    const text = editBody.trim();
    if (!text) {
      setError("내용이 비어있어요");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/comments/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "실패");
        return;
      }
      setComments((cs) =>
        cs.map((c) => (c.id === editingId ? { ...c, body: data.body } : c)),
      );
      cancelEdit();
      startTransition(() => router.refresh());
    } catch (e: any) {
      setError(e?.message ?? "네트워크 오류");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("삭제할까요?")) return;
    try {
      const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "실패");
        return;
      }
      setComments((cs) => cs.filter((c) => c.id !== id));
      if (editingId === id) cancelEdit();
      startTransition(() => router.refresh());
    } catch (e: any) {
      setError(e?.message ?? "네트워크 오류");
    }
  }

  return (
    <section className="mt-8 space-y-3">
      <p className="eyebrow">⌇ 코멘트 · {comments.length}</p>
      {error && (
        <p className="text-xs text-rain bg-rain/10 px-3 py-2 rounded-card">
          {error}
        </p>
      )}
      {comments.length > 0 && (
        <ul className="space-y-2.5">
          {comments.map((c) => {
            const mine = c.user.id === meId;
            const canManage = mine || meRole === "admin";
            const isEditing = editingId === c.id;
            return (
              <li
                key={c.id}
                className="editorial-card px-4 py-3 flex gap-3 items-start"
              >
                <span className="text-base shrink-0 mt-0.5">
                  {c.user.emoji ?? "👤"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-sm">
                      {c.user.nickname}
                    </span>
                    <span className="serif-italic text-fg-faint text-[10px]">
                      {new Date(c.createdAt).toLocaleString("ko", {
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {isEditing ? (
                    <div className="mt-1.5 space-y-2">
                      <textarea
                        value={editBody}
                        onChange={(e) =>
                          setEditBody(e.target.value.slice(0, 2000))
                        }
                        rows={3}
                        className="w-full bg-bg border border-accent rounded-card px-3 py-2 text-sm focus:outline-none resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={saveEdit}
                          disabled={saving || !editBody.trim()}
                          className="flex-1 bg-ink-card text-bg rounded-card py-2 text-xs font-semibold disabled:opacity-40"
                        >
                          {saving ? "저장 중..." : "수정 ✓"}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-4 rounded-card border border-fg/20 text-xs"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed mt-1 text-fg-soft">
                      {c.body}
                    </p>
                  )}
                  {canManage && !isEditing && (
                    <div className="flex gap-3 mt-1.5">
                      {mine && (
                        <button
                          onClick={() => startEdit(c)}
                          className="text-[10px] text-fg-faint underline"
                        >
                          수정
                        </button>
                      )}
                      <button
                        onClick={() => remove(c.id)}
                        className="text-[10px] text-fg-faint underline"
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 2000))}
          placeholder="이 데이트에 대해 한 마디..."
          rows={2}
          className="flex-1 bg-bg border border-fg/20 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-accent resize-none"
        />
        <button
          type="button"
          onClick={add}
          disabled={saving || !body.trim()}
          className="bg-ink-card text-bg rounded-card px-4 text-sm font-semibold disabled:opacity-40 self-stretch"
        >
          {saving ? "..." : "남김"}
        </button>
      </div>
    </section>
  );
}
