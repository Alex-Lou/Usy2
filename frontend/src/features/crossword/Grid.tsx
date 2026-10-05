import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
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
  /** Cells lighting up in turn (a word found, the grid won): cell → delay in ms. */
  sweep: Map<number, number>;
  onCell: (cell: number) => void;
}

/**
 * A cell's letter: it pops in when written (it is keyed by its letter and author, so a new one is a
 * new element), a revealed one sparkles; the letters there when the grid opens just show.
 */
function Letter({ letter, revealed, animate }: { letter: string; revealed: boolean; animate: boolean }) {
  const [play] = useState(animate); // decided once, when it appears
  return <span className={play ? (revealed ? "mf-reveal" : "mf-pop") : undefined}>{letter}</span>;
}

/**
 * Where each arrow sits in its clue and how it is drawn: always in a strip on the clue's right,
 * kept free of text (ARROW_ROOM), in the middle for a word going right, in the corner for one
 * going down, so an arrow never sits on a word of the clue.
 */
const ARROWS: Record<Arrow, { at: string; shape: JSX.Element }> = {
  right: { at: "right-0 top-1/2 -translate-y-1/2", shape: <polygon points="3,2 8,5 3,8" /> },
  down: { at: "bottom-0 right-0", shape: <polygon points="2,3 8,3 5,8" /> },
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
    at: "bottom-0 right-0",
    shape: (
      <>
        <path d="M3 1V6H6" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <polygon points="6,3.5 6,8.5 9.5,6" />
      </>
    ),
  },
};

/** The smallest clue text, in pixels: below, it cannot be read. */
const MIN_PX = 6;
/** The arrow's size, and the strip kept for it on the clue's right. */
const ARROW_SIZE = "max(7px, var(--cell) * 0.2)";

/** The height a clue has, as a share of the cell's width (borders aside). */
const roomOf = (half: boolean) => (half ? 0.44 : 0.9);
const lineCount = (half: boolean, size: number) => Math.max(1, Math.floor(roomOf(half) / (size * 1.1)));

/** How many lines {@code text} takes, words wrapped at {@code perLine} letters (0: a word does not fit). */
function linesFor(text: string, perLine: number): number {
  let lines = 1;
  let used = 0;
  for (const word of text.split(" ")) {
    if (word.length > perLine) return 0;
    if (used === 0) used = word.length;
    else if (used + 1 + word.length <= perLine) used += 1 + word.length;
    else {
      lines++;
      used = word.length;
    }
  }
  return lines;
}

/**
 * The biggest size (a share of the cell's width) at which a clue fits whole in its cell, or its half
 * when the cell holds two, and on how many lines: short clues big, long ones smaller, none cut off.
 * A letter is taken as 0.6 size wide (a wide one counts), a line as 1.1 sizes high.
 */
export function clueFit(text: string, half: boolean): { size: number; lines: number } {
  let size = 0.2;
  for (; size > 0.1; size -= 0.005) {
    const lines = lineCount(half, size);
    const needed = linesFor(text, Math.floor(0.68 / (size * 0.6))); // the arrow's strip aside
    if (needed > 0 && needed <= lines) return { size, lines };
  }
  return { size, lines: lineCount(half, size) };
}

/** A clue as printed in its cell, with the arrow showing where its word goes (bent on the edges). */
/** {@code cell}: the cell's size on screen, in pixels (the fit is checked again when it changes, a zoom). */
function ClueText({ clue, half, active, cell }: { clue: Clue; half: boolean; active: boolean; cell: number }) {
  const arrow = ARROWS[arrowOf(clue)];
  const fit = clueFit(clue.text, half);
  const box = useRef<HTMLSpanElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  // The estimate is checked on the real letters: too long or a word too wide (words are never cut),
  // a little smaller until it fits.
  useLayoutEffect(() => {
    const b = box.current;
    const t = text.current;
    if (!b || !t) return;
    const apply = (size: number) => {
      b.style.fontSize = `max(${MIN_PX}px, var(--cell) * ${size.toFixed(3)})`;
      t.style.webkitLineClamp = String(lineCount(half, size));
    };
    let size = fit.size;
    apply(size);
    // Below the smallest readable size, shrinking more changes nothing: the zoom is there for that.
    for (let k = 0; k < 8 && size * cell > MIN_PX && (t.scrollHeight > t.clientHeight + 1 || t.scrollWidth > t.clientWidth + 1); k++) {
      size *= 0.92;
      apply(size);
    }
  }, [fit.size, half, cell]);
  return (
    <span
      ref={box}
      className={
        "relative flex flex-1 items-center justify-center overflow-hidden pl-[2px] text-center font-semibold leading-[1.1] " +
        (active ? "bg-primary/30 text-text" : "text-text-muted")
      }
      style={{ fontSize: `max(${MIN_PX}px, var(--cell) * ${fit.size.toFixed(3)})`, paddingRight: ARROW_SIZE }}
    >
      <span ref={text} className="overflow-hidden" style={{ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: fit.lines }}>
        {clue.text}
      </span>
      <svg
        viewBox="0 0 10 10"
        className={"absolute fill-current text-primary " + arrow.at}
        style={{ width: ARROW_SIZE, height: ARROW_SIZE }}
        aria-hidden="true"
      >
        {arrow.shape}
      </svg>
    </span>
  );
}

/**
 * The grid: clue cells (with their arrows), letter cells, and the empty ones.
 * Sizes follow the grid's width (--cell), set by the window around it (ZoomView).
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
  sweep,
  onCell,
}: Props) {
  // The letters there on opening do not pop; from then on, each new one does.
  const opened = useRef(false);
  useEffect(() => {
    opened.current = true;
  }, []);
  // On opening, the cells come in as a wave from the top left corner.
  const [entering, setEntering] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setEntering(false), 1500);
    return () => window.clearTimeout(t);
  }, []);
  const enter = (cell: number) => (entering ? { animationDelay: `${(Math.floor(cell / width) + (cell % width)) * 35}ms` } : undefined);
  // The cells' size on screen, for the clues to fit their text again after a zoom.
  const box = useRef<HTMLDivElement>(null);
  const [cellPx, setCellPx] = useState(0);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setCellPx(Math.round(el.clientWidth / width));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  return (
    <div ref={box} className="w-full" style={{ containerType: "inline-size" }}>
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
            if (!clues) return <div key={cell} className={"aspect-square bg-bg" + (entering ? " mf-enter" : "")} style={enter(cell)} aria-hidden="true" />;
            return (
              <button
                key={cell}
                type="button"
                onClick={() => onCell(cell)}
                className={"mf-clue-cell flex aspect-square touch-manipulation flex-col divide-y divide-border" + (entering ? " mf-enter" : "")}
                style={enter(cell)}
                aria-label={clues.map((c) => `${c.dir === "right" ? "→" : "↓"} ${c.text}`).join(" ; ")}
              >
                {clues.map((c) => (
                  <ClueText key={c.start} clue={c} half={clues.length > 1} active={activeClue === c} cell={cellPx} />
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
              ? "bg-primary/50"
              : flash.has(cell)
                ? "bg-accent/30"
                : inWord
                  ? "mf-word"
                  : "bg-surface-2";
          const delay = sweep.get(cell);
          const fx = delay !== undefined ? " mf-sweep" : wrong.has(cell) ? " mf-wrong" : entering ? " mf-enter" : isCursor ? " mf-cursor" : "";
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
              className={"grid aspect-square touch-manipulation place-items-center font-display font-bold leading-none transition-colors " + bg + " " + color + fx}
              style={{ fontSize: "calc(var(--cell) * 0.56)", animationDelay: delay !== undefined ? `${delay}ms` : enter(cell)?.animationDelay }}
            >
              {letter && <Letter key={letter + author} letter={letter} revealed={author === "*"} animate={opened.current} />}
            </button>
          );
        })}
      </div>
    </div>
  );
});
