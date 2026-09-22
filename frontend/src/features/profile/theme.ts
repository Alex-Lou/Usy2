import type { CSSProperties } from "react";
import type { FontKey, LayoutKey, Theme } from "./types";

// Maps the curated font keys to concrete font stacks.
export const FONT_STACKS: Record<FontKey, string> = {
  trebuchet: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif',
  georgia: 'Georgia, "Times New Roman", serif',
  courier: '"Courier New", Courier, monospace',
  comic: '"Comic Sans MS", "Comic Sans", cursive',
  system: "system-ui, sans-serif",
};

export const FONT_LABELS: Record<FontKey, string> = {
  trebuchet: "Trebuchet",
  georgia: "Georgia",
  courier: "Courier",
  comic: "Comic Sans",
  system: "Système",
};

export const LAYOUT_LABELS: Record<LayoutKey, string> = {
  classic: "Classique (une colonne)",
  "sidebar-left": "Barre latérale gauche",
};

/**
 * Builds the inline style that overrides the design tokens for a scoped
 * container, so a profile's theme applies only inside the profile view.
 */
export function buildThemeStyle(theme: Theme): CSSProperties {
  return {
    "--color-bg": theme.colors.bg,
    "--color-surface": theme.colors.surface,
    "--color-primary": theme.colors.primary,
    "--color-text": theme.colors.text,
    "--font-sans": FONT_STACKS[theme.font],
  } as CSSProperties;
}
