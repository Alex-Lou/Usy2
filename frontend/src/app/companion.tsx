import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

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
};

const KEY = "memocat.companion";

function readInitial(): Species {
  try {
    const v = localStorage.getItem(KEY) as Species | null;
    if (v && SPECIES.includes(v)) return v;
  } catch {
    /* ignore */
  }
  return "cat";
}

interface CompanionValue {
  companion: Species;
  setCompanion: (s: Species) => void;
}

const CompanionContext = createContext<CompanionValue | null>(null);

export function CompanionProvider({ children }: { children: ReactNode }) {
  const [companion, setCompanionState] = useState<Species>(readInitial);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, companion);
    } catch {
      /* ignore */
    }
  }, [companion]);

  const setCompanion = useCallback((s: Species) => setCompanionState(s), []);
  const value = useMemo(() => ({ companion, setCompanion }), [companion, setCompanion]);
  return <CompanionContext.Provider value={value}>{children}</CompanionContext.Provider>;
}

export function useCompanion(): CompanionValue {
  const ctx = useContext(CompanionContext);
  if (!ctx) throw new Error("useCompanion must be used within CompanionProvider");
  return ctx;
}
