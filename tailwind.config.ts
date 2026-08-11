import type { Config } from "tailwindcss";

/**
 * Galleria-inspired palette, blue-shifted.
 * Original Galleria: #081820 / #346856 / #88c070 / #e3f8d1
 * Ours (blue):       #081428 / #345878 / #70a8e0 / #d1e8f8
 */
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        g: {
          bg: "#081428",
          mid: "#345878",
          bright: "#70a8e0",
          cream: "#d1e8f8",
          deep: "#040c18",
          crystal: "#9ad8ff",
          gold: "#e8c86a",
        },
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', "Courier New", "monospace"],
        ui: ['"Press Start 2P"', "Courier New", "monospace"],
      },
      boxShadow: {
        pixel: "0 0 0 2px #081428, 3px 3px 0 rgba(4,12,24,0.55)",
        "pixel-inset":
          "inset 2px 2px 0 rgba(112,168,224,0.30), inset -2px -2px 0 rgba(8,20,40,0.55)",
        "pixel-hard": "2px 2px 0 #081428",
      },
    },
  },
  plugins: [],
};
export default config;
