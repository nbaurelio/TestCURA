import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F8F9FA",
        foreground: "#1e3a5f",
        primary: {
          DEFAULT: "#7BA8D1",
          foreground: "#1e3a5f",
        },
        secondary: {
          DEFAULT: "#1e3a5f",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#E8EAED",
          foreground: "#5f6368",
        },
        accent: {
          DEFAULT: "#5B8AB8",
          foreground: "#ffffff",
        },
        card: {
          DEFAULT: "#ffffff",
          foreground: "#1e3a5f",
        },
        border: "#D1D5DB",
        input: "#D1D5DB",
        ring: "#5B8AB8",
        success: {
          DEFAULT: "#2D7A4F",
          foreground: "#ffffff",
        },
        warning: {
          DEFAULT: "#B8860B",
          foreground: "#ffffff",
        },
        info: {
          DEFAULT: "#4A7BA7",
          foreground: "#ffffff",
        },
      },
      borderRadius: {
        lg: "6px",
        md: "4px",
        sm: "3px",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
