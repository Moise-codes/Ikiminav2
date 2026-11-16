/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "#e2e2e2",
        input: "#e2e2e2",
        ring: "#1a1a1a",
        background: "#fcfcfc",
        foreground: "#1a1a1a",
        primary: {
          DEFAULT: "#1a1a1a",
          foreground: "#fcfcfc",
        },
        secondary: {
          DEFAULT: "#f7f7f7",
          foreground: "#4d4d4d",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#fcfcfc",
        },
        muted: {
          DEFAULT: "#999",
          foreground: "#737373",
        },
        accent: {
          DEFAULT: "#e2e2e2",
          foreground: "#2e2e2e",
        },
        popover: {
          DEFAULT: "#fcfcfc",
          foreground: "#1a1a1a",
        },
        card: {
          DEFAULT: "#fcfcfc",
          foreground: "#1a1a1a",
        },
        success: {
          DEFAULT: "#10b981",
          foreground: "#fcfcfc",
        },
        warning: {
          DEFAULT: "#f59e0b",
          foreground: "#1a1a1a",
        },
      },
      borderRadius: {
        lg: "8px",
        md: "6px",
        sm: "4px",
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
