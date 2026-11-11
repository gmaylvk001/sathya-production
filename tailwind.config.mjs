import scrollbarHide from "tailwind-scrollbar-hide";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Poppins",
          "var(--font-poppins)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
          '"Segoe UI Symbol"',
          '"Noto Color Emoji"',
        ],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        "sathya-red": "var(--sathya-red)",
        "sathya-yellow": "var(--sathya-yellow)",
        brandRed: "var(--sathya-red)",
        brandRedDark: "var(--sathya-red-dark)",
        brandYellow: "var(--sathya-yellow)",
        brandYellowDark: "var(--sathya-yellow-dark)",
        // Legacy alias used across pages — maps to brand red
        customBlue: "var(--sathya-red)",
      },
    },
  },
  plugins: [scrollbarHide],
};
