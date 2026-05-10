import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#050506",
        surface: "rgba(255,255,255,0.04)",
        "surface-hover": "rgba(255,255,255,0.07)",
        "text-primary": "#FAFAFA",
        "text-secondary": "#B8B6B0",
        "text-tertiary": "#76746E",
        success: "#6BE3A4",
        warning: "#F2C063",
        danger: "#FF6B6B",
        accent: "#E07458",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Inter", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SF Mono", "Menlo", "Consolas", "monospace"],
      },
      backdropBlur: {
        card: "24px",
      },
      boxShadow: {
        card: "0 12px 40px rgba(0,0,0,0.45)",
        glow: "0 0 12px rgba(107,227,164,0.4)",
        "glow-warn": "0 0 12px rgba(242,192,99,0.4)",
        "glow-danger": "0 0 12px rgba(255,107,107,0.4)",
      },
    },
  },
  plugins: [],
} satisfies Config;
