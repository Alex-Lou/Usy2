import { fontStack } from "../../lib/fonts";
import type { Theme } from "./types";

/**
 * Whether the theme's fonts are used. A theme saved before fonts had a scope
 * (fontScope null) keeps the old rule: its font only came with custom colors.
 */
export function fontsApply(theme: Theme): boolean {
  return theme.fontScope != null || theme.mode === "custom";
}

/**
 * CSS variables for the theme's fonts. The chosen text font reaches everything
 * — titles and handwritten touches too — unless the titles have their own
 * font; "app" everywhere keeps the app's own fonts.
 */
export function fontVars(theme: Theme): Record<string, string> {
  if (!fontsApply(theme)) return {};
  const vars: Record<string, string> = {};
  const body = fontStack(theme.font);
  const heading = fontStack(theme.headingFont) ?? body;
  if (body) vars["--font-body"] = body;
  if (heading) {
    vars["--font-display"] = heading;
    vars["--font-script"] = heading;
  }
  return vars;
}

/**
 * A theme saved before fonts had a scope shows its font only with custom
 * colors: it becomes an explicit choice with the same result (its font on the
 * profile with custom colors, the app's font otherwise). With no font of its
 * own yet, a new choice applies to the whole app.
 */
export function withFontChoice(theme: Theme): Theme {
  if (theme.fontScope) return { ...theme, headingFont: theme.headingFont ?? "app" };
  if (theme.mode === "custom") return { ...theme, headingFont: "app", fontScope: "profile" };
  return { ...theme, font: "app", headingFont: "app", fontScope: "app" };
}
