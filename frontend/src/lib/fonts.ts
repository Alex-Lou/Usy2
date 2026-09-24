import { useEffect } from "react";
import type { FontKey } from "../features/profile/types";

interface FontDef {
  label: string;
  /** CSS font stack; null = keep the app's own font. */
  stack: string | null;
  /** Google Fonts css2 "family" parameter, for fonts not installed on devices. */
  google?: string;
}

/** Every font a profile may use (the server allowlists the same keys). */
export const FONTS: Record<FontKey, FontDef> = {
  app: { label: "Police de l'app", stack: null },
  trebuchet: { label: "Trebuchet", stack: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif' },
  georgia: { label: "Georgia", stack: 'Georgia, "Times New Roman", serif' },
  courier: { label: "Courier", stack: '"Courier New", Courier, monospace' },
  comic: { label: "Comic Sans", stack: '"Comic Sans MS", "Comic Sans", cursive' },
  system: { label: "Système", stack: "system-ui, sans-serif" },

  nunito: { label: "Nunito", stack: '"Nunito", system-ui, sans-serif', google: "Nunito:wght@400;700" },
  quicksand: { label: "Quicksand", stack: '"Quicksand", system-ui, sans-serif', google: "Quicksand:wght@400;700" },
  comfortaa: { label: "Comfortaa", stack: '"Comfortaa", system-ui, sans-serif', google: "Comfortaa:wght@400;700" },
  baloo: { label: "Baloo", stack: '"Baloo 2", system-ui, sans-serif', google: "Baloo+2:wght@400;700" },
  fredoka: { label: "Fredoka", stack: '"Fredoka", system-ui, sans-serif', google: "Fredoka:wght@400;700" },

  dancing: { label: "Dancing Script", stack: '"Dancing Script", cursive', google: "Dancing+Script:wght@400;700" },
  pacifico: { label: "Pacifico", stack: '"Pacifico", cursive', google: "Pacifico" },
  satisfy: { label: "Satisfy", stack: '"Satisfy", cursive', google: "Satisfy" },
  indie: { label: "Indie Flower", stack: '"Indie Flower", cursive', google: "Indie+Flower" },
  patrick: { label: "Patrick Hand", stack: '"Patrick Hand", cursive', google: "Patrick+Hand" },
  caveat: { label: "Caveat", stack: '"Caveat", cursive', google: "Caveat:wght@400;700" },

  uncial: { label: "Uncial Antiqua", stack: '"Uncial Antiqua", serif', google: "Uncial+Antiqua" },
  medieval: { label: "MedievalSharp", stack: '"MedievalSharp", serif', google: "MedievalSharp" },
  cinzel: { label: "Cinzel Decorative", stack: '"Cinzel Decorative", serif', google: "Cinzel+Decorative:wght@400;700" },
  almendra: { label: "Almendra", stack: '"Almendra", serif', google: "Almendra:wght@400;700" },
  imfell: { label: "IM Fell English", stack: '"IM Fell English", serif', google: "IM+Fell+English" },

  playfair: { label: "Playfair Display", stack: '"Playfair Display", Georgia, serif', google: "Playfair+Display:wght@400;700" },
  lora: { label: "Lora", stack: '"Lora", Georgia, serif', google: "Lora:wght@400;700" },
  cormorant: { label: "Cormorant Garamond", stack: '"Cormorant Garamond", Georgia, serif', google: "Cormorant+Garamond:wght@400;700" },
  garamond: { label: "EB Garamond", stack: '"EB Garamond", Georgia, serif', google: "EB+Garamond:wght@400;700" },
};

/** The picker's groups, in order. */
export const FONT_GROUPS: { label: string; keys: FontKey[] }[] = [
  { label: "Classiques", keys: ["app", "trebuchet", "georgia", "courier", "comic", "system"] },
  { label: "Arrondies", keys: ["nunito", "quicksand", "comfortaa", "baloo", "fredoka"] },
  { label: "Manuscrites", keys: ["dancing", "pacifico", "satisfy", "indie", "patrick", "caveat"] },
  { label: "Celtiques & féeriques", keys: ["uncial", "medieval", "cinzel", "almendra", "imfell"] },
  { label: "Serif élégantes", keys: ["playfair", "lora", "cormorant", "garamond"] },
];

const loaded = new Set<string>();

/**
 * Loads one web font from Google Fonts, once, and only when it is actually
 * used. Keys come from the fixed list above, never from user text.
 */
export function loadFont(key: FontKey | null | undefined): void {
  const google = key ? FONTS[key]?.google : undefined;
  if (!google || loaded.has(google) || typeof document === "undefined") return;
  loaded.add(google);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${google}&display=swap`;
  document.head.appendChild(link);
}

/** The font stack for a key, or null when the app's own font should stay. */
export function fontStack(key: FontKey | null | undefined): string | null {
  return key ? FONTS[key]?.stack ?? null : null;
}

/** Loads the given fonts once they are shown (effect, not during render). */
export function useFonts(...keys: (FontKey | null | undefined)[]): void {
  const signature = keys.join("|");
  useEffect(() => keys.forEach(loadFont), [signature]);
}
