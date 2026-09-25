import type { Pin } from "../types";

/**
 * Hand-picked sites to pin in one tap: reference institutions and archives
 * rather than random blogs (folklore and Gaelic tradition from the sources),
 * and a few tech and games sites that write real articles.
 */
export const PIN_SUGGESTIONS: { group: string; pins: Pin[] }[] = [
  { group: "Inspiration", pins: [{ label: "Pinterest", url: "https://www.pinterest.com" }] },
  {
    group: "Nature d'Irlande",
    pins: [
      { label: "Parcs nationaux (NPWS)", url: "https://www.npws.ie" },
      { label: "Irish Wildlife Trust", url: "https://iwt.ie" },
      { label: "Discover Ireland", url: "https://www.discoverireland.ie" },
    ],
  },
  {
    group: "Nature d'Écosse",
    pins: [
      { label: "NatureScot", url: "https://www.nature.scot" },
      { label: "Scottish Wildlife Trust", url: "https://scottishwildlifetrust.org.uk" },
      { label: "Trees for Life", url: "https://treesforlife.org.uk" },
    ],
  },
  {
    group: "Folklore et fées",
    pins: [
      { label: "Dúchas (folklore irlandais)", url: "https://www.duchas.ie" },
      { label: "Tobar an Dualchais", url: "https://www.tobarandualchais.co.uk" },
      { label: "The Folklore Society", url: "https://folklore-society.com" },
    ],
  },
  {
    group: "Tradition gaélique",
    pins: [
      { label: "Textes celtiques", url: "https://sacred-texts.com/neu/celt/index.htm" },
      { label: "CELT (textes irlandais)", url: "https://celt.ucc.ie" },
      { label: "LearnGaelic", url: "https://learngaelic.scot" },
      { label: "Teanglann (irlandais)", url: "https://www.teanglann.ie" },
    ],
  },
  {
    group: "Geek & actus",
    pins: [
      { label: "Korben", url: "https://korben.info" },
      { label: "Numerama", url: "https://www.numerama.com" },
      { label: "Jeuxvideo.com", url: "https://www.jeuxvideo.com" },
      { label: "Next", url: "https://next.ink" },
      { label: "Journal du Geek", url: "https://www.journaldugeek.com" },
      { label: "Frandroid", url: "https://www.frandroid.com" },
      { label: "Gamekult", url: "https://www.gamekult.com" },
      { label: "Ars Technica", url: "https://arstechnica.com" },
    ],
  },
];

export const MAX_PINS = 12;

/** "site.fr/x" → "https://site.fr/x"; anything else is left for the server to refuse. */
export function normalizePinUrl(raw: string): string {
  const v = raw.trim();
  if (!v || /^https?:\/\//i.test(v)) return v;
  return /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(\/.*)?$/i.test(v) ? `https://${v}` : v;
}

export function isWebAddress(url: string): boolean {
  try {
    const u = new URL(url);
    return (u.protocol === "http:" || u.protocol === "https:") && !!u.hostname && !u.username;
  } catch {
    return false;
  }
}

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
