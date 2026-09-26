import { useCallback } from "react";
import { useAuth } from "../features/auth/useAuth";

export const SPECIES = [
  "cat",
  "dog",
  "wolf",
  "rabbit",
  "lizard",
  "raccoon",
  "capybara",
  "robin",
  "parrot",
  "penguin",
  "otter-plain",
  "otter",
  "siamese",
] as const;

export type Species = (typeof SPECIES)[number];

export const SPECIES_LABELS: Record<Species, string> = {
  cat: "Chat",
  dog: "Chien",
  wolf: "Loup",
  rabbit: "Lapin",
  lizard: "Lézard",
  raccoon: "Raton",
  capybara: "Capybara",
  robin: "Rouge-gorge",
  parrot: "Perroquet",
  penguin: "Pingouin",
  "otter-plain": "Loutre",
  otter: "Loutre au poisson",
  siamese: "Chat siamois",
};

function valid(value: string | null | undefined): Species {
  return value && (SPECIES as readonly string[]).includes(value) ? (value as Species) : "cat";
}

/**
 * The companion animal is now part of the user's identity (stored server-side),
 * so it shows next to the name everywhere and the partner sees it too. Reads
 * from the authenticated user; changes persist optimistically via auth.
 */
export function useCompanion(): { companion: Species; setCompanion: (s: Species) => void } {
  const { user, updateCompanion } = useAuth();
  const companion = valid(user?.companion);
  const setCompanion = useCallback((s: Species) => updateCompanion(s), [updateCompanion]);
  return { companion, setCompanion };
}
