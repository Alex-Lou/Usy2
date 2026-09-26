import { useId } from "react";
import type { Species } from "../../app/companion";
import siameseUrl from "../companions/chat.svg";
import otterFishUrl from "../companions/loutreFishBis-poisson.svg";
import otterUrl from "../companions/loutreHeadBis.svg";

// Hand-drawn, chibi/Ghibli-cute animal faces. Drawn in a 64×64 space with the
// head centered at (32,34). Reused as a standalone face, an empty-state mascot,
// and inside a swinging keychain charm on the login.

const OUTLINE = "#4a3b33";
const PINK = "#ff86b8";
const BLUSH = "#ffb0d6";
const EYE = "#3a3350";
const GOLD = "#e6b354";

const S = 2.4; // head stroke width

function Eyes({ closed = false }: { closed?: boolean }) {
  if (closed) {
    return <path d="M20.4 33.5 q3.6 3 7.2 0 M36.4 33.5 q3.6 3 7.2 0" stroke={EYE} strokeWidth="2" fill="none" strokeLinecap="round" />;
  }
  return (
    <g className="mc-face-eyes">
      {/* Inner group: the gaze wanders (styles/companions.css) while the outer one blinks. */}
      <g className="mc-face-look">
        <circle cx="24" cy="33" r="3.6" fill={EYE} />
        <circle cx="40" cy="33" r="3.6" fill={EYE} />
        <circle cx="25.2" cy="31.6" r="1.2" fill="#fff" />
        <circle cx="41.2" cy="31.6" r="1.2" fill="#fff" />
      </g>
    </g>
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
      <g className="mc-face-ear mc-face-ear--l">
        <path d="M19 16 L12 2 L32 13 Z" fill={outer} stroke={OUTLINE} strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M20 13 L16 5 L28 12 Z" fill={inner} />
      </g>
      <g className="mc-face-ear mc-face-ear--r">
        <path d="M45 16 L52 2 L32 13 Z" fill={outer} stroke={OUTLINE} strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M44 13 L48 5 L36 12 Z" fill={inner} />
      </g>
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

/**
 * The otter: Lou's partner's drawing (loutreHeadBis.svg, as drawn) with its fish
 * as a layer of its own (loutreFishBis-poisson.svg: the fish paths of
 * LoutreFishBis.svg, unchanged), so the fish can flap now and then. Eyelids
 * drawn over the eyes blink; the 2100 drawing box is fitted into the 64 box.
 * "otter-plain" is the same otter without its fish.
 */
const OTTER_FIT = "translate(32 33) scale(0.031) translate(-1050 -1124)";
const OTTER_EYES = [
  [687, 1140],
  [1407, 1134],
] as const;
const FISH_PIVOT = [1076, 1480] as const; // where the fish sits in the mouth

function OtterHead({ eyesClosed = false, fish = true }: { eyesClosed?: boolean; fish?: boolean }) {
  return (
    <g className="mc-face mc-face--otter" transform={OTTER_FIT}>
      <image href={otterUrl} x="0" y="0" width="2100" height="2100" />
      {fish && (
        <g transform={`translate(${FISH_PIVOT[0]} ${FISH_PIVOT[1]})`}>
          <g className="mc-otter-fish">
            <image href={otterFishUrl} x={-FISH_PIVOT[0]} y={-FISH_PIVOT[1]} width="2100" height="2100" />
          </g>
        </g>
      )}
      <g className={eyesClosed ? undefined : "mc-otter-lids"}>
        {OTTER_EYES.map(([x, y]) => (
          <g key={x}>
            <ellipse cx={x} cy={y - 2} rx="178" ry="140" fill="#9f8275" />
            <path d={`M${x - 150} ${y + 30} q150 90 300 0`} stroke="#2f241f" strokeWidth="34" strokeLinecap="round" fill="none" />
          </g>
        ))}
      </g>
    </g>
  );
}

/**
 * The Siamese cat: Lou's partner's drawing (chat.svg, as drawn). The tip of each
 * ear is the same drawing, cut to it, that flicks and folds now and then; the
 * whiskers (cut out too) twitch; eyelids drawn over the eyes blink. The 2100 drawing box is fitted into the 64 box.
 */
const SIAMESE_FIT = "translate(32 33) scale(0.045) translate(-1050 -993)";
const SIAMESE_EYES = [
  [774, 1094],
  [1321, 1097],
] as const;
// The top of each ear is cut out of the drawing (and the drawing below it
// left out: the ear can fold); it overlaps the rest a little below the cut.
const SIAMESE_EARS = [
  { side: "l", pivot: [600, 630], cut: "360,380 640,380 840,620 360,620", points: "360,380 640,380 857,640 360,640" },
  { side: "r", pivot: [1500, 630], cut: "1740,380 1460,380 1260,620 1740,620", points: "1740,380 1460,380 1243,640 1740,640" },
] as const;
// The whiskers of each cheek: shown cut out only while they twitch (at rest, the drawing).
const SIAMESE_WHISKERS = [
  { side: "l", pivot: [900, 1420], points: "640,1330 875,1330 875,1430 850,1462 740,1470 690,1445" },
  { side: "r", pivot: [1200, 1420], points: "1460,1330 1225,1330 1225,1430 1250,1462 1360,1470 1410,1445" },
] as const;

/** A piece of the Siamese drawing (clipped to {@code points}) that moves around {@code pivot}. */
function SiamesePiece({ clipId, pivot: [px, py], points, className }: { clipId: string; pivot: readonly [number, number]; points: string; className: string }) {
  return (
    <g transform={`translate(${px} ${py})`}>
      <clipPath id={clipId}>
        <polygon points={points} transform={`translate(${-px} ${-py})`} />
      </clipPath>
      <g className={className}>
        <image href={siameseUrl} x={-px} y={-py} width="2100" height="2100" clipPath={`url(#${clipId})`} />
      </g>
    </g>
  );
}

function SiameseHead({ eyesClosed = false }: { eyesClosed?: boolean }) {
  const id = useId().replace(/:/g, "");
  const cuts = SIAMESE_EARS.map(({ cut }) => `M${cut.replace(/ /g, " L")} Z`).join(" ");
  return (
    <g className="mc-face mc-face--siamese" transform={SIAMESE_FIT}>
      <clipPath id={`${id}-head`}>
        <path clipRule="evenodd" d={`M0 0 H2100 V2100 H0 Z ${cuts}`} />
      </clipPath>
      <image href={siameseUrl} x="0" y="0" width="2100" height="2100" clipPath={`url(#${id}-head)`} />
      {SIAMESE_EARS.map(({ side, pivot, points }) => (
        <SiamesePiece key={side} clipId={`${id}-ear-${side}`} pivot={pivot} points={points} className={`mc-siamese-ear mc-siamese-ear--${side}`} />
      ))}
      {SIAMESE_WHISKERS.map(({ side, pivot, points }) => (
        <SiamesePiece key={side} clipId={`${id}-whisk-${side}`} pivot={pivot} points={points} className={`mc-siamese-whisk mc-siamese-whisk--${side}`} />
      ))}
      <g className={eyesClosed ? undefined : "mc-siamese-lids"}>
        {SIAMESE_EYES.map(([x, y]) => (
          <g key={x}>
            <ellipse cx={x} cy={y} rx="152" ry="134" fill="#f3cda1" />
            <path d={`M${x - 130} ${y + 10} q130 80 260 0`} stroke="#5d4c36" strokeWidth="30" strokeLinecap="round" fill="none" />
          </g>
        ))}
      </g>
    </g>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
/** `eyesClosed`: asleep (the living companions nap). Cat and wolf blink and twitch (styles/companions.css). */
export function AnimalFace({ species, eyesClosed = false }: { species: Species; eyesClosed?: boolean }) {
  switch (species) {
    case "cat":
      return (
        <g className="mc-face mc-face--cat">
          {head("#fff4e6")}
          {pointyEars("#fff4e6", PINK)}
          <Eyes closed={eyesClosed} />
          <Blush />
          <NoseMouth />
          <g className="mc-face-whiskers mc-face-whiskers--l">
            <path d="M13 36 L2 34 M13 40 L3 42.5" stroke={OUTLINE} strokeWidth="1.4" strokeLinecap="round" />
          </g>
          <g className="mc-face-whiskers mc-face-whiskers--r">
            <path d="M51 36 L62 34 M51 40 L61 42.5" stroke={OUTLINE} strokeWidth="1.4" strokeLinecap="round" />
          </g>
        </g>
      );

    case "dog":
      return (
        <g>
          <ellipse cx="11" cy="38" rx="7" ry="13" fill="#c9975f" stroke={OUTLINE} strokeWidth="2.2" />
          <ellipse cx="53" cy="38" rx="7" ry="13" fill="#c9975f" stroke={OUTLINE} strokeWidth="2.2" />
          {head("#e9c49a")}
          <Eyes closed={eyesClosed} />
          <Blush />
          <ellipse cx="32" cy="41" rx="6" ry="4.4" fill="#fff7ee" stroke={OUTLINE} strokeWidth="1.4" />
          <ellipse cx="32" cy="39" rx="2.4" ry="1.8" fill={OUTLINE} />
          <path d="M32 43 q0 3 3 3.4" stroke={OUTLINE} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </g>
      );

    case "wolf":
      return (
        // A wolf, not a kitten: tall ears, fluffy cheek ruffs, a darker mask and a long pale muzzle.
        <g className="mc-face mc-face--wolf">
          <g className="mc-face-ear mc-face-ear--l">
            <path d="M17 19 L9 -3 L30 12 Z" fill="#8f97a3" stroke={OUTLINE} strokeWidth="2.2" strokeLinejoin="round" />
            <path d="M18 14 L13 3 L25 11 Z" fill="#e9dcdc" />
          </g>
          <g className="mc-face-ear mc-face-ear--r">
            <path d="M47 19 L55 -3 L34 12 Z" fill="#8f97a3" stroke={OUTLINE} strokeWidth="2.2" strokeLinejoin="round" />
            <path d="M46 14 L51 3 L39 11 Z" fill="#e9dcdc" />
          </g>
          {/* Cheek ruffs, poking out of the head. */}
          <path d="M11 34 l-9 4 l7 2 l-7 5 l9 1 l-4 5 l10 -3 z" fill="#e7ebf1" stroke={OUTLINE} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M53 34 l9 4 l-7 2 l7 5 l-9 1 l4 5 l-10 -3 z" fill="#e7ebf1" stroke={OUTLINE} strokeWidth="1.8" strokeLinejoin="round" />
          {head("#aab2be")}
          <path d="M12 30 q20 -26 40 0 q-8 -5 -14 -3 l-6 8 l-6 -8 q-6 -2 -14 3 z" fill="#7f8794" />
          <path d="M20 29 l6 1.5 M44 29 l-6 1.5" stroke={OUTLINE} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M20 44 q12 14 24 0 q-2 -9 -12 -9 q-10 0 -12 9 z" fill="#eef1f5" />
          <Eyes closed={eyesClosed} />
          <g className="mc-face-whiskers mc-face-whiskers--l">
            <path d="M22 43 L12 41.5 M22 45.5 L13 46.5" stroke={OUTLINE} strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
          </g>
          <g className="mc-face-whiskers mc-face-whiskers--r">
            <path d="M42 43 L52 41.5 M42 45.5 L51 46.5" stroke={OUTLINE} strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
          </g>
          <g className="mc-face-nose">
            <ellipse cx="32" cy="40" rx="4.2" ry="3" fill={OUTLINE} />
            <ellipse cx="30.8" cy="39.1" rx="1.2" ry="0.7" fill="#fff" opacity="0.7" />
          </g>
          <path d="M32 43 v2 M32 45 q-3 2.6 -6 1 M32 45 q3 2.6 6 1" stroke={OUTLINE} strokeWidth="1.6" fill="none" strokeLinecap="round" />
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
          <Eyes closed={eyesClosed} />
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
          <Eyes closed={eyesClosed} />
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
    case "otter":
      return <OtterHead eyesClosed={eyesClosed} />;
    case "otter-plain":
      return <OtterHead eyesClosed={eyesClosed} fish={false} />;
    case "siamese":
      return <SiameseHead eyesClosed={eyesClosed} />;
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

/** Below this size (avatars in the feed, the chat…) faces keep still: only the big ones come alive. */
const STILL_BELOW = 48;

// Standalone cute face.
/** `still`: no moves of its own (the default below 48 px); the avatar badge sets it false and plays its "hello" instead. */
export function Animal({ species, size = 64, className = "", still = size < STILL_BELOW }: { species: Species; size?: number; className?: string; still?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={(still ? "mc-still " : "") + className} aria-hidden="true">
      <g className="mc-head">
        <AnimalFace species={species} />
      </g>
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
