/** Always first in the bar, in this order. */
export const FIXED_REACTIONS = ["❤️", "😂", "😮", "😢", "👍"] as const;

const KEY = "memocat.reactions.recent";
const MAX = 12;

/** The other emojis I reacted with lately, newest first (this device only). */
export function readReactionRecents(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}

/** Puts an emoji first among the recents (the fixed five never go there). */
export function rememberReaction(emoji: string): void {
  if ((FIXED_REACTIONS as readonly string[]).includes(emoji)) return;
  const next = [emoji, ...readReactionRecents().filter((e) => e !== emoji)].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode: no recents, nothing else lost */
  }
}
