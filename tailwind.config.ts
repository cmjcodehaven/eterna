import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#080808",
        card: "#121212",
        gold: {
          DEFAULT: "#c9a24d",
          bright: "#f1d77a",
          muted: "rgba(201, 162, 77, 0.35)",
          subtle: "rgba(201, 162, 77, 0.25)",
        },
        parchment: {
          DEFAULT: "#f7f0df",
          muted: "rgba(247, 240, 223, 0.6)",
        },
        destructive: {
          DEFAULT: "#7f1d1d",
          foreground: "#fca5a5",
        },
      },
      fontFamily: {
        serif: ["Georgia", '"Times New Roman"', "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        luxury: "0.2em",
        wide: "0.12em",
      },
    },
  },
  plugins: [],
} satisfies Config;
