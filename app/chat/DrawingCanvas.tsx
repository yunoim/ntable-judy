"use client";

import { useRef, useState, useCallback, useEffect } from "react";

const COLORS = ["#2a1f17", "#c2410c", "#1e5b94", "#4d5d3e", "#d9c4a3", "#ffffff"];
const SIZES = [3, 6, 12];

export default function DrawingCanvas({
  onSend,
  onClose,
  sending,
}: {
  onSend: (blob: Blob) => void;
  onClose: () => void;
  sending: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);
  const [isEraser, setIsEraser] = useState(false);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(2, 2);
    ctx.fillStyle = "#FAF7F2";
    ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
  }, []);

  function getPos(
    e: React.TouchEvent | React.MouseEvent,
  ): { x: number; y: number } | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const t = e.touches[0];
      if (!t) return null;
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    };
  }

  function startDraw(e: React.TouchEvent | React.MouseEvent) {
    drawingRef.current = true;
    lastRef.current = getPos(e);
  }

  function moveDraw(e: React.TouchEvent | React.MouseEvent) {
    if (!drawingRef.current) return;
    const pos = getPos(e);
    const last = lastRef.current;
    if (!pos || !last) {
      lastRef.current = pos;
      return;
    }
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = isEraser ? "#FAF7F2" : color;
    ctx.lineWidth = isEraser ? size * 3 : size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastRef.current = pos;
  }

  function endDraw() {
    drawingRef.current = false;
    lastRef.current = null;
  }

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#FAF7F2";
    ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
  }, []);

  function handleSend() {
    const canvas = canvasRef.current;
    if (!canvas || sending) return;
    canvas.toBlob(
      (blob) => {
        if (blob) onSend(blob);
      },
      "image/png",
      0.9,
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-bg flex flex-col safe-top">
      {/* 상단 바 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-fg/10">
        <button
          type="button"
          onClick={onClose}
          className="tap text-sm text-fg-faint"
        >
          ✕ 닫기
        </button>
        <p className="font-display text-sm">낙서</p>
        <button
          type="button"
          onClick={handleSend}
          disabled={sending}
          className="tap bg-ink-card text-bg rounded-full px-4 py-1.5 text-sm font-semibold disabled:opacity-40"
        >
          {sending ? "전송 중…" : "보내기"}
        </button>
      </div>

      {/* 캔버스 */}
      <div className="flex-1 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full block touch-none"
          onMouseDown={startDraw}
          onMouseMove={moveDraw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={moveDraw}
          onTouchEnd={endDraw}
          onTouchCancel={endDraw}
        />
      </div>

      {/* 도구 바 */}
      <div className="border-t border-fg/10 px-4 py-3 space-y-2 safe-bottom">
        {/* 색상 */}
        <div className="flex items-center gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setColor(c);
                setIsEraser(false);
              }}
              className="tap w-7 h-7 rounded-full border-2 shrink-0"
              style={{
                backgroundColor: c,
                borderColor:
                  !isEraser && color === c
                    ? "var(--accent)"
                    : "var(--fg-faint)",
              }}
            />
          ))}
          <button
            type="button"
            onClick={() => setIsEraser(!isEraser)}
            className={[
              "tap shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs",
              isEraser
                ? "border-accent bg-accent/10"
                : "border-fg-faint bg-bg-warm/40",
            ].join(" ")}
            aria-label="지우개"
          >
            ⌫
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="tap shrink-0 ml-auto text-[11px] text-fg-faint border border-fg/20 rounded-full px-3 py-1"
          >
            전체 지우기
          </button>
        </div>
        {/* 굵기 */}
        <div className="flex items-center gap-2">
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              className={[
                "tap flex items-center justify-center w-9 h-7 rounded-full border",
                size === s && !isEraser
                  ? "border-accent bg-accent/10"
                  : "border-fg/15 bg-bg-warm/30",
              ].join(" ")}
            >
              <span
                className="rounded-full bg-fg block"
                style={{ width: s * 1.5, height: s * 1.5 }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
