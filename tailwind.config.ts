import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#f5f5f5",
        foreground: "#1a1a1a",
        primary: {
          DEFAULT: "#57e0d9",
          light: "#82d5d4",
          dark: "#3bc4bc",
        },
        accent: {
          orange: "#ff9200",
          yellow: "#ffdb00",
          coral: "#ff7465",
        },
        ui: {
          gray: "#868686",
          border: "#e4e4e4",
          surface: "#ffffff",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "sans-serif"],
        display: ["var(--font-dm-sans)", "sans-serif"],
      },
      borderRadius: {
        pill: "9999px",
        card: "1.5rem",
      },
      keyframes: {
        badgeIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        heartPop: {
          "0%": { transform: "scale(0.8)" },
          "50%": { transform: "scale(1.2)" },
          "100%": { transform: "scale(1)" },
        },
        circlePop: {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.12)" },
          "100%": { transform: "scale(1)" },
        },
        buttonShine: {
          "0%": { transform: "translateX(-130%) skewX(-20deg)", opacity: "0" },
          "30%": { opacity: "0.55" },
          "55%": { opacity: "0.35" },
          "100%": { transform: "translateX(230%) skewX(-20deg)", opacity: "0" },
        },
        totalPulse: {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.06)" },
          "100%": { transform: "scale(1)" },
        },
        multicolorShine: {
          "0%, 88%, 100%": { transform: "translateX(-60px) skewX(-20deg)", opacity: "0" },
          "94%": { transform: "translateX(60px) skewX(-20deg)", opacity: "0.5" },
        },
        multicolorBreathe: {
          "0%, 100%": { opacity: "0.75" },
          "50%": { opacity: "1" },
        },
        multicolorDrift: {
          "0%, 100%": { backgroundPositionX: "0%" },
          "50%": { backgroundPositionX: "8%" },
        },
        dotsActivate: {
          "0%": { transform: "rotate(0deg) scale(1)" },
          "45%": { transform: "rotate(20deg) scale(1.1)" },
          "100%": { transform: "rotate(0deg) scale(1)" },
        },
        sparkleOut: {
          "0%": { transform: "scale(0.4)", opacity: "0.9" },
          "100%": { transform: "scale(1.8)", opacity: "0" },
        },
        swatchWow: {
          "0%": { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(87,224,217,0)" },
          "40%": { transform: "scale(1.05)", boxShadow: "0 0 0 6px rgba(87,224,217,0.25)" },
          "100%": { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(87,224,217,0)" },
        },
      },
      animation: {
        "badge-in": "badgeIn 450ms cubic-bezier(0.22,1,0.36,1) both",
        "heart-pop": "heartPop 380ms cubic-bezier(0.22,1,0.36,1)",
        "circle-pop": "circlePop 380ms cubic-bezier(0.22,1,0.36,1)",
        "button-shine": "buttonShine 900ms cubic-bezier(0.22,1,0.36,1) both",
        "total-pulse": "totalPulse 200ms cubic-bezier(0.33,1,0.68,1)",
        "multicolor-shine": "multicolorShine 7000ms ease-in-out infinite",
        "multicolor-breathe": "multicolorBreathe 7000ms ease-in-out infinite",
        "multicolor-drift": "multicolorDrift 8000ms ease-in-out infinite",
        "dots-activate": "dotsActivate 480ms cubic-bezier(0.34,1.56,0.64,1) both",
        "sparkle-out": "sparkleOut 450ms ease-out both",
        "swatch-wow": "swatchWow 480ms ease-out both",
      },
    },
  },
  plugins: [],
};
export default config;
