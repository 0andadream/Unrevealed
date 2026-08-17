import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: {
          DEFAULT: "#08090b",
          800: "#101216",
          700: "#161a20",
          600: "#1d222a",
        },
        mist: {
          DEFAULT: "#e8edf2",
          300: "#b4bcc6",
          500: "#8b95a1",
        },
        lime: {
          DEFAULT: "#c6f04d",
          200: "#d9ff7a",
        },
        signal: "#3ee0a0",
        danger: "#ff5c5c",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
