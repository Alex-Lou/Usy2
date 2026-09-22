/** @type {import('tailwindcss').Config} */
// Tailwind consumes the design tokens from src/styles/tokens.css.
// Two app themes (neo / scrapbook) swap the CSS variables; components only
// reference semantic names, never hard-coded colors.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        "bg-2": "var(--color-bg-2)",
        surface: "var(--color-surface)",
        "surface-2": "var(--color-surface-2)",
        border: "var(--color-border)",
        text: {
          DEFAULT: "var(--color-text)",
          muted: "var(--color-text-muted)",
        },
        primary: {
          DEFAULT: "var(--color-primary)",
          foreground: "var(--color-primary-foreground)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          2: "var(--color-accent-2)",
        },
        danger: "var(--color-danger)",
      },
      fontFamily: {
        sans: "var(--font-body)",
        display: "var(--font-display)",
        script: "var(--font-script)",
      },
      borderRadius: {
        token: "var(--radius)",
        "token-sm": "var(--radius-sm)",
      },
      boxShadow: {
        glow: "var(--glow)",
        card: "var(--shadow)",
      },
      backgroundImage: {
        brand: "var(--grad)",
      },
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
    },
  },
  plugins: [],
};
