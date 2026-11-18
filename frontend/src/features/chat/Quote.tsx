import type { Message, ReplyPreview } from "./types";

const STICKER = /\[\[s:[a-z0-9-]+\]\]/g;

/** Text as words: a lone sticker reads « ✨ Sticker », one among words « ✨ » (not its code). */
export function plainText(text: string): string {
  const t = text.trim();
  if (/^\[\[s:[a-z0-9-]+\]\]$/.test(t)) return "✨ Sticker";
  return t.replace(STICKER, "✨");
}

/** One line for a quoted message: its text, or what it carries. */
export function quoteText(m: Pick<Message, "content" | "attachment"> | ReplyPreview): string {
  const text = plainText("excerpt" in m ? m.excerpt : m.content);
  const type = "excerpt" in m ? null : m.attachment?.contentType;
  const kind = "excerpt" in m ? m.attachment : !type ? null : type.startsWith("image/") ? "image" : type.startsWith("audio/") ? "audio" : "file";
  if (text) return text;
  if (type === "image/gif") return "🎞️ GIF";
  return kind === "image" ? "📷 Photo" : kind === "audio" ? "🎤 Message vocal" : kind === "file" ? "📎 Fichier" : "…";
}

/** The quoted message above a reply; a tap scrolls to the original when it is loaded. */
export function Quote({ reply, myId }: { reply: ReplyPreview; myId: number | undefined }) {
  function jump() {
    const el = document.getElementById(`msg-${reply.id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("mc-flash");
    window.setTimeout(() => el.classList.remove("mc-flash"), 1200);
  }
  return (
    <button
      type="button"
      onClick={jump}
      aria-label={`Message cité de ${reply.senderId === myId ? "toi" : reply.senderName}`}
      className="block w-full min-w-40 max-w-72 rounded-token-sm border-l-4 border-primary bg-surface-2 px-2.5 py-1.5 text-left text-xs press"
    >
      <span className="block font-semibold text-primary">{reply.senderId === myId ? "Toi" : reply.senderName}</span>
      <span className="line-clamp-2 block text-text-muted">{quoteText(reply)}</span>
    </button>
  );
}
