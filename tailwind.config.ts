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
      },
      animation: {
        "badge-in": "badgeIn 450ms cubic-bezier(0.22,1,0.36,1) both",
        "heart-pop": "heartPop 380ms cubic-bezier(0.22,1,0.36,1)",
        "circle-pop": "circlePop 380ms cubic-bezier(0.22,1,0.36,1)",
        "button-shine": "buttonShine 900ms cubic-bezier(0.22,1,0.36,1) both",
      },
    },
  },
  plugins: [],
};
export default config;
