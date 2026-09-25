import { useEffect, useState } from "react";
import { Icon } from "../../components/ui/Icon";
import { ApiError } from "../../lib/api/client";
import { emitMyThemeSaved } from "./AppFonts";
import { getMyProfile, updateGlass } from "./api";
import type { Glass } from "./types";

const CHOICES: { id: Glass; label: string }[] = [
  { id: "off", label: "Désactivé" },
  { id: "light", label: "Léger" },
  { id: "medium", label: "Moyen" },
  { id: "strong", label: "Fort" },
];

/**
 * "Pour toi": how see-through the cards get over a background (the common
 * one, or a profile's). Saved at once, on every device, for me only.
 */
export function GlassSetting() {
  const [glass, setGlass] = useState<Glass | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyProfile().then((p) => setGlass(p.theme.glass ?? "medium")).catch(() => {});
  }, []);

  async function choose(next: Glass) {
    const before = glass;
    setGlass(next);
    setError(null);
    try {
      const saved = await updateGlass(next === "medium" ? null : next);
      emitMyThemeSaved(saved.theme); // applies right away
    } catch (e) {
      setGlass(before);
      setError(e instanceof ApiError ? e.message : "Enregistrement impossible.");
    }
  }

  return (
    <section className="card flex flex-col gap-3 p-4" aria-label="Verre dépoli">
      <div>
        <h2 className="flex items-center gap-2 font-semibold"><Icon name="sparkles" size={18} /> Pour toi : verre dépoli</h2>
        <p className="text-xs text-text-muted">
          Quand un fond est choisi (celui de l'app ou celui d'un profil), les cartes deviennent translucides et floutées pour le laisser voir. Seulement sur ton écran.
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Intensité du verre">
        {CHOICES.map((c) => (
          <button
            key={c.id}
            type="button"
            disabled={glass === null}
            aria-pressed={glass === c.id}
            onClick={() => choose(c.id)}
            className={"chip press text-sm " + (glass === c.id ? "border-primary font-semibold text-primary" : "text-text-muted hover:border-primary/50")}
          >
            {c.label}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    </section>
  );
}
