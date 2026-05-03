"use client";
import { useEffect, useRef } from "react";

export default function Rain() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";
    for (let i = 0; i < 45; i++) {
      const drop = document.createElement("div");
      drop.className = "raindrop";
      drop.style.left = Math.random() * 100 + "%";
      drop.style.height = Math.random() * 70 + 30 + "px";
      drop.style.animationDuration = Math.random() * 1.2 + 0.6 + "s";
      drop.style.animationDelay = Math.random() * 2.5 + "s";
      drop.style.opacity = String(Math.random() * 0.35 + 0.08);
      el.appendChild(drop);
    }
  }, []);
  return <div ref={ref} className="rain-bg" aria-hidden />;
}
