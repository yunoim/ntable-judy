"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { AdminUser } from "./page";

type Action = "approve" | "reject" | "unblock" | "setPartner";

export default function AdminClient({
  pending,
  approved,
  rejected,
  currentAdminId,
}: {
  pending: AdminUser[];
  approved: AdminUser[];
  rejected: AdminUser[];
  currentAdminId: string;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function act(userId: string, action: Action) {
    if (busyId) return;
    setBusyId(userId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `실패 (${res.status})`);
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
      <header className="sticky top-0 z-10 bg-bg/95 backdrop-blur border-b border-fg/15 px-4 pt-4 pb-3 safe-top">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-fg-faint">
            ← 홈
          </Link>
          <p className="font-display text-base">
            관리자 <em className="italic text-accent">패널</em>
          </p>
          <span className="text-xs text-fg-faint w-8 text-right">
            {pending.length > 0 ? `· ${pending.length}` : ""}
          </span>
        </div>
      </header>

      {error && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-card border border-rain/40 bg-rain/10 text-xs text-rain">
          {error}
        </div>
      )}

      <main className="flex-1 px-4 py-4 space-y-7 pb-12">
        <Section
          title="신청자"
          count={pending.length}
          empty="아직 신청자가 없어요"
        >
          {pending.map((u) => (
            <UserRow
              key={u.id}
              user={u}
              variant="pending"
              busy={busyId === u.id}
              actions={[
                {
                  label: "승인",
                  variant: "primary",
                  onClick: () => act(u.id, "approve"),
                },
                {
                  label: "거부",
                  variant: "ghost",
                  onClick: () => act(u.id, "reject"),
                },
              ]}
            />
          ))}
        </Section>

        <Section
          title="승인된 사용자"
          count={approved.length}
          empty="아직 승인된 사용자가 없어요"
        >
          {approved.map((u) => {
            const isMe = u.id === currentAdminId;
            const isAdmin = u.role === "admin";
            const actions: { label: string; variant: "primary" | "ghost" | "danger"; onClick: () => void }[] = [];
            if (!u.partner && !isAdmin) {
              actions.push({
                label: "👫 파트너",
                variant: "ghost",
                onClick: () => act(u.id, "setPartner"),
              });
            }
            if (!isAdmin) {
              actions.push({
                label: "차단",
                variant: "danger",
                onClick: () => act(u.id, "reject"),
              });
            }
            return (
              <UserRow
                key={u.id}
                user={u}
                variant="approved"
                badge={isAdmin ? "admin" : u.partner ? "👫 파트너" : undefined}
                meLabel={isMe}
                busy={busyId === u.id}
                actions={actions}
              />
            );
          })}
        </Section>

        <Section
          title="거부된 사용자"
          count={rejected.length}
          empty="없음"
        >
          {rejected.map((u) => (
            <UserRow
              key={u.id}
              user={u}
              variant="rejected"
              busy={busyId === u.id}
              actions={[
                {
                  label: "복구",
                  variant: "ghost",
                  onClick: () => act(u.id, "unblock"),
                },
              ]}
            />
          ))}
        </Section>
      </main>
    </div>
  );
}

function Section({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <p className="text-[11px] tracking-widest uppercase text-fg-faint">
        {title} {count > 0 && <span className="text-fg-soft">· {count}</span>}
      </p>
      {count === 0 ? (
        <p className="text-xs text-fg-faint italic px-1">{empty}</p>
      ) : (
        <ul className="space-y-2">{children}</ul>
      )}
    </section>
  );
}

function UserRow({
  user,
  variant,
  badge,
  meLabel,
  busy,
  actions,
}: {
  user: AdminUser;
  variant: "pending" | "approved" | "rejected";
  badge?: string;
  meLabel?: boolean;
  busy: boolean;
  actions: { label: string; variant: "primary" | "ghost" | "danger"; onClick: () => void }[];
}) {
  const subtitle =
    variant === "pending"
      ? `가입 ${formatRel(user.createdAt)}`
      : variant === "approved"
        ? user.lastLoginAt
          ? `최근 ${formatRel(user.lastLoginAt)}`
          : `승인 ${formatRel(user.approvedAt)}`
        : `거부 ${formatRel(user.rejectedAt)}`;

  return (
    <li className="rounded-card border border-fg/15 bg-bg p-3 flex items-center gap-3">
      {user.profileImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.profileImage}
          alt=""
          className="w-10 h-10 rounded-full object-cover bg-bg-warm shrink-0"
        />
      ) : (
        <span className="w-10 h-10 rounded-full bg-bg-warm flex items-center justify-center text-base shrink-0">
          {user.emoji ?? "👤"}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <p className="font-display text-sm truncate">{user.nickname}</p>
          {badge && (
            <span className="text-[9px] uppercase tracking-wider text-accent">
              {badge}
            </span>
          )}
          {meLabel && (
            <span className="text-[9px] uppercase tracking-wider text-fg-faint">
              · 본인
            </span>
          )}
        </div>
        <p className="text-[10px] text-fg-faint truncate">{subtitle}</p>
      </div>
      <div className="flex gap-1.5 shrink-0">
        {actions.map((a, i) => (
          <button
            key={i}
            onClick={a.onClick}
            disabled={busy}
            className={[
              "text-[11px] rounded-full px-3 py-1.5 transition-opacity",
              busy ? "opacity-50" : "",
              a.variant === "primary"
                ? "bg-ink-card text-bg"
                : a.variant === "danger"
                  ? "border border-rain/50 text-rain"
                  : "border border-fg/30 text-fg",
            ].join(" ")}
          >
            {a.label}
          </button>
        ))}
      </div>
    </li>
  );
}

function formatRel(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}시간 전`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}일 전`;
  return d.toLocaleDateString("ko", { month: "short", day: "numeric" });
}
