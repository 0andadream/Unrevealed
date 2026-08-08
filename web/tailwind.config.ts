import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        grove: {
          bg: "#0b0e14",
          panel: "#121822",
          border: "#2a3344",
          mist: "#8b9dc3",
          glow: "#a78bfa",
          crystal: "#67e8f9",
          leaf: "#34d399",
          gold: "#fbbf24",
        },
      },
      fontFamily: {
        pixel: ["var(--font-pixel)", "monospace"],
        ui: ["var(--font-ui)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 20px rgba(167, 139, 250, 0.35)",
        crystal: "0 0 16px rgba(103, 232, 249, 0.45)",
      },
    },
  },
  plugins: [],
};
export default config;
