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
    // 그리드 썸네일 (작은 셀) 부터 라이트박스 (모바일 1080px 정도) 까지 커버.
    deviceSizes: [320, 480, 640, 768, 1080, 1280],
    imageSizes: [80, 120, 160, 200, 300, 480],
  },
};

export default nextConfig;
