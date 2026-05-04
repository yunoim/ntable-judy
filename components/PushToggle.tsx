"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

export default function PushToggle() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window
    ) {
      setSupported(true);
      navigator.serviceWorker.ready.then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        setSubscribed(!!sub);
      });
    } else {
      setSupported(false);
    }
  }, []);

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setError("알림 권한이 거부되었어요");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!pub) {
        setError("VAPID public key 미설정");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(pub).buffer as ArrayBuffer,
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (!res.ok) {
        setError("구독 저장 실패");
        return;
      }
      setSubscribed(true);
      setSavedAt(Date.now());
    } catch (e: any) {
      setError(e?.message ?? "오류");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (e: any) {
      setError(e?.message ?? "오류");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      if (!res.ok) {
        setError("테스트 발송 실패");
        return;
      }
      setSavedAt(Date.now());
    } catch (e: any) {
      setError(e?.message ?? "오류");
    } finally {
      setBusy(false);
    }
  }

  if (!supported) {
    return (
      <p className="text-[11px] text-fg-faint italic">
        이 브라우저는 푸시 알림을 지원하지 않아요. iOS는 홈 화면에 추가 후
        Safari로 열어야 작동합니다.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm">
          {subscribed === null ? "확인 중..." : subscribed ? "켜짐" : "꺼짐"}
        </span>
        {subscribed ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={test}
              disabled={busy}
              className="text-xs border border-fg/20 rounded-card px-3 py-1.5"
            >
              테스트
            </button>
            <button
              type="button"
              onClick={disable}
              disabled={busy}
              className="text-xs border border-rain/40 text-rain rounded-card px-3 py-1.5"
            >
              끄기
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={enable}
            disabled={busy}
            className="text-xs bg-ink-card text-bg rounded-card px-3 py-1.5"
          >
            {busy ? "..." : "켜기"}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-rain">{error}</p>}
      {savedAt && !error && (
        <p className="text-[10px] text-accent serif-italic">완료 ✓</p>
      )}
    </div>
  );
}
