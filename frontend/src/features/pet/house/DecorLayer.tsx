import { useRef, type KeyboardEvent, type PointerEvent, type RefObject } from "react";
import { decorUrl } from "./decorAssets";
import type { Placed } from "./houseApi";

/** An object's width at scale 1, in % of the scene's width. */
export const BASE = 13;
export const MIN_S = 0.3;
export const MAX_S = 4.5;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type Gesture =
  | { kind: "move"; i: number; dx: number; dy: number }
  | { kind: "turn"; i: number; d0: number; a0: number; s0: number; r0: number; cx: number; cy: number };

/**
 * 🏡 The objects placed in a scene, drawn from their SVGs. In edit mode each
 * one can be picked and dragged; the picked one gets a handle at its corner
 * that scales and turns it; keys move (arrows), scale (+ −), turn (r) and
 * remove it (Suppr).
 */
export function DecorLayer({ items, labels, editing, selected, onSelect, onChange, onRemove, stageRef }: {
  items: Placed[];
  labels: Record<string, string>;
  editing: boolean;
  selected: number | null;
  onSelect: (i: number | null) => void;
  onChange: (i: number, patch: Partial<Placed>) => void;
  onRemove: (i: number) => void;
  stageRef: RefObject<HTMLDivElement>;
}) {
  const gesture = useRef<Gesture | null>(null);

  const box = () => stageRef.current?.getBoundingClientRect();

  const down = (e: PointerEvent<HTMLElement>, i: number, kind: Gesture["kind"]) => {
    if (!editing) return;
    e.stopPropagation();
    const b = box();
    if (!b) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    onSelect(i);
    const p = items[i];
    if (kind === "move") {
      gesture.current = { kind, i, dx: (e.clientX - b.left) / b.width - p.x, dy: (e.clientY - b.top) / b.height - p.y };
    } else {
      const cx = b.left + p.x * b.width;
      const cy = b.top + p.y * b.height;
      gesture.current = { kind, i, cx, cy, d0: Math.hypot(e.clientX - cx, e.clientY - cy), a0: Math.atan2(e.clientY - cy, e.clientX - cx), s0: p.s, r0: p.r };
    }
  };

  const move = (e: PointerEvent<HTMLElement>) => {
    const g = gesture.current;
    const b = box();
    if (!g || !b) return;
    if (g.kind === "move") {
      onChange(g.i, { x: clamp((e.clientX - b.left) / b.width - g.dx, 0, 1), y: clamp((e.clientY - b.top) / b.height - g.dy, 0, 1) });
    } else {
      const d = Math.hypot(e.clientX - g.cx, e.clientY - g.cy);
      const a = Math.atan2(e.clientY - g.cy, e.clientX - g.cx);
      let r = g.r0 + ((a - g.a0) * 180) / Math.PI;
      r = ((((r + 180) % 360) + 360) % 360) - 180;
      onChange(g.i, { s: clamp(g.s0 * (d / Math.max(g.d0, 1)), MIN_S, MAX_S), r: Math.round(r) });
    }
  };

  const up = () => {
    gesture.current = null;
  };

  const key = (e: KeyboardEvent<HTMLElement>, i: number) => {
    const p = items[i];
    const step = e.shiftKey ? 0.05 : 0.01;
    const moves: Record<string, Partial<Placed>> = {
      ArrowLeft: { x: clamp(p.x - step, 0, 1) },
      ArrowRight: { x: clamp(p.x + step, 0, 1) },
      ArrowUp: { y: clamp(p.y - step, 0, 1) },
      ArrowDown: { y: clamp(p.y + step, 0, 1) },
      "+": { s: clamp(p.s * 1.1, MIN_S, MAX_S) },
      "-": { s: clamp(p.s / 1.1, MIN_S, MAX_S) },
      r: { r: ((p.r + 195) % 360) - 180 },
    };
    if (moves[e.key]) {
      e.preventDefault();
      onChange(i, moves[e.key]);
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      onRemove(i);
    }
  };

  return (
    <div className={`absolute inset-0 ${editing ? "z-20" : "pointer-events-none"}`} onPointerDown={() => editing && onSelect(null)} aria-hidden={!editing}>
      {items.map((p, i) => {
        const url = decorUrl(p.item);
        if (!url) return null;
        const on = editing && selected === i;
        return (
          <div
            key={i}
            className="absolute"
            style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, width: `${BASE * p.s}%`, transform: `translate(-50%, -50%) rotate(${p.r}deg)` }}
          >
            {editing ? (
              <button
                type="button"
                aria-label={`${labels[p.item] ?? p.item} : glisser pour déplacer`}
                aria-pressed={on}
                onPointerDown={(e) => down(e, i, "move")}
                onPointerMove={move}
                onPointerUp={up}
                onPointerCancel={up}
                onKeyDown={(e) => key(e, i)}
                onFocus={() => onSelect(i)}
                className={`block w-full touch-none rounded-lg ${on ? "outline outline-2 outline-offset-2 outline-primary" : "hover:outline hover:outline-1 hover:outline-primary/50"}`}
                style={{ cursor: "grab" }}
              >
                <img src={url} alt="" draggable={false} className="block w-full select-none" style={{ transform: p.f ? "scaleX(-1)" : undefined }} />
              </button>
            ) : (
              <img src={url} alt="" draggable={false} className="block w-full select-none" style={{ transform: p.f ? "scaleX(-1)" : undefined }} />
            )}
            {on && (
              <span
                role="presentation"
                onPointerDown={(e) => down(e, i, "turn")}
                onPointerMove={move}
                onPointerUp={up}
                onPointerCancel={up}
                className="absolute -bottom-3 -right-3 grid h-6 w-6 touch-none place-items-center rounded-full border-2 border-white bg-primary text-[11px] text-white shadow-card"
                style={{ cursor: "nwse-resize" }}
                title="Tirer pour agrandir et tourner"
              >
                ⤡
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
