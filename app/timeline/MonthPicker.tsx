"use client";

import { useRouter } from "next/navigation";

export default function MonthPicker({
  year,
  month,
}: {
  year: number;
  month: number;
}) {
  const router = useRouter();
  const thisYear = new Date().getFullYear();
  const minYear = 2024;
  const maxYear = thisYear + 1;
  const years: number[] = [];
  for (let y = minYear; y <= maxYear; y++) years.push(y);

  function go(y: number, m: number) {
    const ym = `${y}-${String(m + 1).padStart(2, "0")}`;
    router.push(`/timeline?ym=${ym}`);
  }

  return (
    <div className="flex items-baseline gap-1.5 font-display text-xl">
      <span className="relative inline-flex items-baseline">
        <select
          value={year}
          onChange={(e) => go(Number(e.target.value), month)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label="연도 선택"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <span className="px-1.5 -mx-1.5 py-0.5 rounded hover:bg-bg-warm transition-colors">
          {year}
        </span>
      </span>
      <span className="relative inline-flex items-baseline">
        <select
          value={month}
          onChange={(e) => go(year, Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label="월 선택"
        >
          {Array.from({ length: 12 }, (_, i) => i).map((m) => (
            <option key={m} value={m}>
              {m + 1}월
            </option>
          ))}
        </select>
        <em className="italic text-accent px-1.5 -mx-1.5 py-0.5 rounded hover:bg-bg-warm transition-colors">
          {month + 1}월
        </em>
      </span>
    </div>
  );
}
