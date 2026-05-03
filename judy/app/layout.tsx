// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { DM_Serif_Display, Noto_Serif_KR } from "next/font/google";
import "./globals.css";

const dmSerif = DM_Serif_Display({
  weight: ["400"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const notoSerif = Noto_Serif_KR({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "judy.ntable.kr",
  description: "둘이서 쓰는 데이트 다이어리",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FAF7F2",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${dmSerif.variable} ${notoSerif.variable}`}>
      <body className="bg-bg text-fg font-body antialiased min-h-screen">
        <div className="mx-auto max-w-[390px] min-h-screen relative">
          {children}
        </div>
      </body>
    </html>
  );
}
