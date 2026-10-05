import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Icon } from "../../components/ui/Icon";
import type { Dir } from "./api";

const ROWS = ["AZERTYUIOP", "QSDFGHJKLM", "WXCVBN"];
/** Erase held down: after this pause, it goes on by itself, one letter every REPEAT_MS. */
const HOLD_MS = 380;
const REPEAT_MS = 75;

/**
 * AZERTY keys under the grid (no system keyboard jumping up over it on a phone). A key acts as
 * the finger touches it, not when it leaves: fast typing loses no letter; the letter shows in a
 * bubble above the finger; erase held down goes on erasing. Enter or space on a focused key
 * (a keyboard user) works too.
 */
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
  const [bubble, setBubble] = useState<string | null>(null);
  // The latest erase: the repeat keeps calling it while the grid changes under it.
  const erase = useRef(onErase);
  erase.current = onErase;
  const hold = useRef<{ wait?: number; repeat?: number }>({});
  const stopHold = () => {
    window.clearTimeout(hold.current.wait);
    window.clearInterval(hold.current.repeat);
    hold.current = {};
  };
  useEffect(() => stopHold, []);

  // When the last finger or mouse press was: the click that follows it is not a second press.
  const pressedAt = useRef(0);

  /** Pressed with a finger or the mouse: at once (the click that follows is ignored). */
  const down = (act: () => void, letter?: string) => (e: PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault(); // no focus moving, no text selected
    pressedAt.current = performance.now();
    act();
    if (letter) setBubble(letter);
  };
  /** A click with no press just before it: a key chosen with the keyboard (Enter, space). */
  const keyed = (act: () => void) => () => {
    if (performance.now() - pressedAt.current > 1000) act();
  };
  const up = () => {
    setBubble(null);
    stopHold();
  };

  const key =
    "mf-key relative grid h-10 place-items-center rounded-token-sm bg-surface-2 text-lg font-semibold text-text shadow-sm press active:bg-primary/25 md:h-12 md:text-xl";
  const letterKey = (l: string) => (
    <button
      key={l}
      type="button"
      className={key}
      onPointerDown={down(() => onLetter(l), l)}
      onPointerUp={up}
      onPointerLeave={up}
      onPointerCancel={up}
      onClick={keyed(() => onLetter(l))}
    >
      {l}
      {bubble === l && (
        <span
          className="mf-bubble pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 grid h-12 w-10 place-items-center rounded-token-sm bg-primary text-2xl font-bold text-primary-foreground shadow-card"
          aria-hidden="true"
        >
          {l}
        </span>
      )}
    </button>
  );
  return (
    <div className="mf-keys grid grid-cols-10 gap-1 md:mx-auto md:w-full md:max-w-2xl md:gap-1.5" aria-label="Clavier">
      {ROWS[0].split("").map(letterKey)}
      {ROWS[1].split("").map(letterKey)}
      <button
        type="button"
        className={key + " col-span-2 text-base"}
        onPointerDown={down(onToggleDir)}
        onClick={keyed(onToggleDir)}
        aria-label={dir === "right" ? "Écrire vers le bas" : "Écrire vers la droite"}
      >
        {dir === "right" ? "→" : "↓"}
      </button>
      {ROWS[2].split("").map(letterKey)}
      <button
        type="button"
        className={key + " col-span-2"}
        onPointerDown={down(() => {
          erase.current();
          stopHold();
          hold.current.wait = window.setTimeout(() => {
            hold.current.repeat = window.setInterval(() => erase.current(), REPEAT_MS);
          }, HOLD_MS);
        })}
        onPointerUp={up}
        onPointerLeave={up}
        onPointerCancel={up}
        onClick={keyed(onErase)}
        aria-label="Effacer (maintenir pour effacer en continu)"
      >
        <Icon name="chevronLeft" size={20} />
      </button>
    </div>
  );
}
