import type { ReactNode } from "react";
import { SPECIES, SPECIES_LABELS, type Species } from "../../app/companion";
import { Animal, AnimalCharm } from "../ui/animals";
import { HeartMark, SparkleMarks } from "../ui/decor";

/**
 * Local, curated sticker collection — 100% our own art (chibi animals, marks,
 * animated emojis). No third-party service, no licensing, nothing leaves the app.
 * A sticker travels as a plain-text token `[[s:<id>]]` inside a comment or a
 * message, so the backend stores ordinary text and nothing can inject markup.
 */
export type StickerKind = "sticker" | "animated";

export interface Sticker {
  id: string;
  label: string;
  kind: StickerKind;
  render: (size: number) => ReactNode;
}

const animal = (s: Species, anim = "") => (size: number) => (
  <span className={`inline-block ${anim}`}>
    <Animal species={s} size={size} />
  </span>
);

const emoji = (char: string, anim: string) => (size: number) => (
  <span className={`mc-emoji inline-block ${anim}`} style={{ fontSize: Math.round(size * 0.78) }}>
    {char}
  </span>
);

function LoveNote({ size }: { size: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-2xl rounded-bl-sm bg-primary px-3 py-1.5 font-script text-primary-foreground shadow-glow" style={{ fontSize: Math.round(size * 0.3) }}>
      je t&apos;aime
      <HeartMark size={Math.round(size * 0.3)} className="text-primary-foreground" />
    </span>
  );
}

export const STICKERS: readonly Sticker[] = [
  // — Stickers: the couple's chibi companions + a heart —
  ...SPECIES.map((s): Sticker => ({ id: s, label: SPECIES_LABELS[s], kind: "sticker", render: animal(s) })),
  { id: "coeur", label: "Cœur", kind: "sticker", render: (size) => <HeartMark size={size} beating={false} /> },

  // — Animated ("GIFs"): lightweight CSS/SVG animations —
  { id: "chat-coucou", label: "Chat coucou", kind: "animated", render: animal("cat", "mc-wiggle") },
  { id: "chat-porte-cle", label: "Chat porte-clé", kind: "animated", render: (size) => <AnimalCharm species="cat" width={Math.round(size * 0.42)} /> },
  { id: "lapin-saute", label: "Lapin qui saute", kind: "animated", render: animal("rabbit", "mc-hop") },
  { id: "chien-content", label: "Chien content", kind: "animated", render: animal("dog", "mc-wiggle") },
  { id: "capy-zen", label: "Capybara zen", kind: "animated", render: animal("capybara", "mc-float") },
  { id: "raton-malin", label: "Raton malin", kind: "animated", render: animal("raccoon", "mc-shake") },
  { id: "rouge-gorge", label: "Rouge-gorge", kind: "animated", render: animal("robin", "mc-hop") },
  { id: "coeur-bat", label: "Cœur qui bat", kind: "animated", render: (size) => <HeartMark size={size} /> },
  { id: "etincelles", label: "Étincelles", kind: "animated", render: (size) => <SparkleMarks size={size} /> },
  { id: "je-t-aime", label: "Je t'aime", kind: "animated", render: (size) => <LoveNote size={size} /> },
  { id: "bisou", label: "Bisou", kind: "animated", render: emoji("😘", "mc-pulse") },
  { id: "calin", label: "Câlin", kind: "animated", render: emoji("🤗", "mc-hop") },
  { id: "amoureux", label: "Amoureux", kind: "animated", render: emoji("🥰", "mc-float") },
  { id: "coeurs", label: "Cœurs", kind: "animated", render: emoji("💕", "mc-float") },
  { id: "rose", label: "Rose", kind: "animated", render: emoji("🌹", "mc-sway") },
  { id: "mort-de-rire", label: "Mort de rire", kind: "animated", render: emoji("😂", "mc-shake") },
  { id: "fete", label: "Fête", kind: "animated", render: emoji("🎉", "mc-wiggle") },
  { id: "bravo", label: "Bravo", kind: "animated", render: emoji("👏", "mc-shake") },
  { id: "feu", label: "Le feu", kind: "animated", render: emoji("🔥", "mc-pulse") },
  { id: "snif", label: "Snif", kind: "animated", render: emoji("🥺", "mc-hop") },
  { id: "cafe", label: "Café ?", kind: "animated", render: emoji("☕", "mc-float") },
  { id: "bonne-nuit", label: "Bonne nuit", kind: "animated", render: emoji("🌙", "mc-sway") },
];

const BY_ID = new Map(STICKERS.map((s) => [s.id, s]));

export function findSticker(id: string): Sticker | undefined {
  return BY_ID.get(id);
}

export function stickerToken(id: string): string {
  return `[[s:${id}]]`;
}
