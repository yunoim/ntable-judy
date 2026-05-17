"use client";

import Link from "next/link";
import { useState } from "react";
import { Stars } from "@/components/ui";

export type PastItem = {
  id: string;
  number: number;
  title: string;
  scheduledAt: string;
  area: string | null;
  weather: string | null;
  avgStars: number;
};

const PAGE = 5;

export default function PastDatesList({ items }: { items: PastItem[] }) {
  const [visible, setVisible] = useState(PAGE);
  const shown = items.slice(0, visible);
  const remaining = items.length - shown.length;

  return (
    <>
      <ul className="space-y-3.5">
        {shown.map((d, idx) => {
          const fallback = d.weather === "rain" ? "☔" : null;
          return (
            <li key={d.id}>
              <Link
                href={`/dates/${d.id}`}
                className="tap flex gap-4 group"
              >
                <div className="w-[68px] h-[68px] shrink-0 rounded-[14px] bg-bg-warm border border-fg/8 flex items-center justify-center overflow-hidden">
                  {fallback ? (
                    <span className="text-2xl">{fallback}</span>
                  ) : (
                    <span className="font-display text-[22px] text-fg-soft tabular-nums">
                      {String(d.number).padStart(2, "0")}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col">
                  <p className="font-display text-base truncate group-hover:text-accent transition-colors">
                    {d.title}
                  </p>
                  <p className="text-[11px] text-fg-faint mt-0.5">
                    {new Date(d.scheduledAt).toLocaleDateString("ko", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                    {d.area ? ` · ${d.area}` : ""}
                  </p>
                  <div className="mt-auto pt-1.5">
                    {d.avgStars > 0 ? (
                      <Stars n={d.avgStars} />
                    ) : (
                      <span className="text-[10px] text-fg-faint">
                        후기 비어 있음
                      </span>
                    )}
                  </div>
                </div>
              </Link>
              {idx < shown.length - 1 && (
                <div className="dot-rule mt-3.5" />
              )}
            </li>
          );
        })}
      </ul>
      {remaining > 0 && (
        <button
          onClick={() => setVisible((v) => v + PAGE)}
          className="tap block w-full text-center text-[12px] text-fg-soft hover:text-fg border border-fg/15 rounded-card py-2.5 mt-3"
        >
          + 더보기 ({remaining}개 더)
        </button>
      )}
    </>
  );
}
