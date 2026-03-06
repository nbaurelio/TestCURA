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
        background: "#FFFBEF",
        foreground: "#1a3a5c",
        primary: {
          DEFAULT: "#98C8FB",
          foreground: "#1a3a5c",
        },
        secondary: {
          DEFAULT: "#1a3a5c",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#f5f5f5",
          foreground: "#666666",
        },
        accent: {
          DEFAULT: "#98C8FB",
          foreground: "#1a3a5c",
        },
        card: {
          DEFAULT: "#ffffff",
          foreground: "#1a3a5c",
        },
        border: "#e0e0e0",
        input: "#e0e0e0",
        ring: "#98C8FB",
      },
      borderRadius: {
        lg: "15px",
        md: "10px",
        sm: "5px",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
