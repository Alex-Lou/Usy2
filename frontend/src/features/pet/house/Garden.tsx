import { useId, type ReactNode } from "react";
import { decorUrl } from "./decorAssets";

// 🌳 Outside: the house the two of us chose, its garden and the sky of the
// real time (sun and drifting clouds by day, moon and stars at night). Same
// 400×300 box as the room, so the companions walk on the grass at y 262.

const NIGHT_VEIL = "#161a45";

export interface GardenSurfaces {
  house?: string | null;
  ground?: string | null;
}

export function Garden({ night, surfaces = {} }: { night: boolean; surfaces?: GardenSurfaces }) {
  const u = useId().replace(/:/g, "");
  const house = decorUrl(surfaces.house ?? "maison-defaut");
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id={`${u}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={night ? "#0c1233" : "#7fcaff"} />
          <stop offset="1" stopColor={night ? "#2c3170" : "#dff4ff"} />
        </linearGradient>
        <radialGradient id={`${u}-glow`}>
          <stop offset="0" stopColor={night ? "#fff6c9" : "#fff3b0"} stopOpacity="0.9" />
          <stop offset="1" stopColor={night ? "#fff6c9" : "#fff3b0"} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#${u}-sky)`} />
      <circle cx="338" cy="52" r="42" fill={`url(#${u}-glow)`} />
      {night ? (
        <g>
          <circle cx="338" cy="52" r="15" fill="#fff6c9" />
          <circle cx="345" cy="46" r="13" fill="#1a2152" />
          {[[40, 30], [96, 58], [150, 22], [212, 44], [262, 18], [300, 86], [70, 96], [190, 92], [370, 110], [24, 140]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 3 ? 1.4 : 2} fill="#fff" className="room-star" style={{ animationDelay: `${i * 0.4}s` }} />
          ))}
        </g>
      ) : (
        <g>
          <circle cx="338" cy="52" r="17" fill="#ffd45e" />
          <g fill="#fff" opacity="0.92" className="garden-drift">
            <ellipse cx="80" cy="58" rx="26" ry="10" />
            <ellipse cx="100" cy="50" rx="18" ry="11" />
            <ellipse cx="228" cy="34" rx="20" ry="8" />
            <ellipse cx="243" cy="28" rx="13" ry="8" />
          </g>
        </g>
      )}
      {/* Hills far away, then nearer ones. */}
      <path d="M0 196 C60 150 120 168 170 184 S280 140 340 164 S390 176 400 170 V240 H0 Z" fill={night ? "#2f4a5a" : "#a9dca2"} />
      <path d="M0 214 C70 186 150 204 210 212 S330 188 400 204 V240 H0 Z" fill={night ? "#29424c" : "#90d08b"} />
      <Ground u={u} id={surfaces.ground ?? null} night={night} />
      {/* The house, standing on the grass, its path leading to us. */}
      <path d="M186 236 L214 236 L236 300 L164 300 Z" fill={night ? "#8c7a66" : "#e9d3ae"} opacity="0.95" />
      {house && <image href={house} x="112" y="64" width="176" height="176" />}
      {night && <rect width="400" height="300" fill={NIGHT_VEIL} opacity="0.28" />}
    </svg>
  );
}

const GROUNDS: Record<string, (u: string) => ReactNode> = {
  "sol-sable": (u) => (
    <pattern id={`${u}-ground`} width="10" height="10" patternUnits="userSpaceOnUse">
      <rect width="10" height="10" fill="#f0d8a4" />
      <circle cx="2" cy="3" r="0.7" fill="#dcbf85" />
      <circle cx="7" cy="8" r="0.6" fill="#fff1cf" />
    </pattern>
  ),
  "sol-neige": (u) => (
    <pattern id={`${u}-ground`} width="14" height="14" patternUnits="userSpaceOnUse">
      <rect width="14" height="14" fill="#f5f9ff" />
      <circle cx="4" cy="4" r="0.8" fill="#dbe6f7" />
      <circle cx="11" cy="10" r="0.6" fill="#fff" />
    </pattern>
  ),
  "sol-paves": (u) => (
    <pattern id={`${u}-ground`} width="18" height="12" patternUnits="userSpaceOnUse">
      <rect width="18" height="12" fill="#8f8b86" />
      <rect x="0.8" y="0.8" width="16.4" height="4.8" rx="2" fill="#b7b2ab" />
      <rect x="-8.2" y="6.4" width="16.4" height="4.8" rx="2" fill="#aca79f" />
      <rect x="9.8" y="6.4" width="16.4" height="4.8" rx="2" fill="#bdb8b1" />
    </pattern>
  ),
};

/** Grass by default; sand, snow, cobbles or a flower meadow once chosen. */
function Ground({ u, id, night }: { u: string; id: string | null; night: boolean }) {
  const tile = id ? GROUNDS[id] : undefined;
  const blossom = id === "sol-fleuri" ? decorUrl(id) : undefined;
  return (
    <g>
      {tile ? (
        <>
          <defs>{tile(u)}</defs>
          <rect y="222" width="400" height="78" fill={`url(#${u}-ground)`} />
        </>
      ) : (
        <>
          <defs>
            <linearGradient id={`${u}-grass`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={night ? "#3d6b45" : "#86d179"} />
              <stop offset="1" stopColor={night ? "#2e5536" : "#5fb35a"} />
            </linearGradient>
          </defs>
          <rect y="222" width="400" height="78" fill={`url(#${u}-grass)`} />
          <g stroke={night ? "#4f8458" : "#9fe08f"} strokeWidth="1.2" strokeLinecap="round" opacity="0.8">
            {Array.from({ length: 34 }, (_, i) => {
              const x = (i * 53) % 400;
              const y = 234 + ((i * 29) % 60);
              return <path key={i} d={`M${x} ${y} l-2 -6 M${x + 3} ${y} l1 -7 M${x + 6} ${y} l3 -5`} />;
            })}
          </g>
        </>
      )}
      {blossom &&
        Array.from({ length: 16 }, (_, i) => {
          const x = 12 + ((i * 71) % 380);
          const y = 238 + ((i * 37) % 54);
          return <image key={i} href={blossom} x={x} y={y} width="11" height="11" opacity="0.95" />;
        })}
      {/* The edge of the garden against the hills. */}
      <path d="M0 222 H400" stroke={night ? "#243d2a" : "#57a553"} strokeWidth="1.5" opacity="0.5" />
    </g>
  );
}
