"use client";

import { useEffect } from "react";

// PWA installable 조건: 매니페스트 + 등록된 SW. PushToggle 은 푸시 권한 흐름
// 한정이라 마운트 시점이 늦음. 앱 진입 시점에 항상 등록되도록 layout 에서 호출.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (location.protocol !== "https:" && location.hostname !== "localhost")
      return;
    navigator.serviceWorker.register("/sw.js").catch((e) => {
      console.warn("[sw] register failed", e);
    });
  }, []);
  return null;
}
