import { isWebAddress } from "../profile/widgets/pinSuggestions";

/**
 * Opening a song in Patotube, our Android app (io.patotube.app), through its
 * deep link patotube://download?url=… . On Android the link is an intent: if
 * Patotube is not installed, the browser falls back to the song's own page.
 * Only plain http(s) links are ever handed over.
 */
const PACKAGE = "io.patotube.app";

export function isAndroid(): boolean {
  return typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
}

export function patotubeLink(url: string): string | null {
  if (!isWebAddress(url)) return null;
  return (
    `intent://download?url=${encodeURIComponent(url)}` +
    `#Intent;scheme=patotube;package=${PACKAGE};S.browser_fallback_url=${encodeURIComponent(url)};end`
  );
}
