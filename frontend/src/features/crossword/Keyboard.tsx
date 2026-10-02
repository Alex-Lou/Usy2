import { Icon } from "../../components/ui/Icon";
import type { Dir } from "./api";

const ROWS = ["AZERTYUIOP", "QSDFGHJKLM", "WXCVBN"];

/** AZERTY keys under the grid (no system keyboard jumping up over it on a phone). */
export function Keyboard({
  dir,
  onLetter,
  onErase,
  onToggleDir,
}: {
  dir: Dir;
  onLetter: (l: string) => void;
  onErase: () => void;
  onToggleDir: () => void;
}) {
  const key = "grid h-10 touch-manipulation place-items-center rounded-token-sm bg-surface-2 text-lg font-semibold text-text shadow-sm press active:bg-primary/25";
  return (
    <div className="grid grid-cols-10 gap-1" aria-label="Clavier">
      {ROWS[0].split("").map((l) => (
        <button key={l} type="button" className={key} onClick={() => onLetter(l)}>
          {l}
        </button>
      ))}
      {ROWS[1].split("").map((l) => (
        <button key={l} type="button" className={key} onClick={() => onLetter(l)}>
          {l}
        </button>
      ))}
      <button type="button" className={key + " col-span-2 text-base"} onClick={onToggleDir} aria-label={dir === "right" ? "Écrire vers le bas" : "Écrire vers la droite"}>
        {dir === "right" ? "→" : "↓"}
      </button>
      {ROWS[2].split("").map((l) => (
        <button key={l} type="button" className={key} onClick={() => onLetter(l)}>
          {l}
        </button>
      ))}
      <button type="button" className={key + " col-span-2"} onClick={onErase} aria-label="Effacer">
        <Icon name="chevronLeft" size={20} />
      </button>
    </div>
  );
}
