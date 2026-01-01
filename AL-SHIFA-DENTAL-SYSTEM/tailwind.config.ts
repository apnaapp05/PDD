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
        // Brand Colors
        doctor: {
          DEFAULT: "#0f4c81", // Deep Royal Blue
          light: "#1e609e",
          dark: "#0a355c",
        },
        patient: {
          DEFAULT: "#2a9d8f", // Soft Teal
          light: "#4ecdc4",
          dark: "#1d756b",
        },
        // Semantic Colors
        danger: "#e63946",
        success: "#2a9d8f",
        warning: "#f4a261",
        background: "#f8f9fa", // Clinical White
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
};
export default config;
