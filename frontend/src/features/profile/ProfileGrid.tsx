import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import type { Widget, WidgetGap } from "./types";
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

/**
 * The profile's widgets on a grid (4 columns, 2 on phones). Each widget can
 * span 1 to 4 cells each way; nothing overlaps and content is never cut (a row
 * grows if it must). While arranging, a handle in each corner resizes it.
 */
export function ProfileGrid({
  widgets,
  ownerId,
  gap,
  arranging = false,
  onResize,
}: {
  widgets: Widget[];
  ownerId: number;
  gap: WidgetGap | null | undefined;
  arranging?: boolean;
  onResize?: (index: number, size: { w: number; h: number | undefined }) => void;
}) {
  const cols = useColumns();
  const gridRef = useRef<HTMLDivElement>(null);
  const gapRem = GAPS.find((g) => g.id === (gap ?? "m"))!.rem;

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
          widget={w}
          ownerId={ownerId}
          span={spanOf(w, cols)}
          cols={cols}
          arranging={arranging}
          gridRef={gridRef}
          gapRem={gapRem}
          onResize={(size) => onResize?.(i, size)}
        />
      ))}
    </div>
  );
}

function Cell({
  widget,
  ownerId,
  span,
  cols,
  arranging,
  gridRef,
  gapRem,
  onResize,
}: {
  widget: Widget;
  ownerId: number;
  span: number;
  cols: number;
  arranging: boolean;
  gridRef: React.RefObject<HTMLDivElement>;
  gapRem: number;
  onResize: (size: { w: number; h: number | undefined }) => void;
}) {
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

  function down(e: RPointerEvent<HTMLButtonElement>) {
    const rect = cellRef.current?.getBoundingClientRect();
    if (!rect) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, width: rect.width, height: rect.height };
  }

  function move(e: RPointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d) return;
    const { gapPx, cellW, rowPx } = metrics();
    const cells = clamp(Math.round((d.width + e.clientX - d.x + gapPx) / (cellW + gapPx)), 1, cols);
    const rows = clamp(Math.round((d.height + e.clientY - d.y + gapPx) / (rowPx + gapPx)), 1, MAX_CELLS);
    const w = toWidth(cells);
    if (w !== width || rows !== widget.h) onResize({ w, h: rows });
  }

  const step = (dw: number, dh: number) => {
    const h = widget.h ?? 1;
    onResize({ w: clamp(width + dw, 1, MAX_CELLS), h: dh === 0 ? widget.h : clamp(h + dh, 1, MAX_CELLS) });
  };
  const small = "grid h-7 min-w-7 place-items-center rounded-full border border-border px-1.5 text-xs font-bold text-text press hover:text-primary disabled:opacity-30";

  return (
    <div
      ref={cellRef}
      className={`relative flex min-w-0 flex-col ${arranging ? "rounded-token outline-dashed outline-2 outline-offset-2 outline-primary/60" : ""}`}
      style={{ gridColumn: `span ${span}`, gridRow: widget.h ? `span ${widget.h}` : undefined }}
    >
      <div className={`min-h-0 flex-1 [&>*]:h-full ${arranging ? "pointer-events-none select-none" : ""}`}>
        <WidgetRenderer widget={widget} ownerId={ownerId} />
      </div>
      {arranging && (
        <>
          <div className="absolute inset-x-1 top-1 z-10 flex flex-wrap items-center gap-1 rounded-2xl bg-surface/95 p-1 shadow-card backdrop-blur">
            <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground tabular-nums">
              {width}×{widget.h ?? "auto"}
            </span>
            <button type="button" className={small} onClick={() => step(-1, 0)} disabled={width <= 1} aria-label="Moins large">↔−</button>
            <button type="button" className={small} onClick={() => step(1, 0)} disabled={width >= MAX_CELLS} aria-label="Plus large">↔+</button>
            <button type="button" className={small} onClick={() => step(0, -1)} disabled={(widget.h ?? 1) <= 1 && widget.h !== undefined} aria-label="Moins haut">↕−</button>
            <button type="button" className={small} onClick={() => step(0, 1)} disabled={(widget.h ?? 0) >= MAX_CELLS} aria-label="Plus haut">↕+</button>
            {widget.h !== undefined && (
              <button type="button" className={small} onClick={() => onResize({ w: width, h: undefined })} aria-label="Hauteur automatique">auto</button>
            )}
          </div>
          <button
            type="button"
            aria-label="Tirer pour redimensionner"
            title="Tirer pour redimensionner"
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
            className="absolute -bottom-2 -right-2 grid h-9 w-9 touch-none place-items-center rounded-full btn-brand shadow-card"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M14 6v8H6M14 14 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}
