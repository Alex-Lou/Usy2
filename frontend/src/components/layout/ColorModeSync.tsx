import { useEffect, useRef } from "react";
import { useAppTheme, type AppTheme } from "../../app/theme";
import { apiRequest } from "../../lib/api/client";

/**
 * Invisible: keeps my light/dark look (Néon / Papier) the same on all my
 * devices. On start, the server's choice wins (or this device's becomes the
 * server's if I never chose); then every change is saved. Mounted behind auth.
 */
export function ColorModeSync() {
  const { theme, setTheme } = useAppTheme();
  const synced = useRef(false);
  const last = useRef(theme);

  useEffect(() => {
    apiRequest<{ mode: AppTheme | null }>("/api/me/color-mode")
      .then(({ mode }) => {
        if (mode === "neo" || mode === "scrapbook") {
          last.current = mode; // not a change of mine: nothing to save back
          setTheme(mode);
        }
        else void apiRequest("/api/me/color-mode", { method: "PUT", body: { mode: theme } }).catch(() => {});
      })
      .catch(() => {})
      .finally(() => (synced.current = true));
    // Only once, on start; `theme` is this device's choice at that moment.
  }, []);
  useEffect(() => {
    if (!synced.current || last.current === theme) return;
    last.current = theme;
    void apiRequest("/api/me/color-mode", { method: "PUT", body: { mode: theme } }).catch(() => {});
  }, [theme]);

  return null;
}
