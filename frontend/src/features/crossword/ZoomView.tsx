import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent,
  type TouchList,
} from "react";
import type { Size } from "./api";

/** The 🔍 button's steps; a pinch goes anywhere between 1× and MAX. */
const STEPS = [1, 1.6, 2.2];
/** A medium or big grid opens zoomed for cells about this big, if they are under SMALL_CELL at 1× (a phone; a tablet's fit). */
const COMFORT_CELL = 58;
const SMALL_CELL = 46;
/**
 * A touch screen held sideways: the grid (taller than wide) would sit small in the middle, the
 * height its limit; it opens wider, cells about this big as far as the width goes, and scrolls
 * down with the word.
 */
const SIDEWAYS_CELL = 88;
const MAX = 3;
/** Cells never grow past this at 1×: on a computer screen, and on a touch one (a tablet: big, for the fingers). */
const MAX_CELL = 52;
const MAX_TOUCH_CELL = 110;
/** Room kept around the word in view when the grid follows it. */
const MARGIN = 12;

/** The zoom is kept per size, and per way the screen is held (upright, sideways). */
type ZoomKey = Size | `${Size}.couche`;
const storeKey = (key: ZoomKey) => `memocat.crossword.zoom.${key}`;

function savedZoom(size: ZoomKey): number | null {
  try {
    const z = Number(localStorage.getItem(storeKey(size)));
    return z >= 1 && z <= MAX ? z : null;
  } catch {
    return null;
  }
}

function saveZoom(size: ZoomKey, zoom: number): void {
  try {
    localStorage.setItem(storeKey(size), String(Math.round(zoom * 100) / 100));
  } catch {
    // private window: just for this visit
  }
}

const clamp = (z: number) => Math.min(MAX, Math.max(1, z));

/** The 🔍 button: the next step up, then back to 1×. */
export const nextZoom = (z: number) => STEPS.find((s) => s > z + 0.15) ?? 1;

/** How to say a zoom (« 1,6× »). */
export const zoomLabel = (z: number) =>
  `${(Math.round(z * 10) / 10).toLocaleString("fr-FR")}×`;

/** The screen held sideways (wider than tall), followed as it turns. */
export function useSideways(): boolean {
  const query = "(orientation: landscape)";
  const [sideways, setSideways] = useState(() => window.matchMedia?.(query).matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const change = () => setSideways(mq.matches);
    mq.addEventListener("change", change);
    return () => mq.removeEventListener("change", change);
  }, []);
  return sideways;
}

/**
 * The grid's zoom, remembered per size and way the screen is held on this device once chosen;
 * null until the grid's window is measured (it then picks one, not remembered).
 */
export function useZoom(
  gridSize: Size,
  sideways: boolean,
): [number | null, (z: number) => void, (z: number) => void] {
  const size: ZoomKey = sideways ? `${gridSize}.couche` : gridSize;
  const [state, setState] = useState(() => ({ size, zoom: savedZoom(size) }));
  // The grid's size known (or changed): its own zoom.
  if (state.size !== size) setState({ size, zoom: savedZoom(size) });
  const choose = useCallback(
    (z: number) => {
      setState({ size, zoom: z });
      saveZoom(size, z);
    },
    [size],
  );
  const suggest = useCallback(
    (z: number) => setState({ size, zoom: z }),
    [size],
  );
  return [state.size === size ? state.zoom : savedZoom(size), choose, suggest];
}

/**
 * The grid in a window of its own: a pinch (or 🔍, see useZoom) zooms the grid only — the keyboard
 * below stays as it is — a finger moves it around, and it follows the word being written.
 * `focus`: the cells to keep in view (the clue, then the word; keep it memoized), `cursor` alone if
 * the word does not fit.
 */
export function ZoomView({
  cols,
  rows,
  size,
  zoom,
  onZoom,
  onDefaultZoom,
  focus,
  cursor,
  children,
}: {
  cols: number;
  rows: number;
  size: Size;
  zoom: number | null;
  /** A pinch: the zoom chosen. */
  onZoom: (z: number) => void;
  /** No zoom chosen yet: the one the window suggests. */
  onDefaultZoom: (z: number) => void;
  focus: number[];
  cursor: number;
  children: ReactNode;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);

  // The window's size: the grid fits it whole at 1×.
  useLayoutEffect(() => {
    const vp = viewport.current;
    if (!vp) return;
    const measure = () => setBox({ w: vp.clientWidth, h: vp.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(vp);
    return () => ro.disconnect();
  }, []);

  const touch = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const sideways = useSideways();
  const fit = box ? Math.min(box.w, (box.h * cols) / rows, cols * (touch ? MAX_TOUCH_CELL : MAX_CELL)) : 0;
  // No zoom chosen yet for this size: a medium or big grid too small to read opens zoomed.
  useEffect(() => {
    if (zoom !== null || fit <= 0) return;
    const cell = fit / cols;
    // A mouse scrolls and zooms as it likes: only a touch screen opens zoomed.
    if (touch && sideways && box) {
      const wide = Math.min(box.w / fit, SIDEWAYS_CELL / cell);
      onDefaultZoom(wide < 1.1 ? 1 : clamp(Math.floor(wide * 10) / 10));
      return;
    }
    onDefaultZoom(
      !touch || size === "petite" || cell >= SMALL_CELL
        ? 1
        : clamp(Math.round((COMFORT_CELL / cell) * 10) / 10),
    );
  }, [zoom, fit, cols, size, onDefaultZoom, touch, sideways, box]);
  const z = zoom ?? 1;

  // Keeps the word in view (the cursor's cell if the word is wider than the window).
  const follow = useCallback(
    (smooth: boolean) => {
      const vp = viewport.current;
      const cells = vp?.querySelector("[role=grid]")?.children;
      if (!vp || !cells || focus.length === 0) return;
      const at = vp.getBoundingClientRect();
      const rect = (list: number[]) => {
        let l = Infinity,
          t = Infinity,
          r = -Infinity,
          b = -Infinity;
        for (const c of list) {
          const el = cells[c] as HTMLElement | undefined;
          if (!el) continue;
          const cr = el.getBoundingClientRect();
          l = Math.min(l, cr.left);
          t = Math.min(t, cr.top);
          r = Math.max(r, cr.right);
          b = Math.max(b, cr.bottom);
        }
        return { l: l - at.left, t: t - at.top, r: r - at.left, b: b - at.top };
      };
      let want = rect(focus);
      if (
        want.r - want.l > vp.clientWidth - 2 * MARGIN ||
        want.b - want.t > vp.clientHeight - 2 * MARGIN
      ) {
        want = rect(cursor >= 0 ? [cursor] : focus.slice(0, 1));
      }
      const dx =
        want.l < MARGIN
          ? want.l - MARGIN
          : want.r > vp.clientWidth - MARGIN
            ? want.r - vp.clientWidth + MARGIN
            : 0;
      const dy =
        want.t < MARGIN
          ? want.t - MARGIN
          : want.b > vp.clientHeight - MARGIN
            ? want.b - vp.clientHeight + MARGIN
            : 0;
      if (dx || dy)
        vp.scrollBy({
          left: dx,
          top: dy,
          behavior: smooth ? "smooth" : "auto",
        });
    },
    [focus, cursor],
  );
  useEffect(() => follow(true), [follow]);

  // After a zoom: the point under the fingers stays put (a pinch), or the word comes back in view.
  const anchor = useRef<{
    x: number;
    y: number;
    cx: number;
    cy: number;
    from: number;
  } | null>(null);
  const followRef = useRef(follow);
  followRef.current = follow;
  useLayoutEffect(() => {
    const vp = viewport.current;
    const a = anchor.current;
    anchor.current = null;
    if (!vp) return;
    if (!a) {
      followRef.current(false);
      return;
    }
    vp.scrollLeft = (a.x * z) / a.from - a.cx;
    vp.scrollTop = (a.y * z) / a.from - a.cy;
  }, [z, fit]);

  // Two fingers: the grid's own pinch (the page itself does not zoom: touch-action below).
  const pinch = useRef<{ dist: number; from: number } | null>(null);
  const spread = (t: TouchList) =>
    Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2)
      pinch.current = { dist: spread(e.touches), from: z };
  };
  const onTouchMove = (e: TouchEvent) => {
    const p = pinch.current;
    const vp = viewport.current;
    if (!p || !vp || e.touches.length !== 2) return;
    const at = vp.getBoundingClientRect();
    const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - at.left;
    const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - at.top;
    const next = clamp((p.from * spread(e.touches)) / p.dist);
    if (Math.abs(next - z) <= 0.01) return;
    anchor.current = {
      x: vp.scrollLeft + cx,
      y: vp.scrollTop + cy,
      cx,
      cy,
      from: z,
    };
    onZoom(next);
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (e.touches.length < 2) pinch.current = null;
  };

  return (
    <div className="min-h-0 min-w-0 flex-1">
      <div
        ref={viewport}
        className="flex h-full overflow-auto overscroll-contain rounded-token"
        style={{ touchAction: "pan-x pan-y" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        {/* m-auto: centred while it fits, and nothing cut off once it overflows. */}
        <div
          className="m-auto shrink-0"
          style={{ width: fit * z || undefined }}
        >
          {fit > 0 && children}
        </div>
      </div>
    </div>
  );
}
