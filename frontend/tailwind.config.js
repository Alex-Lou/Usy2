/** @type {import('tailwindcss').Config} */
// Tailwind consumes the design tokens from src/styles/tokens.css.
// Two app themes (neo / scrapbook) swap the CSS variables; components only
// reference semantic names, never hard-coded colors.
// A theme colour that also takes an opacity (bg-primary/15, border-primary/50…):
// the tokens are CSS variables, so Tailwind cannot split them into channels; the
// opacity is applied with color-mix instead (without this, those classes emit nothing).
// Plain uses (bg-primary) stay a plain variable: only an explicit /NN goes through color-mix.
const token = (name) => ({ opacityValue }) =>
  opacityValue === undefined || opacityValue === "1" || String(opacityValue).startsWith("var(")
    ? `var(${name})`
    : `color-mix(in srgb, var(${name}) calc(${opacityValue} * 100%), transparent)`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: token("--color-bg"),
        "bg-2": token("--color-bg-2"),
        surface: token("--color-surface"),
        "surface-2": token("--color-surface-2"),
        border: token("--color-border"),
        text: {
          DEFAULT: token("--color-text"),
          muted: token("--color-text-muted"),
        },
        primary: {
          DEFAULT: token("--color-primary"),
          foreground: token("--color-primary-foreground"),
        },
        accent: {
          DEFAULT: token("--color-accent"),
          2: token("--color-accent-2"),
        },
        danger: token("--color-danger"),
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
      // The desktop shell (tokens.css, "Layout"): h-desk-bar for the top bar,
      // w-shell / lg:pl-shell for the left rail, w-shell-right for the right
      // one, max-w-content for the main column.
      spacing: {
        shell: "var(--shell-left-w)",
        "shell-right": "var(--shell-right-w)",
        "desk-bar": "var(--desk-topbar-h)",
      },
      maxWidth: {
        content: "var(--content-w)",
      },
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
    },
  },
  plugins: [],
};
