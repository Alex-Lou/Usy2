/**
 * Content shared to MemoCat from another app (Android "Share" menu). The
 * service worker parks it in a cache (see public/sw.js); the feed takes it
 * once, then the user picks where it goes: a post (pre-filled composer) or a
 * message (pre-filled chat box). Nothing is sent until the user sends it.
 */
const SHARE_CACHE = "memocat-share";
const MAX_AGE_MS = 60 * 60_000; // an old, forgotten share is not reused

export interface SharedContent {
  text: string;
  file: File | null;
}

/** Title, text and link, without repeating the link when the text already has it. */
function compose(title: string, text: string, url: string): string {
  const parts: string[] = [];
  if (title && !text.includes(title)) parts.push(title);
  if (text) parts.push(text);
  if (url && !text.includes(url)) parts.push(url);
  return parts.join("\n").trim();
}

export async function takeSharedContent(): Promise<SharedContent | null> {
  if (typeof caches === "undefined") return null;
  try {
    const cache = await caches.open(SHARE_CACHE);
    const metaRes = await cache.match("/shared/meta");
    if (!metaRes) return null;
    const meta = (await metaRes.json()) as { title?: string; text?: string; url?: string; fileName?: string | null; at?: number };
    const fileRes = await cache.match("/shared/file");
    let file: File | null = null;
    if (fileRes && meta.fileName) {
      const blob = await fileRes.blob();
      file = new File([blob], meta.fileName, { type: blob.type || "image/jpeg" });
    }
    await cache.delete("/shared/meta");
    await cache.delete("/shared/file");
    if (!meta.at || Date.now() - meta.at > MAX_AGE_MS) return null;
    const text = compose(meta.title ?? "", meta.text ?? "", meta.url ?? "");
    return text || file ? { text, file } : null;
  } catch {
    return null;
  }
}

// Hand-off from the feed to the chat when "Message" is chosen (in memory: same tab, one use).
let forChat: SharedContent | null = null;

export function handToChat(content: SharedContent): void {
  forChat = content;
}

export function takeForChat(): SharedContent | null {
  const c = forChat;
  forChat = null;
  return c;
}
