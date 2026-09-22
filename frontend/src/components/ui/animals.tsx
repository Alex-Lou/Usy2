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
