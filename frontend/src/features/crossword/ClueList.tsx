import { memo, useEffect, useRef } from "react";
import type { Clue, Dir } from "./api";
import { cellsOf } from "./logic";

/**
 * The clues of one direction, as a list beside the grid (a tablet held sideways, see
 * crossword.css): the word being written stands out and stays in view, a word filled fades,
 * a touch goes to the word.
 */
export const ClueList = memo(function ClueList({
  dir,
  clues,
  width,
  letters,
  active,
  onPick,
}: {
  dir: Dir;
  /** In reading order. */
  clues: Clue[];
  width: number;
  letters: string;
  active: Clue | null;
  onPick: (clue: Clue) => void;
}) {
  const list = useRef<HTMLOListElement>(null);
  const activeIndex = active ? clues.indexOf(active) : -1;
  useEffect(() => {
    if (activeIndex < 0) return;
    list.current?.children[activeIndex]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIndex]);
  return (
    <section className="mf-list min-h-0 flex-col rounded-token border border-border bg-surface p-2 shadow-card" aria-label={dir === "right" ? "Mots horizontaux" : "Mots verticaux"}>
      <h2 className="shrink-0 px-1 pb-1 font-display text-sm font-bold text-text-muted">
        {dir === "right" ? "→ Horizontalement" : "↓ Verticalement"}
      </h2>
      <ol ref={list} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {clues.map((c) => {
          const isActive = c === active;
          const filled = cellsOf(c, width).every((i) => letters[i] !== ".");
          return (
            <li key={c.start}>
              <button
                type="button"
                onClick={() => onPick(c)}
                className={
                  "w-full rounded-token-sm px-2 py-1.5 text-left text-sm leading-snug transition-colors " +
                  (isActive ? "mf-word font-semibold text-text" : filled ? "text-text-muted opacity-50" : "text-text hover:bg-surface-2")
                }
              >
                {c.text} <span className="text-xs text-text-muted">({c.length})</span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
});
