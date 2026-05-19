import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    // R2 public URL — 새 토큰/도메인 으로 바뀌면 여기 + R2_PUBLIC_URL 같이 갱신.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-16ab5eb5220a45fd9c6adacbd37efb8f.r2.dev",
      },
    ],
    // 큰 원본 8MB 가 모바일 WebView 메모리 압박 → 작은 썸네일 사이즈만 활성.
    deviceSizes: [320, 480, 640, 768],
    imageSizes: [80, 120, 160, 200],
  },
};

export default nextConfig;
