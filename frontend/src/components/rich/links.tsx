import type { ReactNode } from "react";

// Links in plain text: "https://…", "www.…", or a bare "site.fr/…" with a common
// ending (kept to a short list so "fichier.txt" stays text). Trailing
// punctuation (".", ")", "!"…) is left out. No lookbehind (older iPhones).
const URL_RE =
  /(?:https?:\/\/|www\.)[^\s<>"']+|[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:com|fr|net|org|io|be|ch|ca|eu|de|es|it|uk|co|me|tv|app|dev|ly|gg|info|shop|news)(?![a-z0-9-])(?:\/[^\s<>"']*)?/gi;
const TRAILING = /[.,;:!?)\]}»"'…]+$/;

function* urls(text: string): Generator<{ url: string; href: string; index: number }> {
  URL_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = URL_RE.exec(text)) !== null) {
    if (m.index > 0 && /[@\w.\-/]/.test(text[m.index - 1])) continue; // an e-mail or the middle of a word
    const url = m[0].replace(TRAILING, "");
    const scheme = /^https?:\/\//i.exec(url);
    if (scheme && url.length <= scheme[0].length) continue;
    const href = scheme ? scheme[0].toLowerCase() + url.slice(scheme[0].length) : `https://${url}`;
    yield { url, href, index: m.index };
  }
}

/** The first link of a text (for its preview card), as a full https address, or null. */
export function firstUrl(text: string): string | null {
  for (const u of urls(text)) return u.href;
  return null;
}

/** Plain text with its links made clickable (opened in a new tab). Text stays escaped by React. */
export function linkify(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const { url, href, index } of urls(text)) {
    if (index > last) out.push(text.slice(last, index));
    out.push(
      <a
        key={index}
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        onClick={(e) => e.stopPropagation()}
        className="break-all underline underline-offset-2"
      >
        {url}
      </a>,
    );
    last = index + url.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
