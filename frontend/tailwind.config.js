/** @type {import('tailwindcss').Config} */
// Tailwind consumes the design tokens defined in src/styles/tokens.css.
// Components reference semantic names (bg-surface, text-primary, ...) only —
// never hard-coded colors — so profile theming later just overrides the CSS vars.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        border: "var(--color-border)",
        text: {
          DEFAULT: "var(--color-text)",
          muted: "var(--color-text-muted)",
        },
        primary: {
          DEFAULT: "var(--color-primary)",
          foreground: "var(--color-primary-foreground)",
        },
        danger: "var(--color-danger)",
      },
      fontFamily: {
        sans: "var(--font-sans)",
      },
      borderRadius: {
        token: "var(--radius)",
      },
    },
  },
  plugins: [],
};
