import { SPECIES, SPECIES_LABELS } from "../../../app/companion";
import type { WidgetType } from "../types";
import { SCENE_GROUPS, SCENES } from "./scenes";

// Decorative animated marks, then the chibi animals (reused from the companion set).
export const SVG_DECOR = ["heart", "stars", "sparkle"] as const;
export const SVG_VARIANTS: string[] = [...SVG_DECOR, ...Object.keys(SCENES), ...SPECIES];

// Labels for the SVG variant picker (decor marks + the animal labels).
export const SVG_LABELS: Record<string, string> = {
  heart: "Cœur",
  stars: "Étoiles",
  sparkle: "Étincelle",
  ...Object.fromEntries(SCENE_GROUPS.flatMap((g) => g.items)),
  ...SPECIES_LABELS,
};

/** The variant picker, grouped: decor marks, the themed scenes, then the animals. */
export const SVG_GROUPS: { group: string; items: string[] }[] = [
  { group: "Décor", items: [...SVG_DECOR] },
  ...SCENE_GROUPS.map((g) => ({ group: g.group, items: g.items.map(([id]) => id) })),
  { group: "Compagnons", items: [...SPECIES] },
];

// Human labels for the widget picker (kept here so renderer + editor agree).
export const WIDGET_LABELS: Record<WidgetType, string> = {
  marquee: "Bandeau défilant",
  quote: "Citation",
  richtext: "Texte enrichi",
  mood: "Humeur",
  clock: "Horloge",
  countdown: "Compte à rebours",
  calendar: "Calendrier (nos dates)",
  music: "Musique (derniers ajouts)",
  image: "Image",
  svg: "SVG animé",
  pins: "Épingles (accès rapides)",
};
