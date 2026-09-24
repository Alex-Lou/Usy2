import type { CSSProperties } from "react";
import { fontStack } from "../../lib/fonts";
import type { LayoutKey, Theme } from "./types";

export const LAYOUT_LABELS: Record<LayoutKey, string> = {
  classic: "Classique (une colonne)",
  "sidebar-left": "Barre latérale gauche",
};

/**
 * Whether the theme's fonts are used. A theme saved before fonts had a scope
 * (fontScope null) keeps the old rule: its font only came with custom colors.
 */
export function fontsApply(theme: Theme): boolean {
  return theme.fontScope != null || theme.mode === "custom";
}

/** CSS variables for the theme's text and title fonts ("app" keeps the app's own). */
export function fontVars(theme: Theme): Record<string, string> {
  if (!fontsApply(theme)) return {};
  const vars: Record<string, string> = {};
  const body = fontStack(theme.font);
  const heading = fontStack(theme.headingFont);
  if (body) vars["--font-body"] = body;
  if (heading) vars["--font-display"] = heading;
  return vars;
}

/**
 * Builds the inline style that overrides the design tokens for a scoped
 * container, so a profile's theme applies only inside the profile view:
 * its colors in custom mode, its fonts when they apply.
 */
export function buildThemeStyle(theme: Theme): CSSProperties {
  const colors =
    theme.mode === "custom"
      ? {
          "--color-bg": theme.colors.bg,
          "--color-surface": theme.colors.surface,
          "--color-primary": theme.colors.primary,
          "--color-text": theme.colors.text,
        }
      : {};
  return { ...colors, ...fontVars(theme) } as CSSProperties;
}
