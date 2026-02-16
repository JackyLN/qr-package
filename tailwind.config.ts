import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        tet: {
          red: "#8B0000",
          redSoft: "#B01313",
          gold: "#F6C453",
          goldDeep: "#D9971E",
          cream: "#F9E6C8",
        },
      },
      boxShadow: {
        glow: "0 0 24px rgba(246, 196, 83, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
