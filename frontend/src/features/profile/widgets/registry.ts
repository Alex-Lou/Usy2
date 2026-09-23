import { SPECIES, SPECIES_LABELS } from "../../../app/companion";
import type { WidgetType } from "../types";

// Decorative animated marks, then the chibi animals (reused from the companion set).
export const SVG_DECOR = ["heart", "stars", "sparkle"] as const;
export const SVG_VARIANTS: string[] = [...SVG_DECOR, ...SPECIES];

// Labels for the SVG variant picker (decor marks + the animal labels).
export const SVG_LABELS: Record<string, string> = {
  heart: "Cœur",
  stars: "Étoiles",
  sparkle: "Étincelle",
  ...SPECIES_LABELS,
};

// Human labels for the widget picker (kept here so renderer + editor agree).
export const WIDGET_LABELS: Record<WidgetType, string> = {
  marquee: "Bandeau défilant",
  quote: "Citation",
  richtext: "Texte enrichi",
  mood: "Humeur",
  clock: "Horloge",
  countdown: "Compte à rebours",
  image: "Image",
  svg: "SVG animé",
  pins: "Épingles (accès rapides)",
};
