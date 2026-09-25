import { useEffect, useState } from "react";
import { onMyThemeSaved } from "../../features/profile/AppFonts";
import { getMyProfile } from "../../features/profile/api";
import type { Glass } from "../../features/profile/types";

/**
 * Invisible: applies my glass choice (stored with my profile, so on every
 * device). The cards only turn to frosted glass while a background shows
 * (see glass.css); "off" keeps them opaque. Mounted behind auth.
 */
export function GlassSync() {
  const [glass, setGlass] = useState<Glass>("medium");

  useEffect(() => {
    getMyProfile().then((p) => setGlass(p.theme.glass ?? "medium")).catch(() => {});
    return onMyThemeSaved((theme) => setGlass(theme.glass ?? "medium"));
  }, []);

  useEffect(() => {
    if (glass === "off") return;
    document.documentElement.dataset.glass = glass;
    return () => {
      delete document.documentElement.dataset.glass;
    };
  }, [glass]);

  return null;
}
