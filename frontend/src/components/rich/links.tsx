import type { ReactNode } from "react";

// http(s) links in plain text; trailing punctuation (".", ")", "!"…) is left out.
const URL_RE = /https?:\/\/[^\s<>"']+/g;
const TRAILING = /[.,;:!?)\]}»"'…]+$/;

function* urls(text: string): Generator<{ url: string; index: number }> {
  URL_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = URL_RE.exec(text)) !== null) {
    const url = m[0].replace(TRAILING, "");
    if (url.length > "https://".length) yield { url, index: m.index };
  }
}

/** The first link of a text (for its preview card), or null. */
export function firstUrl(text: string): string | null {
  for (const u of urls(text)) return u.url;
  return null;
}

/** Plain text with its links made clickable (opened in a new tab). Text stays escaped by React. */
export function linkify(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const { url, index } of urls(text)) {
    if (index > last) out.push(text.slice(last, index));
    out.push(
      <a
        key={index}
        href={url}
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
