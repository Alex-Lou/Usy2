import { useEffect, useState } from "react";
import { fontStack, useFonts } from "../../lib/fonts";
import { useSharedAppearance } from "../couple/appearance";
import { getMyProfile } from "./api";
import { fontVars } from "./theme";
import type { FontKey, Theme } from "./types";

const EVENT = "memocat:my-theme-saved";

/** The profile editor announces a saved theme, so the app's fonts update at once. */
export function emitMyThemeSaved(theme: Theme): void {
  window.dispatchEvent(new CustomEvent<Theme>(EVENT, { detail: theme }));
}

/**
 * Invisible: applies the app's fonts. My own choice wins: when my profile's
 * fonts are set to "Toute l'app", they apply to the whole interface (text and
 * titles) for me only, on every device, since they are stored with my
 * profile. Otherwise the fonts the two of us chose in common apply, if any.
 * Mounted behind auth.
 */
export function AppFonts() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    getMyProfile().then((p) => setTheme(p.theme)).catch(() => {});
    const onSaved = (e: Event) => setTheme((e as CustomEvent<Theme>).detail);
    window.addEventListener(EVENT, onSaved);
    return () => window.removeEventListener(EVENT, onSaved);
  }, []);

  const common = useSharedAppearance();
  const appWide = theme?.fontScope === "app";
  useFonts(appWide ? theme?.font : common.font, appWide ? theme?.headingFont : common.headingFont);

  const vars = appWide && theme ? fontVars(theme) : commonFontVars(common.font, common.headingFont);
  const signature = JSON.stringify(vars);
  useEffect(() => {
    const root = document.documentElement.style;
    const applied = JSON.parse(signature) as Record<string, string>;
    Object.entries(applied).forEach(([name, value]) => root.setProperty(name, value));
    return () => Object.keys(applied).forEach((name) => root.removeProperty(name)); // back to the app's fonts
  }, [signature]);

  return null;
}

/** Same variables as fontVars, from the fonts chosen in common. */
function commonFontVars(font: FontKey | null, headingFont: FontKey | null): Record<string, string> {
  const vars: Record<string, string> = {};
  const body = fontStack(font);
  const heading = fontStack(headingFont) ?? body;
  if (body) vars["--font-body"] = body;
  if (heading) {
    vars["--font-display"] = heading;
    vars["--font-script"] = heading;
  }
  return vars;
}
