import { useEffect, useState } from "react";

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

/** A tab of the menu was tapped (even the one already open): it opens up to date. */
const TAB_EVENT = "memocat:tab";

export function openTab(): void {
  window.dispatchEvent(new Event(TAB_EVENT));
}

/** Counts the tab taps: used as a key, the open page starts over and fetches everything again. */
export function useTabNonce(): number {
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    const bump = () => setNonce((n) => n + 1);
    window.addEventListener(TAB_EVENT, bump);
    return () => window.removeEventListener(TAB_EVENT, bump);
  }, []);
  return nonce;
}
