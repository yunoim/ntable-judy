// components/ui.tsx — shared UI primitives
"use client";
import Link from "next/link";
import { cn } from "@/lib/cn";

export function Pill({
  children,
  filled = false,
  className,
}: {
  children: React.ReactNode;
  filled?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs",
        filled
          ? "bg-fg text-bg border-fg"
          : "bg-transparent text-fg border-fg/70",
        className
      )}
    >
      {children}
    </span>
  );
}

export function Avatar({
  user,
  size = "md",
  variant = "warm",
}: {
  user: { name: string; emoji: string };
  size?: "sm" | "md" | "lg";
  variant?: "warm" | "dark" | "outline";
}) {
  const dim =
    size === "sm" ? "w-7 h-7 text-sm" : size === "lg" ? "w-12 h-12 text-2xl" : "w-9 h-9 text-base";
  const skin =
    variant === "dark"
      ? "bg-ink-card text-bg"
      : variant === "outline"
      ? "bg-bg border border-fg"
      : "bg-accent-soft text-fg";
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-display",
        dim,
        skin
      )}
      title={user.name}
    >
      {user.emoji}
    </span>
  );
}

export function Stars({ n, max = 5, size = 14 }: { n: number; max?: number; size?: number }) {
  return (
    <span className="font-display text-accent" style={{ fontSize: size, letterSpacing: 1 }}>
      {"★".repeat(Math.round(n))}
      <span className="text-fg-faint">{"★".repeat(Math.max(0, max - Math.round(n)))}</span>
    </span>
  );
}

export function Card({
  variant = "outline",
  className,
  children,
  ...rest
}: {
  variant?: "outline" | "warm" | "dark";
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  const skin =
    variant === "dark"
      ? "bg-ink-card text-bg"
      : variant === "warm"
      ? "bg-bg-warm text-fg"
      : "bg-bg border border-fg/15 text-fg";
  return (
    <div
      {...rest}
      className={cn("rounded-card p-4", skin, className)}
    >
      {children}
    </div>
  );
}

export function PhotoSlot({
  label = "image",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-card border border-fg/30 bg-bg-warm flex items-center justify-center text-xs text-fg-faint font-body",
        className
      )}
      style={{
        backgroundImage:
          "linear-gradient(135deg, transparent 49%, rgba(44,32,23,0.25) 49% 51%, transparent 51%), linear-gradient(45deg, transparent 49%, rgba(44,32,23,0.25) 49% 51%, transparent 51%)",
      }}
    >
      <span className="bg-bg/80 px-2 py-0.5 rounded">{label}</span>
    </div>
  );
}

export function TabBar({
  active,
}: {
  active: "home" | "plan" | "log" | "us" | "saju";
}) {
  const items: Array<{ id: typeof active; label: string; href: string }> = [
    { id: "home", label: "홈", href: "/" },
    { id: "plan", label: "계획", href: "/plan/new" },
    { id: "log", label: "기록", href: "/timeline" },
    { id: "us", label: "우리", href: "/us" },
    { id: "saju", label: "사주", href: "/us/saju" },
  ];
  return (
    <nav className="sticky bottom-0 left-0 right-0 bg-bg/95 backdrop-blur border-t border-fg/15 safe-bottom">
      <ul className="flex justify-around items-center px-2 pt-2">
        {items.map((it) => (
          <li key={it.id}>
            <Link
              href={it.href}
              prefetch={false}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 text-[11px]",
                active === it.id ? "text-fg" : "text-fg-faint"
              )}
            >
              <span className="w-5 h-5 rounded-md border border-current" />
              <span>{it.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Toast({ msg }: { msg: string }) {
  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-20 bg-bg-warm border border-fg/20 rounded-full px-4 py-2 text-sm shadow-sm animate-fade-in z-50">
      {msg}
    </div>
  );
}
