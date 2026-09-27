import { createContext, useContext } from "react";

/** 🎨 Moka's fur: the main colour, the far side (a touch darker), the belly and the stripes. */
export interface Coat {
  fur: string;
  furFar: string;
  belly: string;
  stripe: string;
}

/** Moka's own cream coat (no coat worn). */
export const MOKA: Coat = { fur: "#fff4e6", furFar: "#f1e0cb", belly: "#fffaf3", stripe: "#ecc9a0" };

/** The coats of the shop (ids match PetCatalog.java, slot "coat"). */
export const COATS: Record<string, Coat> = {
  "pelage-roux": { fur: "#f8bd7c", furFar: "#eaa560", belly: "#fde6c9", stripe: "#dc8a3f" },
  "pelage-noir": { fur: "#46414c", furFar: "#37333d", belly: "#5d5866", stripe: "#2f2b34" },
  "pelage-gris": { fur: "#cfd3dc", furFar: "#bbc0cb", belly: "#eef0f4", stripe: "#a4a9b7" },
  "pelage-choco": { fur: "#a57455", furFar: "#8f6245", belly: "#dcbfa3", stripe: "#7d5236" },
  "pelage-creme": { fur: "#f6e7d1", furFar: "#e9d7bb", belly: "#fff7ea", stripe: "#8e6b57" },
  "pelage-neige": { fur: "#ffffff", furFar: "#eef1f6", belly: "#ffffff", stripe: "#e3e7ef" },
  "pelage-lavande": { fur: "#dccbf6", furFar: "#cab5ef", belly: "#f3ecff", stripe: "#b49ce7" },
};

/** The coat among what Moka wears (Moka's own when none). */
export function coatOf(wearing: string[]): Coat {
  const id = wearing.find((w) => w in COATS);
  return id ? COATS[id] : MOKA;
}

export const CoatContext = createContext<Coat>(MOKA);
export const useCoat = () => useContext(CoatContext);
