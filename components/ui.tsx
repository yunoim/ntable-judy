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

function TabIcon({ id, active }: { id: TabId; active: boolean }) {
  const stroke = active ? "var(--accent)" : "currentColor";
  const sw = 1.6;
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke,
    strokeWidth: sw,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (id) {
    case "home":
      return (
        <svg {...common}>
          <path d="M4 11.5 12 5l8 6.5" />
          <path d="M6 10v9h12v-9" />
        </svg>
      );
    case "plan":
      return (
        <svg {...common}>
          <path d="M5 4h11l3 3v13H5z" />
          <path d="M8.5 12h7M8.5 16h5" />
        </svg>
      );
    case "log":
      return (
        <svg {...common}>
          <rect x="4.5" y="5.5" width="15" height="14" rx="2" />
          <path d="M8 3v4M16 3v4M4.5 10h15" />
        </svg>
      );
    case "us":
      return (
        <svg {...common}>
          <circle cx="9" cy="10" r="3" />
          <circle cx="15.5" cy="10" r="3" />
          <path d="M4 19c.6-2.8 2.6-4.2 5-4.2s4.4 1.4 5 4.2" />
          <path d="M11.5 19c.6-2.8 2.6-4.2 5-4.2 1 0 1.9.25 2.6.7" />
        </svg>
      );
    case "saju":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="7.5" />
          <path d="M12 4.5v15M4.5 12h15" />
          <path d="M7 7.5l10 9M17 7.5l-10 9" opacity="0.4" />
        </svg>
      );
  }
}

type TabId = "home" | "plan" | "log" | "us" | "saju";

export function TabBar({ active }: { active: TabId }) {
  const items: Array<{ id: TabId; label: string; href: string }> = [
    { id: "home", label: "홈", href: "/" },
    { id: "plan", label: "계획", href: "/plan/new" },
    { id: "log", label: "기록", href: "/timeline" },
    { id: "us", label: "우리", href: "/us" },
    { id: "saju", label: "사주", href: "/us/saju" },
  ];
  return (
    <nav className="sticky bottom-0 left-0 right-0 bg-bg/95 backdrop-blur border-t border-fg/10 safe-bottom z-40">
      <ul className="flex justify-around items-center px-2 pt-2 pb-1">
        {items.map((it) => {
          const isActive = active === it.id;
          return (
            <li key={it.id} className="flex-1">
              <Link
                href={it.href}
                prefetch={false}
                className={cn(
                  "tap flex flex-col items-center gap-1 px-2 py-1.5",
                  isActive ? "text-fg" : "text-fg-faint",
                )}
              >
                <TabIcon id={it.id} active={isActive} />
                <span
                  className={cn(
                    "text-[10.5px] tracking-wider",
                    isActive ? "text-fg font-medium" : "text-fg-faint",
                  )}
                >
                  {it.label}
                </span>
                <span
                  className={cn(
                    "block w-1 h-1 rounded-full transition-colors",
                    isActive ? "bg-accent" : "bg-transparent",
                  )}
                />
              </Link>
            </li>
          );
        })}
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

// ── Editorial primitives ──────────────────────────────────────────

export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={cn("eyebrow", className)}>{children}</span>;
}

export function SectionTitle({
  index,
  title,
  hint,
  className,
}: {
  index?: string | number;
  title: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between pt-1", className)}>
      <div className="flex items-baseline gap-2">
        {index !== undefined && (
          <span className="serif-italic text-fg-faint/70 text-[11px] tabular-nums">
            {typeof index === "number" ? String(index).padStart(2, "0") : index}
          </span>
        )}
        <span className="font-display text-[17px] text-fg">{title}</span>
      </div>
      {hint && <span className="text-[10px] text-fg-faint">{hint}</span>}
    </div>
  );
}

export function Rule({
  variant = "soft",
  className,
}: {
  variant?: "soft" | "strong" | "dot";
  className?: string;
}) {
  const cls =
    variant === "strong"
      ? "divide-rule-strong"
      : variant === "dot"
        ? "dot-rule"
        : "divide-rule";
  return <div className={cn(cls, "w-full", className)} />;
}

export function Glyph({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "serif-italic text-fg-faint inline-block",
        className,
      )}
    >
      {text}
    </span>
  );
}

export function Numeral({
  value,
  size = "lg",
  className,
}: {
  value: React.ReactNode;
  size?: "md" | "lg" | "xl";
  className?: string;
}) {
  const cls =
    size === "xl" ? "numeral-xl" : size === "md" ? "numeral-md" : "numeral-lg";
  return <span className={cn(cls, className)}>{value}</span>;
}

export function Hero({
  eyebrow,
  number,
  caption,
  unit,
  variant = "dark",
  href,
  rightSlot,
}: {
  eyebrow?: string;
  number: React.ReactNode;
  caption?: React.ReactNode;
  unit?: string;
  variant?: "dark" | "warm" | "outline";
  href?: string;
  rightSlot?: React.ReactNode;
}) {
  const skin =
    variant === "dark"
      ? "editorial-card-dark"
      : variant === "warm"
        ? "editorial-card-warm"
        : "editorial-card";
  const eyebrowColor =
    variant === "dark" ? "text-accent-soft" : "text-fg-faint";
  const numberColor = variant === "dark" ? "text-bg" : "text-fg";
  const captionColor =
    variant === "dark" ? "text-accent-soft" : "text-fg-soft";
  const inner = (
    <div className={cn(skin, "px-5 pt-5 pb-6 relative overflow-hidden")}>
      {eyebrow && (
        <div className={cn("eyebrow", eyebrowColor, "mb-3")}>{eyebrow}</div>
      )}
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-baseline gap-2 min-w-0">
          <Numeral value={number} size="xl" className={numberColor} />
          {unit && (
            <span
              className={cn(
                "serif-italic text-2xl",
                variant === "dark" ? "text-accent-soft" : "text-fg-faint",
              )}
            >
              {unit}
            </span>
          )}
        </div>
        {rightSlot}
      </div>
      {caption && (
        <p className={cn("text-sm mt-3 leading-relaxed", captionColor)}>
          {caption}
        </p>
      )}
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}

export function MetaRow({
  items,
  className,
}: {
  items: Array<{ label?: string; value: React.ReactNode }>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 text-[11px] text-fg-soft",
        className,
      )}
    >
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {it.label && (
            <span className="eyebrow !text-[9px]">{it.label}</span>
          )}
          <span>{it.value}</span>
          {i < items.length - 1 && (
            <span className="text-fg-faint/50 ml-1">·</span>
          )}
        </span>
      ))}
    </div>
  );
}
