/**
 * Animated effects a studio photo can carry (same list as PhotoEffects.java):
 * a fixed list, plus a custom emoji that falls ("fall:🌸") or rises ("rise:🍕").
 */
export const PHOTO_EFFECTS = [
  { id: "bounce", label: "Rebond", icon: "🏀" },
  { id: "zoom", label: "Zoom doux", icon: "🔍" },
  { id: "shake", label: "Tremble", icon: "〰️" },
  { id: "heartbeat", label: "Battement", icon: "💓" },
  { id: "rainbow", label: "Arc-en-ciel", icon: "🌈" },
  { id: "hearts", label: "Cœurs", icon: "💕" },
  { id: "sparkles", label: "Étincelles", icon: "✨" },
  { id: "snow", label: "Neige", icon: "❄️" },
  { id: "petals", label: "Pétales", icon: "🌸" },
  { id: "bubbles", label: "Bulles", icon: "🫧" },
  { id: "rain", label: "Pluie", icon: "💧" },
  { id: "confetti", label: "Confettis", icon: "🎊" },
  { id: "stars", label: "Étoiles filantes", icon: "🌠" },
  { id: "fireworks", label: "Feux d'artifice", icon: "🎆" },
] as const;

export type PhotoEffect = (typeof PHOTO_EFFECTS)[number]["id"];

/** How particles move: fall from the top, rise from the bottom, or drift down swaying. */
export type ParticleMotion = "fall" | "rise" | "sway" | "rain";

const PARTICLES: Partial<Record<string, { char: string; motion: ParticleMotion }>> = {
  hearts: { char: "💗", motion: "rise" },
  sparkles: { char: "✨", motion: "rise" },
  snow: { char: "❄️", motion: "fall" },
  petals: { char: "🌸", motion: "sway" },
  bubbles: { char: "🫧", motion: "rise" },
  rain: { char: "💧", motion: "rain" },
};

const CUSTOM = /^(fall|rise):(.+)$/u;

/** A custom emoji (only pictographs, no letters/digits/markup): same rule as the server. */
export function isCustomEmoji(emoji: string): boolean {
  const chars = [...emoji];
  return (
    chars.length >= 1 &&
    chars.length <= 8 &&
    /\p{Extended_Pictographic}/u.test(emoji) &&
    !/[\p{L}\p{N}\p{Z}\p{P}\x00-\x9f]/u.test(emoji)
  );
}

export function customEffect(motion: "fall" | "rise", emoji: string): string | null {
  const e = emoji.trim();
  return isCustomEmoji(e) ? `${motion}:${e}` : null;
}

/** The emoji particles of an effect, if it has some (fixed list or custom). */
export function particleOf(effect: string | null | undefined): { char: string; motion: ParticleMotion } | null {
  if (!effect) return null;
  const custom = effect.match(CUSTOM);
  if (custom) return isCustomEmoji(custom[2]) ? { char: custom[2], motion: custom[1] as "fall" | "rise" } : null;
  return PARTICLES[effect] ?? null;
}

