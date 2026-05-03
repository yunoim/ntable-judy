// app/dates/[id]/review/page.tsx — 05 A 바텀시트 리뷰 입력
"use client";
import { useRouter } from "next/navigation";
import { useState, use } from "react";
import { MOCK_DATES, USERS, type Review } from "@/lib/data";
import { Avatar, PhotoSlot } from "@/components/ui";

const TAG_OPTIONS = ["기념일", "비온날", "야경", "한식", "여름", "산책"];

// In real impl: get current user from session. Mock: "me"
const ME: "judy" | "me" = "me";
const PARTNER: "judy" | "me" = ME === "me" ? "judy" : "me";

export default function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const date = MOCK_DATES.find((d) => d.id === id);
  const partnerReview = date?.reviews.find((r) => r.userId === PARTNER) ?? null;

  const [stars, setStars] = useState(0);
  const [oneLine, setOneLine] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [toast, setToast] = useState(false);

  function tapStar(n: number) {
    setStars(n);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(10);
    }
  }

  function toggleTag(t: string) {
    setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  }

  async function save() {
    if (!stars) return;
    await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dateId: id, stars, oneLine, tags }),
    });
    setToast(true);
    setTimeout(() => router.push(`/dates/${id}`), 1100);
  }

  if (!date) return <div className="p-6">데이트를 찾을 수 없어요.</div>;

  return (
    <div className="min-h-screen relative">
      {/* dimmed background showing the date */}
      <div className="opacity-40 pointer-events-none px-4 pt-4 pb-40">
        <p className="font-display text-xl">#{date.number} {date.title}</p>
        <p className="text-[11px] text-fg-faint">
          {date.area} ·{" "}
          {new Date(date.scheduledAt).toLocaleDateString("ko", {
            month: "long",
            day: "numeric",
          })}
        </p>
        <PhotoSlot label="사진" className="h-28 mt-3" />
        <PhotoSlot label="사진" className="h-20 mt-2" />
      </div>

      {/* backdrop */}
      <div className="fixed inset-0 bg-black/30 z-30" onClick={() => router.back()} />

      {/* bottom sheet */}
      <div className="fixed left-0 right-0 bottom-0 z-40 bg-bg border-t border-fg/15 rounded-t-sheet px-5 pt-3 pb-6 animate-slide-up safe-bottom max-w-[390px] mx-auto">
        <div className="w-10 h-1 bg-fg/40 rounded-full mx-auto mb-3" />
        <h1 className="font-display text-2xl">오늘은 어땠어?</h1>
        <p className="text-[11px] text-fg-faint mb-3">
          둘 다 입력하면 카드가 완성돼요
        </p>

        {/* partner card */}
        {partnerReview ? (
          <PartnerCard review={partnerReview} />
        ) : (
          <div className="bg-bg-warm/60 border border-dashed border-fg/30 rounded-card p-3 mb-2 text-[11px] text-fg-faint">
            {USERS[PARTNER].emoji} {USERS[PARTNER].name}는 아직 입력 전이에요
          </div>
        )}

        {/* my card — active */}
        <div className="border-2 border-accent rounded-card p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Avatar user={USERS[ME]} size="sm" variant={ME === "me" ? "warm" : "dark"} />
              <p className="font-display text-sm">
                {USERS[ME].name} (입력 중)
              </p>
            </div>
            <StarInput value={stars} onChange={tapStar} />
          </div>
          <input
            type="text"
            value={oneLine}
            onChange={(e) => setOneLine(e.target.value.slice(0, 60))}
            placeholder="한 줄로 남겨봐..."
            className="w-full bg-transparent border-b border-fg/20 px-1 py-1 text-sm italic placeholder:text-fg-faint focus:outline-none focus:border-accent"
          />
        </div>

        {/* tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {TAG_OPTIONS.map((t) => (
            <button
              key={t}
              onClick={() => toggleTag(t)}
              className={`text-[11px] rounded-full border px-2.5 py-0.5 ${
                tags.includes(t)
                  ? "bg-fg text-bg border-fg"
                  : "border-fg/40 text-fg"
              }`}
            >
              #{t}
            </button>
          ))}
          <button className="text-[11px] rounded-full border border-dashed border-fg/40 px-2.5 py-0.5 text-fg-faint">
            + 태그
          </button>
        </div>

        {/* actions */}
        <div className="flex gap-2">
          <button
            disabled
            className="flex-1 rounded-card border border-fg/20 py-2.5 text-xs text-fg-faint relative"
          >
            📷 사진
            <span className="absolute -top-2 -right-2 bg-accent text-bg text-[9px] rounded-full px-1.5 py-0.5">
              v2
            </span>
          </button>
          <button
            onClick={save}
            disabled={!stars}
            className="flex-1 bg-ink-card text-bg rounded-card py-2.5 text-xs font-semibold disabled:opacity-40"
          >
            저장 ✓
          </button>
        </div>
      </div>

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-1/2 bg-bg-warm border border-fg/20 rounded-full px-5 py-3 text-sm shadow-lg z-50 animate-fade-in">
          기록 저장됨 ♡
        </div>
      )}
    </div>
  );
}

function PartnerCard({ review }: { review: Review }) {
  const u = USERS[review.userId];
  return (
    <div className="bg-bg-warm rounded-card p-3 mb-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Avatar user={u} size="sm" variant={u.id === "me" ? "warm" : "dark"} />
          <p className="font-display text-sm">{u.name}</p>
        </div>
        <span className="font-display text-accent text-base tracking-wider">
          {"★".repeat(review.stars)}
          <span className="text-fg-faint">{"★".repeat(5 - review.stars)}</span>
        </span>
      </div>
      <p className="text-xs italic text-fg-soft">"{review.oneLine}"</p>
    </div>
  );
}

function StarInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          aria-label={`${n}점`}
          className="font-display text-xl leading-none transition-transform active:scale-125"
          style={{ color: n <= value ? "var(--accent)" : "var(--fg-faint)" }}
        >
          ★
        </button>
      ))}
    </div>
  );
}
