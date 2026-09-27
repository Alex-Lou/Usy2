import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import type { Species } from "../../app/companion";
import { cellsOf, LENGTHS, SIZE, type NavalTheme, type Placement } from "./api";
import { Board, cellName } from "./Board";
import { emptyFleet, fits, randomFleet, startAt, turned, type Fleet } from "./fleet";
import { Ship } from "./Ship";
import { themeOf } from "./themes";

/** A ship in the hand: where it was, which of its cells is under the finger, where it would land. */
interface Drag {
  type: number;
  vertical: boolean;
  from: Placement | null; // null: it comes from the port
  k: number;
  size: number;
  grabX: number;
  grabY: number;
  x: number;
  y: number;
  x0: number;
  y0: number;
  moved: boolean;
  target: Placement | null;
  ok: boolean;
}

/**
 * Placing the fleet: drag each ship from the port onto the sea (a shadow snaps
 * to the cells, green if it fits), tap a ship to turn it, drag it off the sea to
 * take it back. Keyboard: Enter turns, arrows move, Delete takes back.
 */
export function Placer({ theme, captain, busy, initial, onReady }: {
  theme: NavalTheme;
  captain?: Species;
  busy?: boolean;
  initial?: Placement[];
  onReady: (fleet: Placement[]) => void;
}) {
  const t = themeOf(theme);
  const [fleet, setFleet] = useState<Fleet>(() => initial ?? emptyFleet());
  const [drag, setDrag] = useState<Drag | null>(null);
  const [note, setNote] = useState<{ key: number; text: string } | null>(null);
  const [shake, setShake] = useState(0);
  const sea = useRef<HTMLDivElement>(null);
  const dragRef = useRef(drag);
  dragRef.current = drag;
  const fleetRef = useRef(fleet);
  fleetRef.current = fleet;

  const say = (text: string, bad = false) => {
    setNote({ key: Date.now(), text });
    if (bad) setShake((s) => s + 1);
  };
  useEffect(() => {
    if (!note) return;
    const id = window.setTimeout(() => setNote(null), 2400);
    return () => window.clearTimeout(id);
  }, [note]);

  /** The sea's cells on screen: top-left corner and one cell's width. */
  const geometry = () => {
    const a = sea.current?.querySelector('[data-cell="0"]')?.getBoundingClientRect();
    const b = sea.current?.querySelector(`[data-cell="${SIZE * SIZE - 1}"]`)?.getBoundingClientRect();
    return a && b ? { left: a.left, top: a.top, size: (b.right - a.left) / SIZE } : null;
  };

  const put = (type: number, p: Placement | null) => setFleet((f) => f.map((x, i) => (i === type ? p : x)));

  const turn = (type: number) => {
    const q = turned(fleetRef.current, type);
    if (q) put(type, q);
    else say("Pas la place de le faire pivoter ici", true);
  };

  /** Anywhere it fits, for a tap (or Enter) on a ship still in the port. */
  const drop = (type: number) => {
    const options: Placement[] = [];
    for (let cell = 0; cell < SIZE * SIZE; cell++) {
      for (const vertical of [false, true]) if (fits(fleet, type, { cell, vertical })) options.push({ cell, vertical });
    }
    if (options.length) put(type, options[Math.floor(Math.random() * options.length)]);
    else say("Plus de place sur la mer : retire un bateau", true);
  };

  const grab = (type: number, from: Placement | null, e: PointerEvent<HTMLElement>, vertical: boolean) => {
    if (e.button !== 0 || busy) return;
    const g = geometry();
    if (!g) return;
    // In the port, what counts is the drawn hull, not the button around it.
    const r = (e.currentTarget.querySelector(".nv-port-hull") ?? e.currentTarget).getBoundingClientRect();
    const len = LENGTHS[type];
    const along = vertical ? (e.clientY - r.top) / r.height : (e.clientX - r.left) / r.width;
    const k = Math.max(0, Math.min(len - 1, Math.floor(along * len)));
    const across = vertical ? (e.clientX - r.left) / r.width : (e.clientY - r.top) / r.height;
    setDrag({
      type, vertical, from, k, size: g.size,
      grabX: vertical ? across * g.size : (k + 0.5) * g.size,
      grabY: vertical ? (k + 0.5) * g.size : across * g.size,
      x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY,
      moved: false, target: null, ok: false,
    });
  };

  // While a ship is in the hand, the whole window follows the finger.
  const dragging = drag != null;
  useEffect(() => {
    if (!dragging) return;
    const move = (e: globalThis.PointerEvent) => {
      const d = dragRef.current;
      const g = geometry();
      if (!d || !g) return;
      const col = Math.floor((e.clientX - g.left) / g.size);
      const row = Math.floor((e.clientY - g.top) / g.size);
      const inside = col >= 0 && col < SIZE && row >= 0 && row < SIZE;
      const target = inside ? startAt(d.type, d.vertical, row, col, d.k) : null;
      const moved = d.moved || Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > 6;
      setDrag({ ...d, x: e.clientX, y: e.clientY, moved, target, ok: !!target && !!fits(fleetRef.current, d.type, target) });
    };
    const up = () => {
      const d = dragRef.current;
      setDrag(null);
      if (!d) return;
      if (!d.moved) {
        if (d.from) turn(d.type);
        else drop(d.type);
      } else if (d.target && d.ok) put(d.type, d.target);
      else if (d.target) say("Un autre bateau est déjà là", true);
      else if (d.from) {
        put(d.type, null);
        say(`${t.ships[d.type]} rentré au port`);
      }
    };
    const cancel = () => setDrag(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
    };
    // Reads the latest drag and fleet through refs: one subscription per drag.
  }, [dragging]);

  const key = (type: number, e: KeyboardEvent<HTMLElement>) => {
    const p = fleet[type];
    if (!p) return;
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -SIZE, ArrowDown: SIZE }[e.key];
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      turn(type);
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      put(type, null);
      say(`${t.ships[type]} rentré au port`);
    } else if (step) {
      e.preventDefault();
      const row = Math.floor(p.cell / SIZE) + (Math.abs(step) === SIZE ? Math.sign(step) : 0);
      const col = (p.cell % SIZE) + (Math.abs(step) === 1 ? step : 0);
      const q = { cell: row * SIZE + col, vertical: p.vertical };
      if (row >= 0 && row < SIZE && col >= 0 && col < SIZE && fits(fleet, type, q)) put(type, q);
      else say("Impossible d'aller par là", true);
    }
  };

  const hand = drag?.moved ? drag : null;
  const placed = fleet.filter(Boolean).length;
  const ready = placed === LENGTHS.length;
  const port = LENGTHS.map((_, i) => i).filter((i) => !fleet[i]);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm">
        <b>Glisse</b> chaque bateau sur la mer. <b>Touche</b> un bateau posé pour le faire pivoter, glisse-le hors de la mer pour le retirer. Les bateaux peuvent se toucher.
      </p>
      <div ref={sea}>
        <Board
          theme={theme}
          label="Ta mer : place ta flotte"
          ships={fleet.flatMap((p, i) =>
            p && !(hand && hand.type === i)
              ? [{ type: i, cells: cellsOf(p, LENGTHS[i]) ?? [], label: `${t.ships[i]} en ${cellName(p.cell)}, ${p.vertical ? "vertical" : "horizontal"}. Entrée pour pivoter, flèches pour déplacer, Suppr pour retirer` }]
              : [],
          )}
          shots={[]}
          onShipDown={(type, e) => grab(type, fleet[type], e, !!fleet[type]?.vertical)}
          onShipKey={key}
          preview={hand?.target ? { cells: cellsOf(hand.target, LENGTHS[hand.type]) ?? [], ok: hand.ok } : null}
          shake={shake}
          captain={captain}
        />
      </div>
      <p className="nv-note" aria-live="polite">{note && <span key={note.key}>{note.text}</span>}</p>

      <div className="nv-port" aria-label="Le port : bateaux à placer">
        {port.length ? (
          port.map((i) => (
            <button
              key={i}
              type="button"
              className={`nv-port-ship ${hand?.type === i ? "nv-port-ship--out" : ""}`}
              style={{ ["--len" as string]: LENGTHS[i] }}
              onPointerDown={(e) => grab(i, null, e, false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  drop(i);
                }
              }}
              aria-label={`${t.ships[i]}, ${LENGTHS[i]} cases : glisse-le sur la mer, ou Entrée pour le poser`}
            >
              <span className={`nv-port-hull nv-${theme}`}><Ship theme={theme} type={i} length={LENGTHS[i]} vertical={false} /></span>
              <span className="nv-port-name">{t.ships[i]} · {LENGTHS[i]}</span>
            </button>
          ))
        ) : (
          <p className="text-sm text-text-muted">Toute la flotte est à l'eau ✓</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={busy} onClick={() => setFleet(randomFleet())} className="chip press text-sm">🎲 Au hasard</button>
        <button type="button" disabled={busy || !placed} onClick={() => setFleet(emptyFleet())} className="chip press text-sm disabled:opacity-40">↺ Tout retirer</button>
        <button
          type="button"
          disabled={!ready || busy}
          onClick={() => onReady(fleet as Placement[])}
          className="btn-brand press ml-auto rounded-token px-5 py-2 font-semibold disabled:opacity-40"
        >
          {ready ? "⚓ Flotte prête !" : `Encore ${LENGTHS.length - placed} à placer`}
        </button>
      </div>

      {hand &&
        createPortal(
          <div
            className={`nv-float nv-${theme} ${hand.target && !hand.ok ? "nv-float--bad" : ""}`}
            style={{
              left: hand.x - hand.grabX,
              top: hand.y - hand.grabY,
              width: (hand.vertical ? 1 : LENGTHS[hand.type]) * hand.size,
              height: (hand.vertical ? LENGTHS[hand.type] : 1) * hand.size,
            }}
            aria-hidden="true"
          >
            <Ship theme={theme} type={hand.type} length={LENGTHS[hand.type]} vertical={hand.vertical} />
          </div>,
          document.body,
        )}
    </div>
  );
}
