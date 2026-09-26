import type { NavalTheme } from "./api";

const U = 20; // one cell in the drawing
const CARTOON = ["#ff8fb8", "#ffd166", "#7dd3a8", "#7cc4ff", "#c3a6ff"];

/**
 * A ship drawn for its theme, lying left to right over {@code length} cells
 * (turned a quarter when vertical). Pure SVG, stretched to the ship's cells.
 */
export function Ship({ theme, type, length, vertical }: { theme: NavalTheme; type: number; length: number; vertical: boolean }) {
  const w = length * U;
  return (
    <svg
      viewBox={vertical ? `0 0 ${U} ${w}` : `0 0 ${w} ${U}`}
      className="nv-ship-svg"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <g transform={vertical ? `rotate(90) translate(0 ${-U})` : undefined}>{draw(theme, type, w)}</g>
    </svg>
  );
}

function draw(theme: NavalTheme, type: number, w: number) {
  switch (theme) {
    case "cartoon":
      return cartoon(type, w);
    case "pirate":
      return pirate(w);
    case "space":
      return space(type, w);
    default:
      return ocean(type, w);
  }
}

/** Sleek dark hull with a neon edge, a bridge and lit portholes. */
function ocean(type: number, w: number) {
  const sub = type === 3;
  return (
    <>
      <path
        d={sub ? `M4 7 H${w - 8} Q${w - 2} 10 ${w - 8} 13 H4 Q1 10 4 7 Z` : `M2 5 H${w - 9} L${w - 2} 10 L${w - 9} 15 H2 Q0 10 2 5 Z`}
        fill="#0f2a44"
        stroke="#4ff0ff"
        strokeWidth="1.2"
      />
      <path d={`M5 10 H${w - 10}`} stroke="#4ff0ff" strokeOpacity="0.35" strokeWidth="0.8" />
      {!sub && <rect x={w * 0.42} y="6.5" width={Math.max(8, w * 0.14)} height="7" rx="1.5" fill="#173d63" stroke="#4ff0ff" strokeWidth="0.8" />}
      {sub && <rect x={w * 0.45} y="4" width="8" height="4" rx="1.5" fill="#173d63" stroke="#4ff0ff" strokeWidth="0.8" />}
      {Array.from({ length: Math.floor(w / 20) }, (_, i) => (
        <circle key={i} cx={8 + i * 20} cy="10" r="1.2" className="nv-lamp" fill="#ffe27a" />
      ))}
    </>
  );
}

/** A round, happy boat in a candy colour seen from above: portholes and a chimney. */
function cartoon(type: number, w: number) {
  const c = CARTOON[type % CARTOON.length];
  return (
    <>
      <rect x="1.5" y="3" width={w - 3} height="14" rx="7" fill={c} stroke="#3b2f4a" strokeWidth="1.2" />
      <rect x="5" y="6.5" width={w - 10} height="7" rx="3.5" fill="#fff" opacity="0.4" />
      {Array.from({ length: Math.max(1, Math.floor(w / 20) - 1) }, (_, i) => (
        <circle key={i} cx={10 + i * 20} cy="10" r="1.8" fill="#fff" stroke="#3b2f4a" strokeWidth="0.8" />
      ))}
      <circle cx={w - 10} cy="10" r="3.2" fill="#ff6b6b" stroke="#3b2f4a" strokeWidth="1" />
      <circle cx={w - 10} cy="10" r="1.3" fill="#3b2f4a" />
      <circle cx={w - 10} cy="10" r="2" fill="#fff" opacity="0.7" className="nv-puff" />
    </>
  );
}

/** A wooden hull seen from above: planks, a pointed bow and sails across the masts. */
function pirate(w: number) {
  const masts = Math.max(1, Math.round(w / 40));
  return (
    <>
      <path d={`M2 6 Q2 3.5 5 3.5 H${w - 11} Q${w - 3} 4 ${w - 1} 10 Q${w - 3} 16 ${w - 11} 16.5 H5 Q2 16.5 2 14 Z`} fill="#7a4a24" stroke="#3d2412" strokeWidth="1" />
      <path d={`M5 7.5 H${w - 9} M5 10 H${w - 5} M5 12.5 H${w - 9}`} stroke="#a0703f" strokeWidth="0.6" />
      {Array.from({ length: masts }, (_, i) => {
        const x = ((w - 6) / (masts + 1)) * (i + 1);
        return (
          <g key={i} className="nv-sail">
            <path d={`M${x - 1.5} 0.8 Q${x + 2.5} 10 ${x - 1.5} 19.2 L${x + 1} 19.2 Q${x + 5} 10 ${x + 1} 0.8 Z`} fill="#f3e2bd" stroke="#8a6a3a" strokeWidth="0.6" />
            <circle cx={x} cy="10" r="1.3" fill="#3d2412" />
          </g>
        );
      })}
      <path d="M3 10 l-2.5 -1.8 v3.6 Z" fill="#1b1b1b" />
    </>
  );
}

/** A pointed hull with a glowing cockpit and engines that flicker. */
function space(type: number, w: number) {
  const hue = ["#9aa7c7", "#a3b8d9", "#8fa0bd", "#b2a6d9", "#9fc3c9"][type % 5];
  return (
    <>
      <path d={`M3 10 L7 4 H${w - 10} L${w - 1} 10 L${w - 10} 16 H7 Z`} fill={hue} stroke="#e8ecff" strokeWidth="0.8" />
      <path d={`M9 7 H${w - 12}`} stroke="#5d6a8a" strokeWidth="0.8" />
      <path d={`M9 13 H${w - 12}`} stroke="#5d6a8a" strokeWidth="0.8" />
      <ellipse cx={w - 12} cy="10" rx="4" ry="2.4" fill="#5ff3ff" className="nv-cockpit" />
      <rect x="0" y="7.5" width="3.5" height="5" rx="1" fill="#ff9d3c" className="nv-engine" />
    </>
  );
}
