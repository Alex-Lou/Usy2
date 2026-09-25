/**
 * How a message can be sent (see backend MessageLooks): a bubble style and a
 * full-screen effect. The ids are the server's closed lists.
 */
export type BubbleStyle = "shout" | "whisper" | "shake";
export type ScreenEffectId = "confetti" | "hearts" | "fireworks" | "balloons" | "stars" | "kisses";

export interface MessageLook {
  style: BubbleStyle | null;
  effect: ScreenEffectId | null;
}

export const NO_LOOK: MessageLook = { style: null, effect: null };

export const BUBBLE_STYLES: { id: BubbleStyle; label: string; icon: string }[] = [
  { id: "shout", label: "Crier", icon: "📣" },
  { id: "whisper", label: "Chuchoter", icon: "🤫" },
  { id: "shake", label: "Tremble", icon: "〰️" },
];

export const SCREEN_EFFECTS: { id: ScreenEffectId; label: string; icon: string }[] = [
  { id: "confetti", label: "Confettis", icon: "🎊" },
  { id: "hearts", label: "Cœurs", icon: "💕" },
  { id: "fireworks", label: "Feux d'artifice", icon: "🎆" },
  { id: "balloons", label: "Ballons", icon: "🎈" },
  { id: "stars", label: "Étoiles", icon: "✨" },
  { id: "kisses", label: "Bisous", icon: "💋" },
];

/** The text's class for a bubble style (see chat-fx.css). */
export function styleClass(style: string | null | undefined): string {
  return style === "shout" ? "mc-shout" : style === "whisper" ? "mc-whisper" : style === "shake" ? "mc-tremble" : "";
}

// Effects already played on this device, so each plays once (then on demand).
const SEEN_KEY = "memocat.chat.effectsSeen";
const MAX_SEEN = 200;

function readSeen(): number[] {
  try {
    const raw = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((x): x is number => typeof x === "number") : [];
  } catch {
    return [];
  }
}

export function effectSeen(id: number): boolean {
  return readSeen().includes(id);
}

export function markEffectSeen(id: number): void {
  try {
    const seen = readSeen().filter((x) => x !== id);
    seen.push(id);
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen.slice(-MAX_SEEN)));
  } catch {
    /* not remembered: it may play again, nothing worse */
  }
}
