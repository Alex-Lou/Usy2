// The cat's room, drawn in the same soft style: window (day or night with the
// real time), wooden floor, basket, bowl and a plant. Decorative only.

const OUTLINE = "#4a3b33";

export function isNight(date = new Date()): boolean {
  const h = date.getHours();
  return h >= 20 || h < 7;
}

export function Room({ night }: { night: boolean }) {
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="room-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={night ? "#2b2550" : "#f7e6d3"} />
          <stop offset="1" stopColor={night ? "#3a3163" : "#f1d9c2"} />
        </linearGradient>
        <linearGradient id="room-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={night ? "#0f1435" : "#8fd3ff"} />
          <stop offset="1" stopColor={night ? "#2a2f6b" : "#d4f0ff"} />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#room-wall)" />
      {/* Window */}
      <g>
        <rect x="244" y="34" width="112" height="92" rx="10" fill="url(#room-sky)" stroke={OUTLINE} strokeWidth="3" />
        {night ? (
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
        <path d="M300 34 v92 M244 80 h112" stroke={OUTLINE} strokeWidth="3" />
        <rect x="238" y="124" width="124" height="8" rx="3" fill="#c98f5f" stroke={OUTLINE} strokeWidth="2.4" />
      </g>
      {/* Frame on the wall */}
      <g>
        <rect x="46" y="44" width="64" height="50" rx="4" fill="#fff9f1" stroke={OUTLINE} strokeWidth="2.6" />
        <path d="M58 84 l14 -16 l10 10 l8 -8 l12 14 z" fill="#9fd1a4" />
        <circle cx="94" cy="58" r="5" fill="#ffb0d6" />
      </g>
      {/* Floor */}
      <rect x="0" y="206" width="400" height="94" fill={night ? "#6b4e3a" : "#d9a878"} />
      <g stroke={night ? "#5a402f" : "#c4935f"} strokeWidth="2">
        <path d="M0 232 H400 M0 262 H400" />
        <path d="M80 206 v26 M210 232 v30 M330 206 v26 M140 262 v38 M290 262 v38" />
      </g>
      <rect x="0" y="202" width="400" height="6" fill={night ? "#4d382a" : "#b98552"} />
      {/* Plant */}
      <g>
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
