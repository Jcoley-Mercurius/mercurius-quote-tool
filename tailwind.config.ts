import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Mercurius Brand Colors
        primary: {
          50: "#ecfdf5",
          100: "#d1fae5",
          500: "#10b981",   // Main emerald green
          600: "#059669",   // Primary buttons & accents
          700: "#047857",   // Darker emerald
        },
        neutral: {
          900: "#111827",   // Main text color
        },
      },
    },
  },
  plugins: [],
};
export default config;