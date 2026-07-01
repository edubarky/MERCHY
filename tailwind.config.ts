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
    },
  },
  plugins: [],
};
export default config;
