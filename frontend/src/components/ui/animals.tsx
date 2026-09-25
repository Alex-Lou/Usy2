import type { Species } from "../../app/companion";

// Hand-drawn, chibi/Ghibli-cute animal faces. Drawn in a 64×64 space with the
// head centered at (32,34). Reused as a standalone face, an empty-state mascot,
// and inside a swinging keychain charm on the login.

const OUTLINE = "#4a3b33";
const PINK = "#ff86b8";
const BLUSH = "#ffb0d6";
const EYE = "#3a3350";
const GOLD = "#e6b354";

const S = 2.4; // head stroke width

function Eyes() {
  return (
    <>
      <circle cx="24" cy="33" r="3.6" fill={EYE} />
      <circle cx="40" cy="33" r="3.6" fill={EYE} />
      <circle cx="25.2" cy="31.6" r="1.2" fill="#fff" />
      <circle cx="41.2" cy="31.6" r="1.2" fill="#fff" />
    </>
  );
}

function Blush() {
  return (
    <>
      <ellipse cx="16" cy="40" rx="3.6" ry="2.2" fill={BLUSH} opacity="0.7" />
      <ellipse cx="48" cy="40" rx="3.6" ry="2.2" fill={BLUSH} opacity="0.7" />
    </>
  );
}

function NoseMouth() {
  return (
    <>
      <path d="M30 39 L34 39 L32 41.6 Z" fill={PINK} />
      <path d="M32 41.6 q-2.6 2.4 -5 1 M32 41.6 q2.6 2.4 5 1" stroke={OUTLINE} strokeWidth="1.7" fill="none" strokeLinecap="round" />
    </>
  );
}

function head(body: string) {
  return <ellipse cx="32" cy="34" rx="24" ry="22" fill={body} stroke={OUTLINE} strokeWidth={S} />;
}

function pointyEars(outer: string, inner: string) {
  return (
    <>
      <path d="M19 16 L12 2 L32 13 Z" fill={outer} stroke={OUTLINE} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M45 16 L52 2 L32 13 Z" fill={outer} stroke={OUTLINE} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M20 13 L16 5 L28 12 Z" fill={inner} />
      <path d="M44 13 L48 5 L36 12 Z" fill={inner} />
    </>
  );
}

/**
 * The penguin's head in the 64 box: Lou's partner's drawing (the white mask, the
 * eyes and the beak, traced 300×300 and scaled in) on a navy head. Shared by the
 * companion face and the living penguin (components/penguin).
 */
export function PenguinHead({ eyesClosed = false }: { eyesClosed?: boolean }) {
  return (
    <>
      <ellipse cx="32" cy="33" rx="25" ry="23" fill="#2b2d42" stroke={OUTLINE} strokeWidth={S} />
      <g transform="translate(0 64) scale(0.02133 -0.02133)">
        <path
          fill="#fffaf2"
          d="M1148 2068 c71 -43 84 -117 81 -461 -4 -430 -3 -459 14 -517 30 -103 126 -164 257 -164 131 0 227 61 257 164 17 58 18 93 14 517 -3 349 10 417 85 464 52 32 132 31 199 -3 135 -69 243 -271 261 -489 4 -43 1 -150 -6 -239 l-13 -161 41 -42 c55 -57 82 -118 82 -190 0 -102 -51 -154 -181 -185 -66 -15 -144 -17 -739 -17 -595 0 -673 2 -739 17 -130 31 -181 83 -181 185 0 72 27 133 82 190 l41 42 -13 161 c-14 181 -9 282 20 389 77 276 281 434 438 339z"
        />
        {!eyesClosed && (
          <g className="mc-penguin-eyes">
            <path fill={EYE} d="M948 1487 c-20 -22 -68 -155 -68 -189 0 -56 53 -98 123 -98 74 0 127 58 127 140 0 47 -39 131 -72 154 -33 24 -86 20 -110 -7z" />
            <path fill={EYE} d="M1942 1494 c-33 -23 -72 -107 -72 -154 0 -84 53 -140 132 -140 43 0 54 4 84 34 20 20 34 44 34 58 0 38 -46 171 -68 195 -24 27 -77 31 -110 7z" />
          </g>
        )}
        <path className="mc-penguin-beak" fill="#f4a93b" d="M1561 1320 l40 -21 -18 -30 c-19 -32 -68 -79 -83 -79 -15 0 -64 47 -83 79 l-18 30 38 20 c49 26 74 26 124 1z" />
      </g>
      {eyesClosed && <path d="M18 36 q3.3 2.6 6.6 0 M39.4 36 q3.3 2.6 6.6 0" stroke={EYE} strokeWidth="1.8" fill="none" strokeLinecap="round" />}
    </>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function AnimalFace({ species }: { species: Species }) {
  switch (species) {
    case "cat":
      return (
        <g>
          {head("#fff4e6")}
          {pointyEars("#fff4e6", PINK)}
          <Eyes />
          <Blush />
          <NoseMouth />
          <path d="M13 36 L2 34 M13 40 L3 42.5" stroke={OUTLINE} strokeWidth="1.4" strokeLinecap="round" />
          <path d="M51 36 L62 34 M51 40 L61 42.5" stroke={OUTLINE} strokeWidth="1.4" strokeLinecap="round" />
        </g>
      );

    case "dog":
      return (
        <g>
          <ellipse cx="11" cy="38" rx="7" ry="13" fill="#c9975f" stroke={OUTLINE} strokeWidth="2.2" />
          <ellipse cx="53" cy="38" rx="7" ry="13" fill="#c9975f" stroke={OUTLINE} strokeWidth="2.2" />
          {head("#e9c49a")}
          <Eyes />
          <Blush />
          <ellipse cx="32" cy="41" rx="6" ry="4.4" fill="#fff7ee" stroke={OUTLINE} strokeWidth="1.4" />
          <ellipse cx="32" cy="39" rx="2.4" ry="1.8" fill={OUTLINE} />
          <path d="M32 43 q0 3 3 3.4" stroke={OUTLINE} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </g>
      );

    case "wolf":
      return (
        <g>
          {head("#b7bdc7")}
          {pointyEars("#b7bdc7", "#8a929e")}
          <ellipse cx="32" cy="42" rx="8" ry="6" fill="#e7ebf1" />
          <Eyes />
          <path d="M30 40 L34 40 L32 42.6 Z" fill={OUTLINE} />
          <path d="M32 42.6 q-2.6 2.2 -5 1 M32 42.6 q2.6 2.2 5 1" stroke={OUTLINE} strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </g>
      );

    case "rabbit":
      return (
        <g>
          <g transform="rotate(-10 24 10)">
            <ellipse cx="24" cy="9" rx="4.6" ry="13" fill="#fdf4ee" stroke={OUTLINE} strokeWidth="2.2" />
            <ellipse cx="24" cy="10" rx="2" ry="8.5" fill={PINK} />
          </g>
          <g transform="rotate(10 40 10)">
            <ellipse cx="40" cy="9" rx="4.6" ry="13" fill="#fdf4ee" stroke={OUTLINE} strokeWidth="2.2" />
            <ellipse cx="40" cy="10" rx="2" ry="8.5" fill={PINK} />
          </g>
          {head("#fdf4ee")}
          <Eyes />
          <Blush />
          <path d="M30 39 L34 39 L32 41.4 Z" fill={PINK} />
          <path d="M32 41.4 v2.2 M32 43.6 q-2 1.6 -4 1 M32 43.6 q2 1.6 4 1" stroke={OUTLINE} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </g>
      );

    case "lizard":
      return (
        <g>
          <path d="M24 13 L27 5 L30 13 Z M31 12 L34 4 L37 12 Z" fill="#5da84a" />
          {head("#86c96b")}
          <circle cx="24" cy="32" r="4.2" fill="#fff" stroke={OUTLINE} strokeWidth="1.4" />
          <circle cx="40" cy="32" r="4.2" fill="#fff" stroke={OUTLINE} strokeWidth="1.4" />
          <circle cx="24.5" cy="32" r="2.1" fill={EYE} />
          <circle cx="40.5" cy="32" r="2.1" fill={EYE} />
          <circle cx="29" cy="40" r="0.9" fill={OUTLINE} />
          <circle cx="35" cy="40" r="0.9" fill={OUTLINE} />
          <path d="M25 43 q7 4 14 0" stroke={OUTLINE} strokeWidth="1.7" fill="none" strokeLinecap="round" />
          <Blush />
        </g>
      );

    case "raccoon":
      return (
        <g>
          <circle cx="16" cy="16" r="7" fill="#b9c0c9" stroke={OUTLINE} strokeWidth="2.2" />
          <circle cx="48" cy="16" r="7" fill="#b9c0c9" stroke={OUTLINE} strokeWidth="2.2" />
          <circle cx="16" cy="16" r="3.2" fill="#6b7280" />
          <circle cx="48" cy="16" r="3.2" fill="#6b7280" />
          {head("#c4cbd4")}
          <path d="M13 31 Q22 26 32 31 Q42 26 51 31 Q49 41 40 38 Q34 35 32 37.5 Q30 35 24 38 Q15 41 13 31 Z" fill="#2b2f38" />
          <circle cx="24" cy="33" r="3.4" fill="#fff" />
          <circle cx="40" cy="33" r="3.4" fill="#fff" />
          <circle cx="24" cy="33" r="1.7" fill={EYE} />
          <circle cx="40" cy="33" r="1.7" fill={EYE} />
          <path d="M30 41 L34 41 L32 43.4 Z" fill={OUTLINE} />
          <Blush />
        </g>
      );

    case "capybara":
      return (
        <g>
          <circle cx="18" cy="15" r="4.4" fill="#8f5f3c" stroke={OUTLINE} strokeWidth="2" />
          <circle cx="46" cy="15" r="4.4" fill="#8f5f3c" stroke={OUTLINE} strokeWidth="2" />
          {head("#b07a4f")}
          <path d="M20 33 q4 3 8 0 M36 33 q4 3 8 0" stroke={EYE} strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <ellipse cx="32" cy="45" rx="13" ry="8.5" fill="#c99b74" stroke={OUTLINE} strokeWidth="1.6" />
          <circle cx="28.5" cy="43.5" r="1.1" fill={OUTLINE} />
          <circle cx="35.5" cy="43.5" r="1.1" fill={OUTLINE} />
          <path d="M28 48 q4 2.6 8 0" stroke={OUTLINE} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </g>
      );

    case "robin":
      return (
        <g>
          {head("#7a5a44")}
          <path d="M18 36 Q32 30 46 36 Q46 50 32 53 Q18 50 18 36 Z" fill="#e2703a" />
          <Eyes />
          <path d="M28 39 L36 39 L32 45 Z" fill="#f4b53f" stroke={OUTLINE} strokeWidth="1" strokeLinejoin="round" />
          <ellipse cx="15" cy="38" rx="3.4" ry="2.1" fill="#c85f2e" opacity="0.6" />
          <ellipse cx="49" cy="38" rx="3.4" ry="2.1" fill="#c85f2e" opacity="0.6" />
        </g>
      );

    case "penguin":
      // Drawn by Lou's partner (traced from her drawing, 300×300 scaled into the 64 box):
      // the white mask, the eyes and the beak are her shapes. It waddles, blinks and flaps.
      return (
        <g className="mc-penguin">
          <path className="mc-penguin-flap mc-penguin-flap--l" d="M11 44 q-8 4 -9 13 q7 -1 12 -8 z" fill="#2b2d42" stroke={OUTLINE} strokeWidth="1.6" strokeLinejoin="round" />
          <path className="mc-penguin-flap mc-penguin-flap--r" d="M53 44 q8 4 9 13 q-7 -1 -12 -8 z" fill="#2b2d42" stroke={OUTLINE} strokeWidth="1.6" strokeLinejoin="round" />
          <PenguinHead />
          <Blush />
        </g>
      );
    case "parrot":
      return (
        <g>
          <path d="M27 12 q-2 -8 3 -11 M32 11 q0 -9 4 -12 M37 12 q3 -8 -2 -11" stroke="#f4b53f" strokeWidth="3.4" fill="none" strokeLinecap="round" />
          {head("#3fa65b")}
          <ellipse cx="20" cy="40" rx="6" ry="4.5" fill="#e2534f" />
          <ellipse cx="44" cy="40" rx="6" ry="4.5" fill="#e2534f" />
          <circle cx="24" cy="32" r="4.6" fill="#fff" stroke={OUTLINE} strokeWidth="1.2" />
          <circle cx="40" cy="32" r="4.6" fill="#fff" stroke={OUTLINE} strokeWidth="1.2" />
          <circle cx="24" cy="32" r="2.3" fill={EYE} />
          <circle cx="40" cy="32" r="2.3" fill={EYE} />
          <path d="M27 37 q5 -1 8 3 q1 6 -4 6 q-6 0 -4 -9 z" fill="#4a4a55" stroke={OUTLINE} strokeWidth="1" strokeLinejoin="round" />
        </g>
      );
  }
}

// Standalone cute face.
export function Animal({ species, size = 64, className = "" }: { species: Species; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <AnimalFace species={species} />
    </svg>
  );
}

// Swinging keychain charm (ring + wire + animal), used on the login title.
export function AnimalCharm({ species, width = 56, className = "" }: { species: Species; width?: number; className?: string }) {
  return (
    <svg
      width={width}
      viewBox="0 0 64 150"
      fill="none"
      className={`animate-swing ${className}`}
      style={{ filter: "drop-shadow(0 6px 7px rgba(0,0,0,.35))" }}
      aria-hidden="true"
    >
      <circle cx="32" cy="10" r="6" stroke={GOLD} strokeWidth="3" />
      <path d="M32 16 C 29 30, 35 46, 32 58" stroke={GOLD} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="32" cy="60" r="2.6" fill={GOLD} />
      <g transform="translate(0,62)">
        <AnimalFace species={species} />
      </g>
    </svg>
  );
}
