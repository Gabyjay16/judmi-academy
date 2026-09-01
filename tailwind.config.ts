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
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
        accent: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
        },
        navy: {
          50: "#f2f6fa",
          100: "#e1eaf2",
          200: "#c5d6e6",
          300: "#9ab5d5",
          400: "#6b92c4",
          500: "#4570ab",
          600: "#3a5d90",
          700: "#2f4b74",
          800: "#243b5e",
          900: "#1a2c47",
          950: "#101a2e",
        },
        gold: {
          50: "#faf7ec",
          100: "#f2e9cd",
          200: "#e6d39b",
          300: "#d8ba67",
          400: "#cfa748",
          500: "#c1902f",
          600: "#a97c28",
          700: "#8a6323",
          800: "#714e21",
          900: "#604020",
          950: "#37240f",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      keyframes: {
        pulseSlow: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        }
      },
      animation: {
        "pulse-slow": "pulseSlow 3s ease-in-out infinite",
        "fade-in": "fadeIn 0.3s ease-out forwards",
      }
    },
  },
  plugins: [],
};
export default config;
