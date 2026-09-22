// Hand-drawn, chibi/Ghibli-cute cat keychain charm that dangles off the title
// and swings slowly like a real keychain. Pure inline SVG, theme-agnostic colors.
const CREAM = "#fff4e6";
const OUTLINE = "#4a3b33";
const PINK = "#ff86b8";
const BLUSH = "#ffb0d6";
const EYE = "#3a3350";
const GOLD = "#e6b354";

export function CatCharm({ width = 62, className = "" }: { width?: number; className?: string }) {
  return (
    <svg
      width={width}
      viewBox="0 0 60 132"
      fill="none"
      className={`animate-swing ${className}`}
      style={{ filter: "drop-shadow(0 6px 7px rgba(0,0,0,.35))" }}
      aria-hidden="true"
    >
      {/* Keyring + wire */}
      <circle cx="30" cy="10" r="6" stroke={GOLD} strokeWidth="3" />
      <path d="M30 16 C 27 28, 33 42, 30 54" stroke={GOLD} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="30" cy="56" r="2.6" fill={GOLD} />

      {/* Head */}
      <ellipse cx="30" cy="92" rx="23" ry="21" fill={CREAM} stroke={OUTLINE} strokeWidth="2.4" />

      {/* Ears */}
      <path d="M16 77 L10 59 L29 72 Z" fill={CREAM} stroke={OUTLINE} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M44 77 L50 59 L31 72 Z" fill={CREAM} stroke={OUTLINE} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M16 74 L13 63 L24 70 Z" fill={PINK} />
      <path d="M44 74 L47 63 L36 70 Z" fill={PINK} />

      {/* Eyes (big, with sparkle) */}
      <circle cx="23" cy="91" r="3.7" fill={EYE} />
      <circle cx="37" cy="91" r="3.7" fill={EYE} />
      <circle cx="24.3" cy="89.5" r="1.2" fill="#fff" />
      <circle cx="38.3" cy="89.5" r="1.2" fill="#fff" />

      {/* Blush */}
      <ellipse cx="16.5" cy="97" rx="3.6" ry="2.3" fill={BLUSH} opacity="0.7" />
      <ellipse cx="43.5" cy="97" rx="3.6" ry="2.3" fill={BLUSH} opacity="0.7" />

      {/* Nose + mouth */}
      <path d="M28.4 97 L31.6 97 L30 99.4 Z" fill={PINK} />
      <path d="M30 99.4 q-2.6 2.6 -5 1 M30 99.4 q2.6 2.6 5 1" stroke={OUTLINE} strokeWidth="1.8" strokeLinecap="round" />

      {/* Whiskers */}
      <path d="M13 94 L2 92 M13 98 L3 100.5" stroke={OUTLINE} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M47 94 L58 92 M47 98 L57 100.5" stroke={OUTLINE} strokeWidth="1.4" strokeLinecap="round" />

      {/* Little collar + heart bell */}
      <path d="M15 106 Q30 116 45 106" stroke={PINK} strokeWidth="3" strokeLinecap="round" />
      <path d="M30 111 v3" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M30 121 l-3.4 -3.4 a2.1 2.1 0 0 1 3.4 -0.5 a2.1 2.1 0 0 1 3.4 0.5 z" fill={PINK} stroke={OUTLINE} strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}
