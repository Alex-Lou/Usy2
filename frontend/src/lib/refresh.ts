import { useEffect } from "react";

/**
 * « Actualiser » without reloading: pages that show shared data listen and
 * re-fetch. Sent when the app comes back to the screen after a while (the
 * phone may have missed things while asleep).
 */
const EVENT = "memocat:refresh";
/** Away at least this long: the open page re-fetches on return. */
const AWAY_MS = 60_000;

export function emitRefresh(): void {
  window.dispatchEvent(new Event(EVENT));
}

/** Runs `refresh` each time the app asks the open pages to catch up. */
export function useOnRefresh(refresh: () => void): void {
  useEffect(() => {
    window.addEventListener(EVENT, refresh);
    return () => window.removeEventListener(EVENT, refresh);
  }, [refresh]);
}

/** Mounted once: back on screen after a while → the open pages catch up. */
export function useRefreshOnReturn(): void {
  useEffect(() => {
    let hiddenAt: number | null = null;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
      } else if (hiddenAt !== null && Date.now() - hiddenAt >= AWAY_MS) {
        hiddenAt = null;
        emitRefresh();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);
}
