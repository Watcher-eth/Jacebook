// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-lucida-grant)", "system-ui", "sans-serif"],
        lucida: ["var(--font-lucida-grant)"],
      },
    },
  },
  plugins: [],
};

export default config;