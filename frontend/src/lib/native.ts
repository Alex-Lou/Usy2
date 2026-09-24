/**
 * MemoCat also ships as an Android app (Tauri, see src-tauri/). The same web
 * code runs inside it; these helpers cover the few places where the app must
 * behave differently from the browser/PWA.
 */
export function isNativeApp(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * In the app, web links meant for another tab (target=_blank or another site)
 * open in the phone's browser or the matching app, instead of doing nothing.
 * Only http(s) links are handed over.
 */
export function openExternalLinksNatively(): void {
  if (!isNativeApp()) return;
  document.addEventListener(
    "click",
    (e) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || e.defaultPrevented) return;
      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      const external = url.origin !== window.location.origin || a.target === "_blank";
      if (!external || (url.protocol !== "http:" && url.protocol !== "https:")) return;
      e.preventDefault();
      void import("@tauri-apps/plugin-opener").then(({ openUrl }) => openUrl(url.href)).catch(() => {});
    },
    true,
  );
}
