import { useId, type ReactNode } from "react";
import { decorUrl } from "./decorAssets";

// The cat's room, drawn in the same soft style: window (day or night with the
// real time), wooden floor, basket, bowl and a plant. The wall, the floor, the
// view through the window and a garland under the ceiling can be changed
// (surfaces bought in the shop); without one, the room keeps its own look.

const OUTLINE = "#4a3b33";
const NIGHT_VEIL = "#161a45";

export function isNight(date = new Date()): boolean {
  const h = date.getHours();
  return h >= 20 || h < 7;
}

export interface RoomSurfaces {
  wall?: string | null;
  floor?: string | null;
  view?: string | null;
  ceiling?: string | null;
}

/** {@code furnished}: objects are placed in the room, so its own little frame and plant step aside. */
export function Room({ night, surfaces = {}, furnished = false }: { night: boolean; surfaces?: RoomSurfaces; furnished?: boolean }) {
  // Several rooms can share a page (the shop's previews): each keeps its own ids.
  const u = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id={`${u}-wall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={night ? "#2b2550" : "#f7e6d3"} />
          <stop offset="1" stopColor={night ? "#3a3163" : "#f1d9c2"} />
        </linearGradient>
        <linearGradient id={`${u}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={night ? "#0f1435" : "#8fd3ff"} />
          <stop offset="1" stopColor={night ? "#2a2f6b" : "#d4f0ff"} />
        </linearGradient>
        <clipPath id={`${u}-window`}>
          <rect x="244" y="34" width="112" height="92" rx="10" />
        </clipPath>
      </defs>
      <rect width="400" height="300" fill={`url(#${u}-wall)`} />
      {surfaces.wall && <Wall u={u} id={surfaces.wall} night={night} />}
      {/* Window */}
      <g>
        <rect x="244" y="34" width="112" height="92" rx="10" fill={`url(#${u}-sky)`} />
        {surfaces.view && decorUrl(surfaces.view) ? (
          <g clipPath={`url(#${u}-window)`}>
            {/* A little bigger than the window, so the drawing's own rounded corners stay out of sight. */}
            <image href={decorUrl(surfaces.view)} x="222" y="2" width="156" height="156" preserveAspectRatio="xMidYMid slice" />
            {night && <rect x="244" y="34" width="112" height="92" fill={NIGHT_VEIL} opacity="0.35" />}
          </g>
        ) : night ? (
          <g>
            <circle cx="326" cy="60" r="11" fill="#fff6c9" />
            <circle cx="331" cy="56" r="10" fill="#1d2354" />
            {[[262, 52], [290, 70], [276, 98], [340, 100], [310, 48]].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="1.8" fill="#fff" className="room-star" style={{ animationDelay: `${i * 0.5}s` }} />
            ))}
          </g>
        ) : (
          <g>
            <circle cx="328" cy="58" r="12" fill="#ffd45e" />
            <g fill="#fff" opacity="0.9">
              <ellipse cx="272" cy="88" rx="16" ry="7" />
              <ellipse cx="286" cy="82" rx="12" ry="7" />
            </g>
          </g>
        )}
        <rect x="244" y="34" width="112" height="92" rx="10" fill="none" stroke={OUTLINE} strokeWidth="3" />
        <path d="M300 34 v92 M244 80 h112" stroke={OUTLINE} strokeWidth="3" />
        <rect x="238" y="124" width="124" height="8" rx="3" fill="#c98f5f" stroke={OUTLINE} strokeWidth="2.4" />
      </g>
      {/* Frame on the wall */}
      <g display={furnished ? "none" : undefined}>
        <rect x="46" y="44" width="64" height="50" rx="4" fill="#fff9f1" stroke={OUTLINE} strokeWidth="2.6" />
        <path d="M58 84 l14 -16 l10 10 l8 -8 l12 14 z" fill="#9fd1a4" />
        <circle cx="94" cy="58" r="5" fill="#ffb0d6" />
      </g>
      {/* Floor */}
      {surfaces.floor ? (
        <Floor u={u} id={surfaces.floor} night={night} />
      ) : (
        <>
          <rect x="0" y="206" width="400" height="94" fill={night ? "#6b4e3a" : "#d9a878"} />
          <g stroke={night ? "#5a402f" : "#c4935f"} strokeWidth="2">
            <path d="M0 232 H400 M0 262 H400" />
            <path d="M80 206 v26 M210 232 v30 M330 206 v26 M140 262 v38 M290 262 v38" />
          </g>
          <rect x="0" y="202" width="400" height="6" fill={night ? "#4d382a" : "#b98552"} />
        </>
      )}
      {surfaces.ceiling && <Garland id={surfaces.ceiling} night={night} />}
      {/* Plant */}
      <g display={furnished ? "none" : undefined}>
        <path d="M28 206 l6 -30 h22 l6 30 z" fill="#e07a5f" stroke={OUTLINE} strokeWidth="2.4" strokeLinejoin="round" />
        <g fill="#6bbf7a" stroke={OUTLINE} strokeWidth="2">
          <path d="M45 176 C 30 160, 26 140, 40 132 C 44 150, 48 160, 45 176 Z" />
          <path d="M45 176 C 60 158, 70 146, 62 128 C 52 142, 46 156, 45 176 Z" />
          <path d="M45 176 C 42 156, 48 140, 52 128" fill="none" />
        </g>
      </g>
      {/* Basket (right) */}
      <g>
        <ellipse cx="330" cy="262" rx="52" ry="14" fill="#000" opacity="0.14" />
        <path d="M280 236 q50 -14 100 0 l-8 26 q-42 12 -84 0 z" fill="#c98f5f" stroke={OUTLINE} strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M286 240 q44 -10 88 0" stroke="#a8703f" strokeWidth="2" fill="none" />
        <ellipse cx="330" cy="238" rx="44" ry="8" fill="#f2b6c9" stroke={OUTLINE} strokeWidth="2" />
      </g>
    </svg>
  );
}

/** A tile of wallpaper: its colour, then a drawing (from the decor set) scattered twice per tile. */
function Motif({ u, id, base, size, opacity, turn = 0 }: { u: string; id: string; base: string; size: number; opacity: number; turn?: number }) {
  const url = decorUrl(id);
  const s = 13;
  return (
    <pattern id={`${u}-wall-tile`} width={size} height={size} patternUnits="userSpaceOnUse">
      <rect width={size} height={size} fill={base} />
      {url && (
        <g opacity={opacity}>
          <image href={url} x={size * 0.25 - s / 2} y={size * 0.25 - s / 2} width={s} height={s} transform={`rotate(${-turn} ${size * 0.25} ${size * 0.25})`} />
          <image href={url} x={size * 0.75 - s / 2} y={size * 0.75 - s / 2} width={s} height={s} transform={`rotate(${turn} ${size * 0.75} ${size * 0.75})`} />
        </g>
      )}
    </pattern>
  );
}

const WALLS: Record<string, (u: string) => ReactNode> = {
  "mur-rayures": (u) => (
    <pattern id={`${u}-wall-tile`} width="28" height="10" patternUnits="userSpaceOnUse">
      <rect width="28" height="10" fill="#f7e4d4" />
      <rect width="14" height="10" fill="#f0d2bd" />
      <rect x="13" width="1" height="10" fill="#fff" opacity="0.5" />
    </pattern>
  ),
  "mur-pois": (u) => (
    <pattern id={`${u}-wall-tile`} width="24" height="24" patternUnits="userSpaceOnUse">
      <rect width="24" height="24" fill="#fbe9ef" />
      <circle cx="6" cy="6" r="2.6" fill="#f2bfd0" />
      <circle cx="18" cy="18" r="2.6" fill="#f2bfd0" />
    </pattern>
  ),
  "mur-fleurs": (u) => <Motif u={u} id="mur-fleurs" base="#fcf0e6" size={40} opacity={0.6} turn={18} />,
  "mur-etoiles": (u) => <Motif u={u} id="mur-etoiles" base="#eaeefb" size={38} opacity={0.55} turn={12} />,
  "mur-pattes": (u) => <Motif u={u} id="mur-pattes" base="#f4ebe1" size={42} opacity={0.28} turn={-25} />,
  "mur-coeurs": (u) => <Motif u={u} id="mur-coeurs" base="#fdeaf0" size={38} opacity={0.45} turn={-12} />,
  "mur-feuillage": (u) => <Motif u={u} id="mur-feuillage" base="#eaf3e6" size={40} opacity={0.55} turn={30} />,
  "mur-nuit": (u) => <Motif u={u} id="mur-nuit" base="#2a2e62" size={44} opacity={0.85} turn={-10} />,
  "mur-briques": (u) => (
    <pattern id={`${u}-wall-tile`} width="48" height="24" patternUnits="userSpaceOnUse">
      <rect width="48" height="24" fill="#e6cdbd" />
      <rect x="1" y="1" width="46" height="10" rx="1.5" fill="#c9765b" />
      <rect x="-23" y="13" width="46" height="10" rx="1.5" fill="#bf6d52" />
      <rect x="25" y="13" width="46" height="10" rx="1.5" fill="#cd7c60" />
      <rect x="1" y="1" width="46" height="2" fill="#fff" opacity="0.12" />
    </pattern>
  ),
  "mur-lambris": (u) => (
    <pattern id={`${u}-wall-tile`} width="34" height="206" patternUnits="userSpaceOnUse">
      <rect width="34" height="206" fill="#caa47d" />
      <rect width="2" height="206" fill="#a7815b" />
      <rect x="3" width="1.5" height="206" fill="#e0c39f" opacity="0.7" />
      <path d="M12 0 C14 60 10 120 13 206 M24 0 C22 70 26 140 23 206" stroke="#bb9570" strokeWidth="0.8" fill="none" opacity="0.6" />
    </pattern>
  ),
};

function Wall({ u, id, night }: { u: string; id: string; night: boolean }) {
  const tile = WALLS[id];
  if (!tile) return null;
  return (
    <>
      <defs>{tile(u)}</defs>
      <rect width="400" height="206" fill={`url(#${u}-wall-tile)`} />
      {/* Light falls from the ceiling; at night the room is dimmer. */}
      <rect width="400" height="206" fill={`url(#${u}-wall-shade)`} />
      <defs>
        <linearGradient id={`${u}-wall-shade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.12" />
          <stop offset="1" stopColor="#000" stopOpacity="0.06" />
        </linearGradient>
      </defs>
      {night && <rect width="400" height="206" fill={NIGHT_VEIL} opacity="0.5" />}
    </>
  );
}

/** Planks in three rows, staggered, like the room's own floor. */
function Planks({ fill, line, board }: { fill: string; line: string; board: string }) {
  return (
    <>
      <rect x="0" y="206" width="400" height="94" fill={fill} />
      <g stroke={line} strokeWidth="2">
        <path d="M0 232 H400 M0 262 H400" />
        <path d="M80 206 v26 M210 232 v30 M330 206 v26 M140 262 v38 M290 262 v38 M20 232 v30 M370 262 v38" />
      </g>
      <rect x="0" y="202" width="400" height="6" fill={board} />
    </>
  );
}

function Tiles({ u, tile, board }: { u: string; tile: ReactNode; board: string }) {
  return (
    <>
      <defs>{tile}</defs>
      <rect x="0" y="206" width="400" height="94" fill={`url(#${u}-floor-tile)`} />
      <rect x="0" y="202" width="400" height="6" fill={board} />
    </>
  );
}

const FLOORS: Record<string, (u: string) => ReactNode> = {
  "sol-parquet-fonce": () => <Planks fill="#8a5b3b" line="#6c442b" board="#5b3822" />,
  "sol-bois-blanc": () => <Planks fill="#ebe0d1" line="#d4c3ad" board="#c3ab8e" />,
  "sol-damier": (u) => (
    <Tiles
      u={u}
      board="#3b3a48"
      tile={
        <pattern id={`${u}-floor-tile`} width="26" height="26" patternUnits="userSpaceOnUse" y="206">
          <rect width="26" height="26" fill="#f3efe7" />
          <rect width="13" height="13" fill="#34333f" />
          <rect x="13" y="13" width="13" height="13" fill="#34333f" />
        </pattern>
      }
    />
  ),
  "sol-terracotta": (u) => (
    <Tiles
      u={u}
      board="#9c4f31"
      tile={
        <pattern id={`${u}-floor-tile`} width="23" height="23" patternUnits="userSpaceOnUse" y="206">
          <rect width="23" height="23" fill="#e5c2a6" />
          <rect x="1" y="1" width="21" height="21" rx="2" fill="#c6693f" />
          <rect x="2.5" y="2.5" width="18" height="3" rx="1.5" fill="#fff" opacity="0.12" />
        </pattern>
      }
    />
  ),
  "sol-tatami": (u) => (
    <Tiles
      u={u}
      board="#4d6b3a"
      tile={
        <pattern id={`${u}-floor-tile`} width="64" height="31.5" patternUnits="userSpaceOnUse" y="206">
          <rect width="64" height="31.5" fill="#d9ce90" />
          <path d="M0 5 H64 M0 10 H64 M0 15 H64 M0 20 H64 M0 25 H64" stroke="#c8bb78" strokeWidth="0.8" />
          <rect x="1.5" y="1.5" width="61" height="28.5" fill="none" stroke="#4f6c3b" strokeWidth="3" />
        </pattern>
      }
    />
  ),
  "sol-marbre": (u) => (
    <>
      <Tiles
      u={u}
        board="#b9b3aa"
        tile={
          <pattern id={`${u}-floor-tile`} width="50" height="47" patternUnits="userSpaceOnUse" y="206">
            <rect width="50" height="47" fill="#f4f2ee" />
            <path d="M0 0.5 H50 M0.5 0 V47" stroke="#e1ddd6" strokeWidth="1" />
          </pattern>
        }
      />
      <path d="M-10 230 C60 214 90 250 160 236 S260 214 330 240 S420 250 430 232 M20 300 C70 270 120 290 170 262 S250 272 300 286" stroke="#d3cdc3" strokeWidth="1.4" fill="none" />
      <path d="M100 206 C120 230 110 250 140 270 M280 206 C300 226 320 232 340 258" stroke="#ddd8cf" strokeWidth="1" fill="none" />
    </>
  ),
  "sol-moquette": (u) => (
    <Tiles
      u={u}
      board="#d98ea3"
      tile={
        <pattern id={`${u}-floor-tile`} width="6" height="6" patternUnits="userSpaceOnUse" y="206">
          <rect width="6" height="6" fill="#f2b7c5" />
          <circle cx="1.5" cy="1.5" r="0.9" fill="#e9a3b4" />
          <circle cx="4.5" cy="4.5" r="0.9" fill="#f7c9d4" />
        </pattern>
      }
    />
  ),
};

function Floor({ u, id, night }: { u: string; id: string; night: boolean }) {
  const floor = FLOORS[id];
  if (!floor) return null;
  return (
    <>
      {floor(u)}
      {/* Closer is brighter. */}
      <rect x="0" y="206" width="400" height="94" fill={`url(#${u}-floor-shade)`} />
      <defs>
        <linearGradient id={`${u}-floor-shade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.12" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.06" />
        </linearGradient>
      </defs>
      {night && <rect x="0" y="202" width="400" height="98" fill={NIGHT_VEIL} opacity="0.45" />}
    </>
  );
}

// The garland hangs in two swags under the ceiling.
const SWAGS = [
  [0, 200],
  [200, 400],
] as const;
const SAG = 30;
/** A point along a swag: x, and how low the string hangs there. */
function along(x0: number, x1: number, t: number) {
  const x = x0 + (x1 - x0) * t;
  return { x, y: 6 + SAG * 4 * t * (1 - t) * 0.9 };
}
const POINTS = SWAGS.flatMap(([a, b]) => [0.14, 0.3, 0.46, 0.62, 0.78, 0.92].map((t) => along(a, b, t)));
const PASTELS = ["#ff9fbd", "#ffd36e", "#8fd3ff", "#b4ec9c", "#c9a8ff"];

function Garland({ id, night }: { id: string; night: boolean }) {
  const url = decorUrl(id);
  const string = SWAGS.map(([a, b]) => `M${a} 6 Q${(a + b) / 2} ${6 + SAG * 1.8} ${b} 6`).join(" ");
  const hang = (size: number, drop: number) =>
    url &&
    POINTS.map((p, i) => (
      <g key={i}>
        <path d={`M${p.x} ${p.y} v${drop}`} stroke={OUTLINE} strokeWidth="0.8" />
        <image href={url} x={p.x - size / 2} y={p.y + drop} width={size} height={size} className="room-swing" style={{ animationDelay: `${(i % 5) * -0.7}s`, transformOrigin: `${p.x}px ${p.y}px` }} />
      </g>
    ));
  return (
    <g>
      {id !== "plafond-ballons" && <path d={string} stroke={OUTLINE} strokeWidth="1.4" fill="none" />}
      {id === "plafond-lumieres" &&
        POINTS.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y + 6} r="7" fill={PASTELS[i % PASTELS.length]} opacity={night ? 0.45 : 0.25} className="room-star" style={{ animationDelay: `${i * 0.35}s` }} />
            <rect x={p.x - 1.6} y={p.y} width="3.2" height="3" rx="0.8" fill={OUTLINE} />
            <ellipse cx={p.x} cy={p.y + 6} rx="2.8" ry="3.8" fill={PASTELS[i % PASTELS.length]} stroke={OUTLINE} strokeWidth="0.6" />
          </g>
        ))}
      {id === "plafond-fanions" &&
        POINTS.map((p, i) => (
          <path key={i} d={`M${p.x - 7} ${p.y - 1} L${p.x + 7} ${p.y - 1} L${p.x} ${p.y + 14} Z`} fill={PASTELS[i % PASTELS.length]} stroke={OUTLINE} strokeWidth="1" strokeLinejoin="round" />
        ))}
      {id === "plafond-etoiles" && hang(15, 5)}
      {id === "plafond-coeurs" && hang(14, 6)}
      {id === "plafond-lampions" && hang(20, 3)}
      {id === "plafond-ballons" &&
        url &&
        [30, 78, 130, 262, 318, 372].map((x, i) => (
          <g key={x}>
            <path d={`M${x} ${22 + (i % 3) * 4} q${i % 2 ? 4 : -4} 18 0 ${34 + (i % 3) * 8}`} stroke={OUTLINE} strokeWidth="0.8" fill="none" />
            <image href={url} x={x - 13} y={-6 + (i % 3) * 4} width="26" height="30" className="room-swing" style={{ animationDelay: `${i * -0.9}s`, transformOrigin: `${x}px ${24 + (i % 3) * 4}px` }} />
          </g>
        ))}
    </g>
  );
}
