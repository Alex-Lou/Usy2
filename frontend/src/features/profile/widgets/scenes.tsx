import { useId, type CSSProperties, type ReactNode } from "react";

/**
 * Little animated scenes for the "SVG animé" widget. Pure SVG + CSS keyframes
 * (styles/scenes.css), paused for people who prefer reduced motion. Each one
 * is drawn in a 160×100 box; animated parts sit in their own <g> so a CSS
 * transform never fights an SVG transform attribute.
 */

const delay = (s: number): CSSProperties => ({ animationDelay: `${s}s` });

/** A scene with a sky is a framed picture: everything stays inside its rounded frame. */
function Scene({ children, sky }: { children: ReactNode; sky?: string }) {
  const clip = `sc-frame-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 160 100" className={`h-auto w-full max-w-[220px] ${sky ? "" : "overflow-visible"}`} aria-hidden="true">
      {sky ? (
        <>
          <defs>
            <clipPath id={clip}>
              <rect x="0" y="0" width="160" height="100" rx="14" />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clip})`}>
            <rect x="0" y="0" width="160" height="100" fill={sky} />
            {children}
          </g>
        </>
      ) : (
        children
      )}
    </svg>
  );
}

// ——— Tendre ———

function Butterfly({ x, y, color, d }: { x: number; y: number; color: string; d: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="sc-drift" style={delay(d)}>
        <g className="sc-flap" style={delay(d)}>
          <path d="M0 0 C-14 -14 -22 -2 -12 6 C-18 14 -6 18 0 6 Z" fill={color} />
          <path d="M0 0 C14 -14 22 -2 12 6 C18 14 6 18 0 6 Z" fill={color} />
        </g>
        <rect x="-1" y="-4" width="2" height="14" rx="1" fill="#4a3b52" />
      </g>
    </g>
  );
}

const Butterflies = () => (
  <Scene>
    <Butterfly x={50} y={45} color="#f59ac2" d={0} />
    <Butterfly x={108} y={58} color="#9fb8ff" d={0.8} />
    <Butterfly x={82} y={26} color="#ffd27a" d={1.6} />
  </Scene>
);

const Blossom = () => (
  <Scene>
    <path d="M80 98 C80 80 78 70 80 58" stroke="#5f9b62" strokeWidth="4" fill="none" strokeLinecap="round" />
    <path d="M80 82 C66 76 62 68 64 64 C72 66 78 72 80 80" fill="#6fb574" />
    <g transform="translate(80 48)">
      <g className="sc-bloom">
        {[0, 60, 120, 180, 240, 300].map((r) => (
          <ellipse key={r} cx="0" cy="-15" rx="9" ry="15" fill="#f7a8c8" transform={`rotate(${r})`} />
        ))}
        <circle r="8" fill="#ffd166" />
      </g>
    </g>
  </Scene>
);

const HeartBubbles = () => (
  <Scene>
    {[
      [40, 0, "#ff6fa5", 1],
      [70, 1.1, "#ff9ac1", 0.8],
      [100, 0.5, "#e8508c", 1.2],
      [125, 1.7, "#ffb3cf", 0.7],
    ].map(([x, d, c, s]) => (
      <g key={x as number} transform={`translate(${x} 92) scale(${s})`}>
        <g className="sc-rise" style={delay(d as number)}>
          <path d="M0 6 C-10 -2 -8 -12 0 -7 C8 -12 10 -2 0 6 Z" fill={c as string} />
        </g>
      </g>
    ))}
  </Scene>
);

// ——— Ciel & nuit ———

const Stars = ({ list }: { list: [number, number, number][] }) => (
  <>
    {list.map(([x, y, d]) => (
      <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill="#fff8d6" className="sc-twinkle" style={delay(d)} />
    ))}
  </>
);

const Moon = () => (
  <Scene sky="#1c2143">
    <Stars list={[[20, 20, 0], [40, 70, 0.7], [130, 18, 1.2], [140, 60, 0.3], [70, 12, 1.6], [110, 82, 0.9]]} />
    <g className="sc-glow">
      <circle cx="84" cy="50" r="26" fill="#fff3c4" />
      <circle cx="96" cy="42" r="24" fill="#1c2143" />
    </g>
  </Scene>
);

const ShootingStars = () => (
  <Scene sky="#161a38">
    <Stars list={[[25, 30, 0.4], [60, 80, 1], [140, 40, 0.2], [100, 15, 1.4], [15, 75, 0.8]]} />
    {[0, 1.3, 2.4].map((d, i) => (
      <g key={d} transform={`translate(${30 + i * 30} ${10 + i * 12})`}>
        <g className="sc-shoot" style={delay(d)}>
          <line x1="0" y1="0" x2="-26" y2="-10" stroke="url(#sc-tail)" strokeWidth="2" strokeLinecap="round" />
          <circle r="2.2" fill="#fffbe6" />
        </g>
      </g>
    ))}
    <defs>
      <linearGradient id="sc-tail" x1="0" x2="1">
        <stop offset="0" stopColor="#fffbe6" stopOpacity="0" />
        <stop offset="1" stopColor="#fffbe6" />
      </linearGradient>
    </defs>
  </Scene>
);

const Aurora = () => (
  <Scene sky="#0f1731">
    <Stars list={[[20, 15, 0], [140, 12, 1], [120, 30, 0.5], [35, 40, 1.4]]} />
    <g className="sc-sway-x">
      <path d="M-10 60 C30 20 60 70 100 35 C130 10 150 40 170 25 L170 55 C140 70 120 45 90 70 C60 95 30 60 -10 85 Z" fill="#3ee6a8" opacity="0.45" />
    </g>
    <g className="sc-sway-x" style={delay(1.5)}>
      <path d="M-10 70 C25 40 55 85 95 55 C125 35 145 60 170 45 L170 70 C140 85 115 60 85 85 C55 105 25 75 -10 95 Z" fill="#8a7dff" opacity="0.4" />
    </g>
    <path d="M0 88 L30 80 L55 90 L90 78 L120 90 L160 82 L160 100 L0 100 Z" fill="#0a0f22" />
  </Scene>
);

// ——— Féerique ———

const Fairy = () => (
  <Scene sky="#20183b">
    {[0, 0.5, 1, 1.5].map((d, i) => (
      <circle key={d} cx={60 - i * 10} cy={62 + i * 5} r={2 - i * 0.3} fill="#ffe9a8" className="sc-twinkle" style={delay(d)} />
    ))}
    <g transform="translate(92 48) scale(1.7)">
      <g className="sc-hover">
        <circle r="16" fill="#fff3b0" opacity="0.22" className="sc-glow" />
        <g className="sc-flap">
          <path d="M-2 -4 C-16 -18 -24 -6 -14 0 C-20 6 -10 12 -2 2 Z" fill="#bfe7ff" opacity="0.9" />
          <path d="M2 -4 C16 -18 24 -6 14 0 C20 6 10 12 2 2 Z" fill="#bfe7ff" opacity="0.9" />
        </g>
        <path d="M-4 -4 L4 -4 L7 10 L-7 10 Z" fill="#f59ac2" />
        <circle cy="-8" r="4.2" fill="#ffd9c2" />
        <path d="M-4.5 -10 C-3 -14 3 -14 4.5 -10 C2 -11.5 -2 -11.5 -4.5 -10 Z" fill="#f2b84b" />
        <line x1="6" y1="0" x2="14" y2="-8" stroke="#fff3b0" strokeWidth="1" />
        <circle cx="14.5" cy="-8.5" r="1.6" fill="#fffbe0" className="sc-twinkle" />
      </g>
    </g>
  </Scene>
);

const Fireflies = () => (
  <Scene sky="#152a26">
    {[[30, 40, 0], [60, 25, 0.6], [95, 50, 1.2], [120, 30, 0.3], [140, 55, 0.9], [75, 62, 1.5], [45, 60, 1.9]].map(([x, y, d]) => (
      <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
        <g className="sc-wander" style={delay(d)}>
          <circle r="5" fill="#e9ff7a" opacity="0.25" className="sc-blink" style={delay(d)} />
          <circle r="1.8" fill="#f4ffb0" className="sc-blink" style={delay(d)} />
        </g>
      </g>
    ))}
    <path d="M0 100 C10 80 14 86 18 100 M22 100 C30 76 36 84 38 100 M130 100 C138 78 144 84 146 100 M150 100 C154 84 158 88 160 100" stroke="#2f6b4f" strokeWidth="3" fill="none" />
  </Scene>
);

const Mushrooms = () => (
  <Scene>
    <path d="M10 92 C50 84 110 84 150 92" stroke="#6f9a5c" strokeWidth="3" fill="none" />
    {[[55, 1.1], [100, 0.8]].map(([x, s]) => (
      <g key={x} transform={`translate(${x} 88) scale(${s})`}>
        <rect x="-6" y="-22" width="12" height="22" rx="5" fill="#f3e6d3" />
        <path d="M-24 -20 C-22 -44 22 -44 24 -20 Z" fill="#d9434f" />
        {[[-12, -30], [0, -36], [12, -28], [-4, -24]].map(([cx, cy]) => (
          <circle key={`${cx}`} cx={cx} cy={cy} r="3" fill="#fff5d6" className="sc-blink" style={delay((cx + 12) / 20)} />
        ))}
      </g>
    ))}
    {[0, 0.9, 1.8].map((d, i) => (
      <circle key={d} cx={70 + i * 12} cy="60" r="1.5" fill="#ffe9a8" className="sc-spore" style={delay(d)} />
    ))}
  </Scene>
);

// ——— Nature celtique ———

const Clover = () => (
  <Scene>
    <path d="M80 96 C80 80 82 70 80 58" stroke="#3f8f4f" strokeWidth="4" fill="none" strokeLinecap="round" />
    <g transform="translate(80 50)">
      <g className="sc-sway">
        {[0, 120, 240].map((r) => (
          <g key={r} transform={`rotate(${r})`}>
            <path d="M0 0 C-16 -6 -18 -26 -6 -26 C-2 -26 0 -22 0 -20 C0 -22 2 -26 6 -26 C18 -26 16 -6 0 0 Z" fill="#43a860" />
          </g>
        ))}
        <circle r="3" fill="#2f7d45" />
      </g>
    </g>
  </Scene>
);

const Fern = () => (
  <Scene>
    <path d="M80 98 L80 60" stroke="#4f8a3f" strokeWidth="3.5" strokeLinecap="round" />
    <g transform="translate(80 60)">
      <g className="sc-unfurl">
        <path d="M0 0 C0 -22 22 -30 26 -14 C29 -3 17 2 12 -5 C9 -10 14 -14 17 -11" stroke="#5aa447" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        {[[4, -12], [10, -20], [18, -24]].map(([x, y]) => (
          <ellipse key={x} cx={x} cy={y} rx="5" ry="2.5" fill="#6dbb58" transform={`rotate(-40 ${x} ${y})`} />
        ))}
      </g>
    </g>
    {[[62, 80, -30], [98, 76, 30], [66, 70, -25], [94, 66, 25]].map(([x, y, r]) => (
      <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="10" ry="3.5" fill="#63ae52" transform={`rotate(${r} ${x} ${y})`} />
    ))}
  </Scene>
);

const Leaves = () => (
  <Scene>
    {[[30, 0, "#e58a3a"], [70, 1.2, "#c9542c"], [105, 0.6, "#e8b64a"], [135, 1.8, "#b8612b"]].map(([x, d, c]) => (
      <g key={x as number} transform={`translate(${x} 0)`}>
        <g className="sc-fall" style={delay(d as number)}>
          <path d="M0 0 C8 -6 14 2 8 10 C4 14 -4 14 -8 8 C-12 2 -6 -4 0 0 Z M-6 10 L8 -2" fill={c as string} stroke="#7a3a1a" strokeWidth="0.8" />
        </g>
      </g>
    ))}
  </Scene>
);

const Triquetra = () => (
  <Scene>
    <g transform="translate(80 52)">
      <g className="sc-spin-slow">
        {/* Three lenses joining the corners of an equilateral triangle, two by two. */}
        <path
          className="sc-trace"
          d="M0 -26 A45 45 0 0 1 22.5 13 A45 45 0 0 1 0 -26 Z M22.5 13 A45 45 0 0 1 -22.5 13 A45 45 0 0 1 22.5 13 Z M-22.5 13 A45 45 0 0 1 0 -26 A45 45 0 0 1 -22.5 13 Z"
          fill="none"
          stroke="#2f8f6a"
          strokeWidth="3.2"
          strokeLinejoin="round"
        />
        <circle r="15" fill="none" stroke="#6cc5a0" strokeWidth="1.6" opacity="0.7" />
      </g>
    </g>
  </Scene>
);

// ——— Autres ———

const Rain = () => (
  <Scene>
    <g className="sc-hover">
      <path d="M40 40 C36 26 56 18 64 26 C70 12 96 12 100 28 C114 26 122 38 114 46 L44 46 C36 46 34 42 40 40 Z" fill="#b8c4d6" />
    </g>
    {[48, 60, 72, 84, 96, 108].map((x, i) => (
      <line key={x} x1={x} y1="52" x2={x - 3} y2="60" stroke="#7aa7e0" strokeWidth="2" strokeLinecap="round" className="sc-drop" style={delay(i * 0.23)} />
    ))}
    <path d="M20 96 C60 90 100 90 140 96" stroke="#6f9a5c" strokeWidth="3" fill="none" />
  </Scene>
);

const Waves = () => (
  <Scene sky="#dff1fb">
    <circle cx="125" cy="25" r="11" fill="#ffd27a" className="sc-glow" />
    <g className="sc-wave">
      <path d="M-40 60 C-30 52 -20 52 -10 60 S10 68 20 60 S40 52 50 60 S70 68 80 60 S100 52 110 60 S130 68 140 60 S160 52 170 60 S190 68 200 60 S220 52 230 60 S250 68 260 60 L260 100 L-40 100 Z" fill="#5fa8d3" />
    </g>
    <g className="sc-wave-back">
      <path d="M-40 72 C-30 66 -20 66 -10 72 S10 78 20 72 S40 66 50 72 S70 78 80 72 S100 66 110 72 S130 78 140 72 S160 66 170 72 S190 78 200 72 S220 66 230 72 S250 78 260 72 L260 100 L-40 100 Z" fill="#2f7fb5" />
    </g>
  </Scene>
);

const StandingStones = () => (
  <Scene sky="#1a1d3a">
    <Stars list={[[20, 18, 0], [45, 35, 1.1], [80, 12, 0.5], [118, 30, 1.6], [145, 16, 0.8], [100, 44, 1.3]]} />
    <circle cx="130" cy="28" r="7" fill="#fff3c4" className="sc-glow" />
    <path d="M0 86 C40 80 120 80 160 86 L160 100 L0 100 Z" fill="#26304f" />
    <path d="M40 86 L44 50 L56 48 L58 86 Z M72 86 L74 42 L88 40 L90 86 Z M104 86 L106 54 L118 56 L118 86 Z" fill="#6b7389" />
    <path d="M70 42 L92 40 L92 35 L70 37 Z" fill="#7b8399" />
  </Scene>
);

const Candle = () => (
  <Scene>
    <rect x="68" y="50" width="24" height="42" rx="4" fill="#f4e9d8" />
    <line x1="80" y1="50" x2="80" y2="44" stroke="#3b2f2f" strokeWidth="2" />
    <g transform="translate(80 38)">
      <circle r="14" fill="#ffd27a" opacity="0.25" className="sc-glow" />
      <g className="sc-flicker">
        <path d="M0 -16 C8 -6 7 4 0 6 C-7 4 -8 -6 0 -16 Z" fill="#ffb347" />
        <path d="M0 -8 C4 -3 3 3 0 4 C-3 3 -4 -3 0 -8 Z" fill="#fff1b8" />
      </g>
    </g>
  </Scene>
);

const Tea = () => (
  <Scene>
    {[0, 0.8, 1.6].map((d, i) => (
      <path key={d} d={`M${68 + i * 12} 44 C${62 + i * 12} 34 ${74 + i * 12} 30 ${68 + i * 12} 20`} stroke="#c9c2d6" strokeWidth="3" fill="none" strokeLinecap="round" className="sc-steam" style={delay(d)} />
    ))}
    <path d="M50 50 L110 50 C108 78 96 90 80 90 C64 90 52 78 50 50 Z" fill="#e7a0b8" />
    <path d="M108 56 C124 56 124 76 104 76" stroke="#e7a0b8" strokeWidth="5" fill="none" />
    <ellipse cx="80" cy="94" rx="40" ry="4" fill="#d6c7b8" />
  </Scene>
);

const Snow = () => (
  <Scene sky="#e8f1fb">
    {[[25, 0], [55, 1.4], [85, 0.6], [115, 2], [140, 1]].map(([x, d]) => (
      <g key={x} transform={`translate(${x} 0)`}>
        <g className="sc-snow" style={delay(d)}>
          <path d="M0 -5 L0 5 M-4.3 -2.5 L4.3 2.5 M-4.3 2.5 L4.3 -2.5" stroke="#8fb3dc" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      </g>
    ))}
    <path d="M0 88 C40 80 120 82 160 88 L160 100 L0 100 Z" fill="#ffffff" />
  </Scene>
);

/** Scene id → drawing. Ids are part of the stored widget (server allowlist). */
export const SCENES: Record<string, () => JSX.Element> = {
  butterflies: Butterflies,
  blossom: Blossom,
  "heart-bubbles": HeartBubbles,
  moon: Moon,
  "shooting-stars": ShootingStars,
  aurora: Aurora,
  fairy: Fairy,
  fireflies: Fireflies,
  mushrooms: Mushrooms,
  clover: Clover,
  fern: Fern,
  leaves: Leaves,
  triquetra: Triquetra,
  rain: Rain,
  waves: Waves,
  "standing-stones": StandingStones,
  candle: Candle,
  tea: Tea,
  snow: Snow,
};

/** The picker's groups (labels in French). */
export const SCENE_GROUPS: { group: string; items: [string, string][] }[] = [
  { group: "Tendre", items: [["butterflies", "Papillons"], ["blossom", "Fleur qui s'ouvre"], ["heart-bubbles", "Bulles de cœurs"]] },
  { group: "Ciel & nuit", items: [["moon", "Lune et étoiles"], ["shooting-stars", "Étoiles filantes"], ["aurora", "Aurore boréale"]] },
  { group: "Féerique", items: [["fairy", "Fée lumineuse"], ["fireflies", "Lucioles"], ["mushrooms", "Champignons magiques"]] },
  {
    group: "Nature celtique",
    items: [["clover", "Trèfle"], ["fern", "Crosse de fougère"], ["leaves", "Feuilles d'automne"], ["triquetra", "Triquetra"]],
  },
  {
    group: "Atmosphères",
    items: [["rain", "Pluie d'Irlande"], ["waves", "Vagues de la côte"], ["standing-stones", "Menhirs sous les étoiles"], ["candle", "Bougie"], ["tea", "Thé fumant"], ["snow", "Neige"]],
  },
];
