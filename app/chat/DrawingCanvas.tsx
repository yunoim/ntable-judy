"use client";

import { useRef, useState, useCallback, useEffect } from "react";

// 12색 — 잉크/갈색/주황/빨강/노랑·진노/초록/하늘/파랑/보라/핑크/회색/흰색.
const COLORS = [
  "#2a1f17",
  "#7a5f48",
  "#c2410c",
  "#dc2626",
  "#f59e0b",
  "#16a34a",
  "#0ea5e9",
  "#1e5b94",
  "#7c3aed",
  "#ec4899",
  "#9ca3af",
  "#ffffff",
];
const SIZES = [2, 5, 9, 14, 20];
const BG = "#FAF7F2";
const HISTORY_LIMIT = 30;

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
  // PNG dataURL 스냅샷 스택. cursor 가 현재 위치 — undo 는 cursor-1, redo 는 cursor+1.
  const historyRef = useRef<string[]>([]);
  const cursorRef = useRef(-1);
  const [historyVer, setHistoryVer] = useState(0); // undo/redo 버튼 disabled 갱신용

  function fillBg() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
  }

  function saveSnapshot() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    // 현재 cursor 이후 forward history 폐기.
    historyRef.current = historyRef.current.slice(0, cursorRef.current + 1);
    historyRef.current.push(url);
    if (historyRef.current.length > HISTORY_LIMIT) {
      historyRef.current.shift();
    } else {
      cursorRef.current += 1;
    }
    setHistoryVer((v) => v + 1);
  }

  function restoreSnapshot(idx: number) {
    const url = historyRef.current[idx];
    if (!url) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      ctx.drawImage(img, 0, 0, canvas.offsetWidth, canvas.offsetHeight);
    };
    img.src = url;
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(2, 2);
    fillBg();
    // 초기 빈 상태도 history 에 넣어둠 — undo 가 최초 상태로 갈 수 있게.
    saveSnapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    ctx.strokeStyle = isEraser ? BG : color;
    ctx.lineWidth = isEraser ? size * 3 : size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastRef.current = pos;
  }

  function endDraw() {
    if (drawingRef.current) {
      drawingRef.current = false;
      lastRef.current = null;
      saveSnapshot();
    }
  }

  const handleClear = useCallback(() => {
    fillBg();
    saveSnapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleUndo() {
    if (cursorRef.current <= 0) return;
    cursorRef.current -= 1;
    restoreSnapshot(cursorRef.current);
    setHistoryVer((v) => v + 1);
  }
  function handleRedo() {
    if (cursorRef.current >= historyRef.current.length - 1) return;
    cursorRef.current += 1;
    restoreSnapshot(cursorRef.current);
    setHistoryVer((v) => v + 1);
  }

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

  const canUndo = cursorRef.current > 0;
  const canRedo = cursorRef.current < historyRef.current.length - 1;
  // historyVer 가 deps — 렌더 트리거 후 위 두 변수 새 값 계산.
  void historyVer;

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
      <div className="border-t border-fg/10 px-3 py-2.5 space-y-2 safe-bottom">
        {/* 액션 행 — undo/redo, 지우개, 굵기, 전체 지우기 */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo}
            className="tap shrink-0 w-8 h-8 rounded-full border border-fg/20 flex items-center justify-center text-sm disabled:opacity-30"
            aria-label="실행취소"
          >
            ↶
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={!canRedo}
            className="tap shrink-0 w-8 h-8 rounded-full border border-fg/20 flex items-center justify-center text-sm disabled:opacity-30"
            aria-label="다시실행"
          >
            ↷
          </button>
          <button
            type="button"
            onClick={() => setIsEraser((v) => !v)}
            className={[
              "tap shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm",
              isEraser
                ? "border-accent bg-accent/10"
                : "border-fg/20 bg-bg-warm/30",
            ].join(" ")}
            aria-label="지우개"
          >
            ⌫
          </button>
          <div className="flex items-center gap-1 ml-1 overflow-x-auto">
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                className={[
                  "tap flex items-center justify-center w-8 h-8 rounded-full border shrink-0",
                  size === s
                    ? "border-accent bg-accent/10"
                    : "border-fg/15 bg-bg-warm/30",
                ].join(" ")}
                aria-label={`굵기 ${s}`}
              >
                <span
                  className="rounded-full bg-fg block"
                  style={{
                    width: Math.min(s, 16),
                    height: Math.min(s, 16),
                  }}
                />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="tap shrink-0 ml-auto text-[11px] text-fg-faint border border-fg/20 rounded-full px-3 py-1.5"
          >
            전체 지우기
          </button>
        </div>
        {/* 색상 팔레트 — 12색, 가로 스크롤 가능. */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setColor(c);
                setIsEraser(false);
              }}
              className="tap w-8 h-8 rounded-full border-2 shrink-0"
              style={{
                backgroundColor: c,
                borderColor:
                  !isEraser && color === c ? "var(--accent)" : "var(--fg-faint)",
              }}
              aria-label={`색상 ${c}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
