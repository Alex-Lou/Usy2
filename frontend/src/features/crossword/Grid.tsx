import { memo } from "react";
import type { Clue, Dir } from "./api";
import { BLOCK } from "./logic";

interface Props {
  width: number;
  solution: string;
  letters: string;
  authors: string;
  myMark: string;
  clueCells: Map<number, Partial<Record<Dir, Clue>>>;
  /** The selected word's cells, and the cursor. */
  wordCells: Set<number>;
  cursor: number;
  activeClue: Clue | null;
  wrong: Set<number>;
  flash: Set<number>;
  onCell: (cell: number) => void;
}

/** A clue as printed in its cell, with the arrow showing where its word goes. */
function ClueText({ clue, half, active }: { clue: Clue; half: boolean; active: boolean }) {
  return (
    <span
      className={
        "relative flex flex-1 items-center justify-center overflow-hidden px-[2px] text-center font-semibold leading-[1.05] " +
        (active ? "bg-primary/30 text-text" : "text-text-muted")
      }
      style={{ fontSize: "max(6.5px, var(--cell) * 0.17)" }}
    >
      <span className={half ? "line-clamp-2" : "line-clamp-4"}>{clue.text}</span>
      <span
        className={"absolute text-primary " + (clue.dir === "right" ? "right-0 top-1/2 -translate-y-1/2" : "bottom-0 left-1/2 -translate-x-1/2 leading-none")}
        style={{ fontSize: "max(7px, var(--cell) * 0.2)" }}
        aria-hidden="true"
      >
        {clue.dir === "right" ? "▸" : "▾"}
      </span>
    </span>
  );
}

/**
 * The grid: clue cells (with their arrows), letter cells, and the empty ones.
 * Sizes follow the grid's width (--cell), from a phone to a computer.
 */
export const Grid = memo(function Grid({
  width,
  solution,
  letters,
  authors,
  myMark,
  clueCells,
  wordCells,
  cursor,
  activeClue,
  wrong,
  flash,
  onCell,
}: Props) {
  return (
    <div className="mx-auto w-full" style={{ maxWidth: `${width * 52}px`, containerType: "inline-size" }}>
      <div
        className="grid select-none gap-px overflow-hidden rounded-token border border-border bg-border"
        style={{ gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`, ["--cell" as string]: `calc(100cqw / ${width})` }}
        role="grid"
        aria-label="Grille de mots fléchés"
      >
        {Array.from(solution, (expected, cell) => {
          const clues = clueCells.get(cell);
          if (expected === BLOCK) {
            if (!clues) return <div key={cell} className="aspect-square bg-bg" aria-hidden="true" />;
            const both = Boolean(clues.right && clues.down);
            return (
              <button
                key={cell}
                type="button"
                onClick={() => onCell(cell)}
                className="flex aspect-square touch-manipulation flex-col divide-y divide-border bg-primary/15"
                aria-label={[clues.right && `→ ${clues.right.text}`, clues.down && `↓ ${clues.down.text}`].filter(Boolean).join(" ; ")}
              >
                {clues.right && <ClueText clue={clues.right} half={both} active={activeClue === clues.right} />}
                {clues.down && <ClueText clue={clues.down} half={both} active={activeClue === clues.down} />}
              </button>
            );
          }
          const letter = letters[cell] === "." ? "" : letters[cell];
          const author = authors[cell];
          const isCursor = cell === cursor;
          const inWord = wordCells.has(cell);
          const bg = wrong.has(cell)
            ? "bg-danger/20"
            : isCursor
              ? "bg-primary/35"
              : flash.has(cell)
                ? "bg-accent/30"
                : inWord
                  ? "bg-primary/20"
                  : "bg-surface-2";
          const color = wrong.has(cell)
            ? "text-danger"
            : author === "*"
              ? "text-text-muted italic"
              : author !== "." && author !== myMark
                ? "text-primary"
                : "text-text";
          return (
            <button
              key={cell}
              type="button"
              onClick={() => onCell(cell)}
              aria-label={`Case ${Math.floor(cell / width) + 1}-${(cell % width) + 1}${letter ? ` : ${letter}` : ""}`}
              className={"grid aspect-square touch-manipulation place-items-center font-display font-bold leading-none transition-colors " + bg + " " + color}
              style={{ fontSize: "calc(var(--cell) * 0.56)" }}
            >
              {letter}
            </button>
          );
        })}
      </div>
    </div>
  );
});
