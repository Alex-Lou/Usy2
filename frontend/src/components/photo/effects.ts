/** Animated effects a studio photo can carry (same list as PhotoEffects.java). */
export const PHOTO_EFFECTS = [
  { id: "bounce", label: "Rebond", icon: "🏀" },
  { id: "zoom", label: "Zoom doux", icon: "🔍" },
  { id: "shake", label: "Tremble", icon: "〰️" },
  { id: "rainbow", label: "Arc-en-ciel", icon: "🌈" },
  { id: "hearts", label: "Cœurs", icon: "💕" },
  { id: "sparkles", label: "Étincelles", icon: "✨" },
  { id: "snow", label: "Neige", icon: "❄️" },
] as const;

export type PhotoEffect = (typeof PHOTO_EFFECTS)[number]["id"];

const PARTICLE: Partial<Record<string, string>> = { hearts: "💗", sparkles: "✨", snow: "❄️" };

export function particleOf(effect: string | null | undefined): string | null {
  return (effect && PARTICLE[effect]) || null;
}
