import { Fragment, type ReactNode } from "react";
import { LiveSticker } from "./LiveSticker";
import { findSticker, type Sticker } from "./stickers";

const TOKEN = /\[\[s:([a-z0-9-]+)\]\]/g;
const ONLY_TOKEN = /^\[\[s:([a-z0-9-]+)\]\]$/;
// Emoji-only text (no letters/digits): pictographs, modifiers, flags, joiners.
const EMOJI_ONLY = /^[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}\u200d\ufe0f\u20e3\s]+$/u;

// One visible emoji = a flag pair, or a pictograph with optional skin tone / VS16,
// possibly joined (ZWJ) into a family/couple sequence.
const EMOJI_CLUSTER =
  /\p{Regional_Indicator}{2}|\p{Extended_Pictographic}\p{Emoji_Modifier}?\ufe0f?(?:\u200d\p{Extended_Pictographic}\p{Emoji_Modifier}?\ufe0f?)*/gu;

function emojiCount(text: string): number {
  return text.match(EMOJI_CLUSTER)?.length ?? 0;
}

export function stickerOnly(text: string): Sticker | null {
  const m = text.trim().match(ONLY_TOKEN);
  return m ? findSticker(m[1]) ?? null : null;
}

export function isEmojiOnly(text: string): boolean {
  const t = text.trim();
  return t.length > 0 && EMOJI_ONLY.test(t) && /[\p{Extended_Pictographic}\p{Regional_Indicator}]/u.test(t) && emojiCount(t) <= 3;
}

/** True when the content should be shown "bare" (big, without a bubble), like messengers do. */
export function isBare(text: string): boolean {
  return stickerOnly(text) !== null || isEmojiOnly(text);
}

function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  TOKEN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN.exec(text)) !== null) {
    const sticker = findSticker(m[1]);
    if (!sticker) continue; // unknown token: left as plain text
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      <LiveSticker key={key++} className="mx-0.5 inline-block align-middle">
        {sticker.render(40)}
      </LiveSticker>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/**
 * Renders a comment/message body: a lone sticker or a few emojis are shown big;
 * otherwise text (escaped by React) with inline stickers. Never injects HTML.
 */
export function RichBody({ text, className = "" }: { text: string; className?: string }) {
  const sticker = stickerOnly(text);
  if (sticker) return <LiveSticker className="block py-1">{sticker.render(96)}</LiveSticker>;
  if (isEmojiOnly(text)) return <p className="mc-emoji py-0.5 text-5xl">{text.trim()}</p>;
  return (
    <p className={`whitespace-pre-wrap break-words ${className}`}>
      {renderInline(text).map((n, i) => (
        <Fragment key={i}>{n}</Fragment>
      ))}
    </p>
  );
}
