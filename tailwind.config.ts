import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./lib/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#0a0a0a",
        panel: "#141414",
        accent: "#22d3ee",
        glow: "#4ade80",
        gold: "#fbbf24",
      },
    },
  },
  plugins: [],
};

export default config;
