import { memo } from "react";
import type { Clue } from "./api";
import { arrowOf, BLOCK, type Arrow } from "./logic";

interface Props {
  width: number;
  solution: string;
  letters: string;
  authors: string;
  myMark: string;
  clueCells: Map<number, Clue[]>;
  /** The selected word's cells, and the cursor. */
  wordCells: Set<number>;
  cursor: number;
  activeClue: Clue | null;
  wrong: Set<number>;
  flash: Set<number>;
  onCell: (cell: number) => void;
}

/** Where each arrow sits in its clue (the side its word is on) and how it is drawn. */
const ARROWS: Record<Arrow, { at: string; shape: JSX.Element }> = {
  right: { at: "right-0 top-1/2 -translate-y-1/2", shape: <polygon points="3,2 8,5 3,8" /> },
  down: { at: "bottom-0 left-1/2 -translate-x-1/2", shape: <polygon points="2,3 8,3 5,8" /> },
  rightThenDown: {
    at: "right-0 top-1/2 -translate-y-1/2",
    shape: (
      <>
        <path d="M1 3H6V6" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <polygon points="3.5,6 8.5,6 6,9.5" />
      </>
    ),
  },
  downThenRight: {
    at: "bottom-0 left-1/2 -translate-x-1/2",
    shape: (
      <>
        <path d="M3 1V6H6" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <polygon points="6,3.5 6,8.5 9.5,6" />
      </>
    ),
  },
};

/** A clue as printed in its cell, with the arrow showing where its word goes (bent on the edges). */
function ClueText({ clue, half, active }: { clue: Clue; half: boolean; active: boolean }) {
  const arrow = ARROWS[arrowOf(clue)];
  return (
    <span
      className={
        "relative flex flex-1 items-center justify-center overflow-hidden px-[2px] text-center font-semibold leading-[1.05] " +
        (active ? "bg-primary/30 text-text" : "text-text-muted")
      }
      style={{ fontSize: "max(6.5px, var(--cell) * 0.17)" }}
    >
      <span className={half ? "line-clamp-2" : "line-clamp-4"}>{clue.text}</span>
      <svg
        viewBox="0 0 10 10"
        className={"absolute fill-current text-primary " + arrow.at}
        style={{ width: "max(7px, var(--cell) * 0.2)", height: "max(7px, var(--cell) * 0.2)" }}
        aria-hidden="true"
      >
        {arrow.shape}
      </svg>
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
            // A cell with no clue only happens in grids made before every cell was used.
            if (!clues) return <div key={cell} className="aspect-square bg-bg" aria-hidden="true" />;
            return (
              <button
                key={cell}
                type="button"
                onClick={() => onCell(cell)}
                className="flex aspect-square touch-manipulation flex-col divide-y divide-border bg-primary/15"
                aria-label={clues.map((c) => `${c.dir === "right" ? "→" : "↓"} ${c.text}`).join(" ; ")}
              >
                {clues.map((c) => (
                  <ClueText key={c.start} clue={c} half={clues.length > 1} active={activeClue === c} />
                ))}
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
