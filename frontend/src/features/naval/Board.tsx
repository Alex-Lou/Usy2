import type { Species } from "../../app/companion";
import { Animal } from "../../components/ui/animals";
import { LENGTHS, SIZE, type NavalTheme, type Shot } from "./api";
import { Ship } from "./Ship";

export interface BoardShip {
  type: number;
  cells: number[];
  sunk?: boolean;
  selected?: boolean;
}

/** The shot being animated: a shell flies in, then bursts (hit) or splashes (miss). */
export interface Effect {
  key: number;
  cell: number;
  hit: boolean;
  sunk: boolean;
}

const ROWS = "ABCDEFGHIJ";
export const cellName = (c: number) => `${ROWS[Math.floor(c / SIZE)]}${(c % SIZE) + 1}`;

/**
 * One 10×10 sea in the game's theme: the ships (as SVG, over their cells),
 * the shots (hit / miss marks) and the latest shot's animation. Cells are
 * buttons when {@code onCell} is given (aiming, or placing the fleet).
 */
export function Board({ theme, ships, shots, onCell, onShip, onHover, canAim, effect, preview, radar, shake, small, captain, label }: {
  theme: NavalTheme;
  ships: BoardShip[];
  shots: Shot[];
  onCell?: (cell: number) => void;
  onShip?: (type: number) => void;
  onHover?: (cell: number | null) => void;
  canAim?: (cell: number) => boolean;
  effect?: Effect | null;
  preview?: { cells: number[]; ok: boolean } | null;
  radar?: boolean;
  shake?: number;
  small?: boolean;
  captain?: Species;
  label: string;
}) {
  const shotAt = new Map(shots.map((s) => [s.cell, s.hit]));
  const pos = (c: number, rows = 1, cols = 1) => ({
    gridRow: `${Math.floor(c / SIZE) + 1} / span ${rows}`,
    gridColumn: `${(c % SIZE) + 1} / span ${cols}`,
  });

  return (
    <div
      key={shake}
      className={`nv-board nv-${theme} ${small ? "nv-board--small" : ""} ${shake ? "nv-shake" : ""}`}
      role="grid"
      aria-label={label}
      onPointerLeave={() => onHover?.(null)}
    >
      <div className="nv-sea" aria-hidden="true" />
      {radar && <div className="nv-radar" aria-hidden="true" />}

      {Array.from({ length: SIZE * SIZE }, (_, c) => {
        const aimable = onCell && (canAim ? canAim(c) : true);
        const shot = shotAt.get(c);
        const name = `${cellName(c)}${shot === true ? ", touché" : shot === false ? ", à l'eau" : ""}`;
        return onCell ? (
          <button
            key={c}
            type="button"
            className="nv-cell"
            style={pos(c)}
            disabled={!aimable}
            onClick={() => onCell(c)}
            onPointerEnter={() => onHover?.(c)}
            aria-label={name}
            data-cell={c}
          />
        ) : (
          <div key={c} className="nv-cell" style={pos(c)} aria-label={name} data-cell={c} />
        );
      })}

      {preview?.cells.map((c) => <div key={`p${c}`} className={`nv-ghost ${preview.ok ? "" : "nv-ghost--bad"}`} style={pos(c)} aria-hidden="true" />)}

      {ships.map((s) => {
        const vertical = s.cells.length > 1 && s.cells[1] - s.cells[0] === SIZE;
        const len = LENGTHS[s.type];
        const Tag = onShip ? "button" : "div";
        return (
          <Tag
            key={`s${s.type}`}
            {...(onShip ? { type: "button" as const, onClick: () => onShip(s.type), "aria-label": `Bateau ${s.type + 1}` } : { "aria-hidden": true })}
            className={`nv-ship ${s.sunk ? "nv-ship--sunk" : ""} ${s.selected ? "nv-ship--selected" : ""} ${vertical ? "nv-ship--v" : ""}`}
            style={pos(s.cells[0], vertical ? len : 1, vertical ? 1 : len)}
          >
            <Ship theme={theme} type={s.type} length={len} vertical={vertical} />
            {captain && theme === "cartoon" && s.type === 0 && !s.sunk && (
              <span className="nv-captain"><Animal species={captain} size={small ? 18 : 26} still /></span>
            )}
          </Tag>
        );
      })}

      {shots.map((s) => (
        <div
          key={`m${s.cell}`}
          className={`nv-mark ${s.hit ? "nv-mark--hit" : "nv-mark--miss"} ${effect?.cell === s.cell ? "nv-mark--late" : ""}`}
          style={pos(s.cell)}
          aria-hidden="true"
        />
      ))}

      {effect && (
        <div key={`e${effect.key}`} className="nv-fx" style={{ ...pos(effect.cell), ["--dx" as string]: 4.5 - (effect.cell % SIZE), ["--dy" as string]: SIZE - Math.floor(effect.cell / SIZE) }} aria-hidden="true">
          <span className="nv-shell" />
          <span className={`nv-impact ${effect.hit ? "nv-impact--hit" : "nv-impact--miss"} ${effect.sunk ? "nv-impact--sunk" : ""}`} />
        </div>
      )}
    </div>
  );
}
