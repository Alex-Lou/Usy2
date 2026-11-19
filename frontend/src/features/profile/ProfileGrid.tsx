import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { skin } from "./partStyle";
import type { PartStyle, Widget, WidgetGap } from "./types";
import { WidgetRenderer } from "./widgets/WidgetRenderer";

export const MAX_CELLS = 4;
/** Space between widgets, per the profile's choice. */
export const GAPS: { id: WidgetGap; label: string; rem: number }[] = [
  { id: "s", label: "Serré", rem: 0.75 },
  { id: "m", label: "Normal", rem: 1.25 },
  { id: "l", label: "Aéré", rem: 2 },
];
const ROW_REM = 6.5; // one grid row

/** Width in cells out of 4: its own, else a marquee spans the row and the rest take half. */
export function widthOf(w: Widget): number {
  return w.w ?? (w.type === "marquee" ? MAX_CELLS : 2);
}

/** Phones show 2 columns: 1 cell stays small, anything wider takes the whole row. */
function spanOf(w: Widget, cols: number): number {
  const width = widthOf(w);
  return cols === MAX_CELLS ? width : width >= 2 ? 2 : 1;
}

function useColumns(): number {
  const query = "(min-width: 640px)";
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setWide(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return wide ? MAX_CELLS : 2;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** While editing: which block is selected, and how blocks move and grow. */
export interface GridEditing {
  selected: number | null;
  onSelect: (index: number) => void;
  onMove: (from: number, to: number) => void;
  onResize: (index: number, size: { w: number; h: number | undefined }) => void;
}

/**
 * The profile's widgets on a grid (4 columns, 2 on phones). Each widget can
 * span 1 to 4 cells each way; nothing overlaps and content is never cut (a row
 * grows if it must). While editing, a tap selects a block, its handle moves it
 * (drop it on another block's place) and its corner resizes it. Each frame
 * wears its look (`styleOf`).
 */
export function ProfileGrid({
  widgets,
  ownerId,
  gap,
  editing,
  styleOf,
}: {
  widgets: Widget[];
  ownerId: number;
  gap: WidgetGap | null | undefined;
  editing?: GridEditing;
  styleOf?: (index: number) => PartStyle;
}) {
  const cols = useColumns();
  const gridRef = useRef<HTMLDivElement>(null);
  const gapRem = GAPS.find((g) => g.id === (gap ?? "m"))!.rem;
  const [moving, setMoving] = useState<{ from: number; over: number } | null>(null);

  return (
    <div
      ref={gridRef}
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridAutoRows: `minmax(${ROW_REM}rem, auto)`,
        gap: `${gapRem}rem`,
      }}
    >
      {widgets.map((w, i) => (
        <Cell
          key={i}
          index={i}
          widget={w}
          ownerId={ownerId}
          span={spanOf(w, cols)}
          cols={cols}
          editing={editing}
          moving={moving}
          setMoving={setMoving}
          gridRef={gridRef}
          gapRem={gapRem}
          look={styleOf?.(i)}
        />
      ))}
    </div>
  );
}

function Cell({
  index,
  widget,
  ownerId,
  span,
  cols,
  editing,
  moving,
  setMoving,
  gridRef,
  gapRem,
  look,
}: {
  index: number;
  widget: Widget;
  ownerId: number;
  span: number;
  cols: number;
  editing?: GridEditing;
  moving: { from: number; over: number } | null;
  setMoving: (m: { from: number; over: number } | null) => void;
  gridRef: React.RefObject<HTMLDivElement>;
  gapRem: number;
  look?: PartStyle;
}) {
  const dressed = look ? skin(look) : null;
  const cellRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const width = widthOf(widget);

  // Widths chosen on a phone: 1 cell stays 1; a full row keeps a desktop width of 2+.
  const toWidth = (cells: number) => (cols === MAX_CELLS ? cells : cells === 1 ? 1 : Math.max(2, width));

  function metrics() {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const gapPx = gapRem * rem;
    const gridW = gridRef.current?.clientWidth ?? 0;
    return { gapPx, cellW: (gridW - gapPx * (cols - 1)) / cols, rowPx: ROW_REM * rem };
  }

  // The corner: drag to resize.
  function down(e: RPointerEvent<HTMLButtonElement>) {
    const rect = cellRef.current?.getBoundingClientRect();
    if (!rect) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, width: rect.width, height: rect.height };
  }
  function move(e: RPointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d || !editing) return;
    const { gapPx, cellW, rowPx } = metrics();
    const cells = clamp(Math.round((d.width + e.clientX - d.x + gapPx) / (cellW + gapPx)), 1, cols);
    const rows = clamp(Math.round((d.height + e.clientY - d.y + gapPx) / (rowPx + gapPx)), 1, MAX_CELLS);
    const w = toWidth(cells);
    if (w !== width || rows !== widget.h) editing.onResize(index, { w, h: rows });
  }

  // The handle: drag onto another block's place to move this one there.
  function overAt(x: number, y: number): number | null {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-cell]");
    return el && gridRef.current?.contains(el) ? Number(el.dataset.cell) : null;
  }
  function grab(e: RPointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setMoving({ from: index, over: index });
  }
  function carry(e: RPointerEvent<HTMLButtonElement>) {
    if (moving?.from !== index) return;
    const over = overAt(e.clientX, e.clientY);
    if (over !== null && over !== moving.over) setMoving({ from: index, over });
  }
  function drop() {
    if (moving && moving.from === index && moving.over !== index) editing?.onMove(index, moving.over);
    setMoving(null);
  }

  const selected = editing?.selected === index;
  const target = moving && moving.over === index && moving.from !== index;
  return (
    <div
      ref={cellRef}
      data-cell={index}
      className={
        "relative flex min-w-0 scroll-mt-32 flex-col " +
        (editing ? "cursor-pointer rounded-token outline outline-2 outline-offset-2 " + (selected ? "outline-primary" : target ? "outline-primary/70" : "outline-border") : "") +
        (moving?.from === index ? " opacity-50" : "")
      }
      style={{ gridColumn: `span ${span}`, gridRow: widget.h ? `span ${widget.h}` : undefined }}
      onClick={editing ? () => editing.onSelect(index) : undefined}
      role={editing ? "button" : undefined}
      tabIndex={editing ? 0 : undefined}
      aria-pressed={editing ? selected : undefined}
      onKeyDown={editing ? (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), editing.onSelect(index)) : undefined}
    >
      <div
        className={`min-h-0 flex-1 [&>*]:h-full ${editing ? "pointer-events-none select-none" : ""} ${dressed?.className ?? ""}`}
        style={dressed?.style}
      >
        <WidgetRenderer widget={widget} ownerId={ownerId} />
      </div>
      {editing && (
        <>
          <button
            type="button"
            aria-label="Glisser pour déplacer"
            title="Glisser pour déplacer"
            onPointerDown={grab}
            onPointerMove={carry}
            onPointerUp={drop}
            onPointerCancel={() => setMoving(null)}
            onClick={(e) => e.stopPropagation()}
            className="absolute right-1.5 top-1.5 grid h-8 w-8 touch-none place-items-center rounded-full bg-bg/80 text-text shadow-card backdrop-blur"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3v18M3 12h18M8 7l4-4 4 4M8 17l4 4 4-4M7 8l-4 4 4 4M17 8l4 4-4 4" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Tirer pour agrandir"
            title="Tirer pour agrandir"
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
            onClick={(e) => e.stopPropagation()}
            className="absolute -bottom-2 -right-2 grid h-8 w-8 touch-none place-items-center rounded-full bg-primary text-primary-foreground shadow-card"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M14 6v8H6M14 14 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}
