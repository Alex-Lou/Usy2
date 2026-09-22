import { SPECIES, SPECIES_LABELS, useCompanion } from "../../app/companion";
import { Animal } from "./animals";

// Lets the couple choose their companion animal (persisted). Default: cat.
export function CompanionPicker({ compact = false }: { compact?: boolean }) {
  const { companion, setCompanion } = useCompanion();
  const size = compact ? 30 : 40;
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
      {SPECIES.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => setCompanion(s)}
          title={SPECIES_LABELS[s]}
          aria-pressed={companion === s}
          className={
            "shrink-0 rounded-full border p-1 press transition " +
            (companion === s
              ? "border-primary bg-primary/15 shadow-glow"
              : "border-border bg-surface-2 hover:border-primary/40")
          }
        >
          <Animal species={s} size={size} />
          <span className="sr-only">{SPECIES_LABELS[s]}</span>
        </button>
      ))}
    </div>
  );
}
