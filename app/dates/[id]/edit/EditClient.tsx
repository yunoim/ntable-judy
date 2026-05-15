"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import type { AdaptedDate } from "@/lib/db";

type StopForm = {
  time: string;
  emoji: string;
  name: string;
  address: string;
  type: string;
  description: string;
  mapQuery: string;
  naverMapUrl: string;
  cost: number;
  reservationUrl: string;
  reserved: boolean;
};

function blankStop(): StopForm {
  return {
    time: "",
    emoji: "",
    name: "",
    address: "",
    type: "",
    description: "",
    mapQuery: "",
    naverMapUrl: "",
    cost: 0,
    reservationUrl: "",
    reserved: false,
  };
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditClient({
  date,
  canDelete,
}: {
  date: AdaptedDate;
  canDelete: boolean;
}) {
  const router = useRouter();

  const [title, setTitle] = useState(date.title);
  const [subtitle, setSubtitle] = useState(date.subtitle ?? "");
  const [area, setArea] = useState(date.area);
  const [scheduledAt, setScheduledAt] = useState(toLocalInput(date.scheduledAt));
  const [scheduledEndAt, setScheduledEndAt] = useState(
    date.scheduledEndAt ? toLocalInput(date.scheduledEndAt) : "",
  );
  const [themeNote, setThemeNote] = useState(date.themeNote ?? "");
  const [weather, setWeather] = useState(date.weather ?? "");
  const [historyLabel, setHistoryLabel] = useState(date.historyLabel ?? "");
  const [status, setStatus] = useState<"planned" | "done" | "cancelled">(
    (date.status as any) ?? "planned",
  );
  const [stops, setStops] = useState<StopForm[]>(
    date.plan.stops.map((s) => ({
      time: s.time,
      emoji: s.emoji ?? "",
      name: s.name,
      address: s.address,
      type: s.type,
      description: s.description ?? "",
      mapQuery: s.mapQuery,
      naverMapUrl: s.naverMapUrl ?? "",
      cost: s.cost,
      reservationUrl: s.reservationUrl ?? "",
      reserved: s.reserved,
    })),
  );

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateStop(idx: number, patch: Partial<StopForm>) {
    setStops((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    );
  }

  function moveStop(idx: number, dir: -1 | 1) {
    const next = idx + dir;
    if (next < 0 || next >= stops.length) return;
    setStops((prev) => {
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/dates/${date.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          subtitle: subtitle || null,
          area,
          scheduledAt: new Date(scheduledAt).toISOString(),
          scheduledEndAt: scheduledEndAt
            ? new Date(scheduledEndAt).toISOString()
            : null,
          startTime: stops[0]?.time || null,
          endTime: stops[stops.length - 1]?.time || null,
          themeNote: themeNote || null,
          weather: weather || null,
          historyLabel: historyLabel || null,
          status,
          estimatedTotal: stops.reduce((s, st) => s + (st.cost || 0), 0),
          stops: stops.map((s) => ({
            time: s.time,
            emoji: s.emoji || null,
            name: s.name,
            address: s.address || null,
            type: s.type || null,
            description: s.description || null,
            mapQuery: s.mapQuery || s.name,
            naverMapUrl: s.naverMapUrl || null,
            cost: Number(s.cost) || 0,
            reservationUrl: s.reservationUrl || null,
            reserved: s.reserved,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `저장 실패 (${res.status})`);
        return;
      }
      router.push(`/dates/${date.id}`);
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "네트워크 오류");
    } finally {
      setSaving(false);
    }
  }

  async function destroy() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/dates/${date.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `삭제 실패 (${res.status})`);
        setDeleting(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "네트워크 오류");
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-bg/95 backdrop-blur border-b border-fg/15 px-4 pt-4 pb-3 safe-top flex items-center justify-between">
        <Link href={`/dates/${date.id}`} className="text-sm text-fg-faint">
          ← 취소
        </Link>
        <p className="font-display text-base">
          #{date.number} <em className="italic text-accent">편집</em>
        </p>
        <span className="w-12" />
      </header>

      <main className="flex-1 px-4 py-4 pb-32 space-y-5">
        <FieldGroup label="제목">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputCls}
          />
        </FieldGroup>

        <FieldGroup label="부제 / 무드">
          <input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            className={inputCls}
          />
        </FieldGroup>

        <div className="grid grid-cols-2 gap-3">
          <FieldGroup label="지역">
            <input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className={inputCls}
            />
          </FieldGroup>
          <FieldGroup label="히스토리 라벨">
            <input
              value={historyLabel}
              onChange={(e) => setHistoryLabel(e.target.value)}
              className={inputCls}
              placeholder={area}
            />
          </FieldGroup>
        </div>

        <FieldGroup label="시작일시">
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => {
              setScheduledAt(e.target.value);
              if (scheduledEndAt && scheduledEndAt < e.target.value) {
                setScheduledEndAt("");
              }
            }}
            className={inputCls}
          />
        </FieldGroup>

        <FieldGroup label="종료일시 (다일이면 입력 · 비우면 당일)">
          <input
            type="datetime-local"
            value={scheduledEndAt}
            min={scheduledAt}
            onChange={(e) => setScheduledEndAt(e.target.value)}
            className={inputCls}
          />
          {scheduledEndAt && (
            <button
              type="button"
              onClick={() => setScheduledEndAt("")}
              className="text-[10px] text-fg-faint hover:text-fg-soft mt-1"
            >
              ✕ 당일로 되돌리기
            </button>
          )}
        </FieldGroup>

        <div className="grid grid-cols-2 gap-3">
          <FieldGroup label="상태">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className={inputCls}
            >
              <option value="planned">예정</option>
              <option value="done">완료</option>
              <option value="cancelled">취소</option>
            </select>
          </FieldGroup>
          <FieldGroup label="날씨">
            <select
              value={weather}
              onChange={(e) => setWeather(e.target.value)}
              className={inputCls}
            >
              <option value="">자동</option>
              <option value="sun">☀ 맑음</option>
              <option value="cloud">☁ 흐림</option>
              <option value="rain">🌧 비</option>
              <option value="snow">❄ 눈</option>
            </select>
          </FieldGroup>
        </div>

        <FieldGroup label="테마 메모">
          <textarea
            value={themeNote}
            onChange={(e) => setThemeNote(e.target.value)}
            rows={3}
            className={`${inputCls} resize-none`}
          />
        </FieldGroup>

        <section className="space-y-3 pt-2">
          <p className="text-[11px] tracking-widest uppercase text-fg-faint">
            단계 ({stops.length})
          </p>
          <ul className="space-y-3">
            {stops.map((s, idx) => (
              <li
                key={idx}
                className="rounded-card border border-fg/15 bg-bg-warm/40 p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-sm text-accent">
                    #{idx + 1}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveStop(idx, -1)}
                      disabled={idx === 0}
                      className="text-xs px-2 py-1 rounded border border-fg/20 disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveStop(idx, 1)}
                      disabled={idx === stops.length - 1}
                      className="text-xs px-2 py-1 rounded border border-fg/20 disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setStops((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="text-xs px-2 py-1 rounded border border-rain/40 text-rain"
                    >
                      삭제
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-[80px_60px_1fr] gap-2">
                  <input
                    placeholder="14:00"
                    value={s.time}
                    onChange={(e) => updateStop(idx, { time: e.target.value })}
                    className={inputCls}
                  />
                  <input
                    placeholder="🍵"
                    value={s.emoji}
                    onChange={(e) => updateStop(idx, { emoji: e.target.value })}
                    className={inputCls}
                  />
                  <input
                    placeholder="장소명"
                    value={s.name}
                    onChange={(e) => updateStop(idx, { name: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <input
                  placeholder="주소"
                  value={s.address}
                  onChange={(e) => updateStop(idx, { address: e.target.value })}
                  className={inputCls}
                />
                <div className="grid grid-cols-[1fr_120px] gap-2">
                  <input
                    placeholder="타입 (카페/식당/...)"
                    value={s.type}
                    onChange={(e) => updateStop(idx, { type: e.target.value })}
                    className={inputCls}
                  />
                  <input
                    type="number"
                    placeholder="비용"
                    value={s.cost}
                    onChange={(e) =>
                      updateStop(idx, { cost: Number(e.target.value) })
                    }
                    className={inputCls}
                  />
                </div>
                <textarea
                  placeholder="설명 (한 줄)"
                  value={s.description}
                  onChange={(e) =>
                    updateStop(idx, { description: e.target.value })
                  }
                  rows={2}
                  className={`${inputCls} resize-none`}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder="네이버 지도 URL"
                    value={s.naverMapUrl}
                    onChange={(e) =>
                      updateStop(idx, { naverMapUrl: e.target.value })
                    }
                    className={inputCls}
                  />
                  <input
                    placeholder="예약 URL"
                    value={s.reservationUrl}
                    onChange={(e) =>
                      updateStop(idx, { reservationUrl: e.target.value })
                    }
                    className={inputCls}
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-fg-soft">
                  <input
                    type="checkbox"
                    checked={s.reserved}
                    onChange={(e) =>
                      updateStop(idx, { reserved: e.target.checked })
                    }
                  />
                  예약 완료
                </label>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setStops((prev) => [...prev, blankStop()])}
            className="w-full border border-dashed border-fg/30 rounded-card py-3 text-sm text-fg-soft"
          >
            + 단계 추가
          </button>
        </section>

        {canDelete && (
          <section className="pt-4 border-t border-fg/10">
            <button
              type="button"
              onClick={destroy}
              disabled={deleting}
              className={[
                "w-full rounded-card py-3 text-sm transition-colors",
                confirmDelete
                  ? "bg-rain text-bg"
                  : "border border-rain/50 text-rain",
              ].join(" ")}
            >
              {deleting
                ? "삭제 중..."
                : confirmDelete
                  ? "정말 삭제 — 한 번 더"
                  : "이 데이트 삭제"}
            </button>
            {confirmDelete && (
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="w-full text-xs text-fg-faint mt-1.5"
              >
                취소
              </button>
            )}
          </section>
        )}
      </main>

      {error && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 bg-rain/10 border border-rain/40 text-rain text-xs px-4 py-2 rounded-full">
          {error}
        </div>
      )}

      <div className="sticky bottom-0 bg-bg/95 backdrop-blur border-t border-fg/15 px-4 py-3 safe-bottom">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="w-full bg-ink-card text-bg rounded-card py-3 font-semibold disabled:opacity-40"
        >
          {saving ? "저장 중..." : "저장 ✓"}
        </button>
      </div>
    </div>
  );
}

const inputCls =
  "w-full bg-bg border border-fg/20 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-accent";

function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] tracking-widest uppercase text-fg-faint">
        {label}
      </label>
      {children}
    </div>
  );
}
