// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "bg-warm": "var(--bg-warm)",
        fg: "var(--fg)",
        "fg-soft": "var(--fg-soft)",
        "fg-faint": "var(--fg-faint)",
        accent: "var(--accent)",
        "accent-soft": "var(--accent-soft)",
        "ink-card": "var(--ink-card)",
        kakao: "var(--kakao)",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "serif"],
      },
      borderRadius: {
        card: "16px",
        sheet: "20px",
      },
    },
  },
  plugins: [],
};
export default config;
