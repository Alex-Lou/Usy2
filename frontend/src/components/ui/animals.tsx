import { useId } from "react";
import type { Species } from "../../app/companion";
import siameseUrl from "../companions/chat.svg";
import siameseFoldUrl from "../companions/chatNoreille.svg";
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

function head(body: string) {
  return <ellipse cx="32" cy="34" rx="24" ry="22" fill={body} stroke={OUTLINE} strokeWidth={S} />;
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
 * The Siamese cat: Lou's partner's drawing (chat.svg, as drawn). The tip of the
 * left ear is the same drawing, cut to it, that flicks and folds now and then;
 * the right ear folds down for real, now and then: its corner of the drawing
 * gives way to the same corner of her second drawing (chatNoreille.svg, the ear
 * folded). The whiskers (cut out too) twitch; eyelids drawn over the eyes blink.
 * The 2100 drawing box is fitted into the 64 box.
 */
const SIAMESE_FIT = "translate(32 33) scale(0.045) translate(-1050 -993)";
const SIAMESE_EYES = [
  [774, 1094],
  [1321, 1097],
] as const;
// The top of the left ear is cut out of the drawing (and the drawing below it
// left out: the ear can fold); it overlaps the rest a little below the cut.
const SIAMESE_EARS = [
  { side: "l", pivot: [600, 630], cut: "360,380 640,380 840,620 360,620", points: "360,380 640,380 857,640 360,640" },
] as const;
// The corner around the right ear, where the two drawings differ, cut out of the
// head; its edge runs where they are alike (the dark tuft, then the cheek). The
// two pieces reach a little past it, so no seam shows along the cut.
const SIAMESE_FOLD = "1290,380 1800,380 1800,1140 1600,1140 1470,1000 1400,880 1330,800 1290,700";
const SIAMESE_FOLD_PIECE = "1272,370 1810,370 1810,1156 1592,1156 1455,1010 1386,892 1315,812 1272,704";
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
  const path = (points: string) => `M${points.replace(/ /g, " L")} Z`;
  const cuts = [...SIAMESE_EARS.map(({ cut }) => cut), SIAMESE_FOLD].map(path).join(" ");
  return (
    <g className="mc-face mc-face--siamese" transform={SIAMESE_FIT}>
      <clipPath id={`${id}-head`}>
        <path clipRule="evenodd" d={`M0 0 H2100 V2100 H0 Z ${cuts}`} />
      </clipPath>
      <image href={siameseUrl} x="0" y="0" width="2100" height="2100" clipPath={`url(#${id}-head)`} />
      <clipPath id={`${id}-fold`}>
        <polygon points={SIAMESE_FOLD_PIECE} />
      </clipPath>
      <image href={siameseUrl} x="0" y="0" width="2100" height="2100" clipPath={`url(#${id}-fold)`} className="mc-siamese-ear-up" />
      <image href={siameseFoldUrl} x="0" y="0" width="2100" height="2100" clipPath={`url(#${id}-fold)`} className="mc-siamese-ear-down" />
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

/**
 * The cat, chibi finish (same cream cat, same place for the eyes, ears and whiskers as before):
 * a soft « mochi » head with fluffy cheeks, cream fur in a gentle light, a shine on top and a
 * shade under the chin; rounded ears with a pink inside and a tuft; big anime eyes (a deep iris
 * that glows from below, two sparkles); heart nose, « ω » mouth, melting blush. Alive by the same
 * hooks as the others (blink, gaze, ears, whiskers: styles/companions.css), plus breathing, a
 * head tilt now and then and twinkling eyes. Gradients get ids of their own (several cats on a page).
 */
function ChibiCat({ closed }: { closed: boolean }) {
  const id = useId().replace(/:/g, "");
  const fur = `cf-${id}`;
  const ear = `ce-${id}`;
  const iris = `ci-${id}`;
  const blush = `cb-${id}`;
  const clip = `cc-${id}`;
  const shade = `cs-${id}`;
  const LINE = "#6e5242"; // a warm brown line, lighter than black: the soft look of chibi art
  // The head: a soft « mochi », wider at the cheeks, two fluffy tufts on each cheek and one on top.
  const HEAD =
    "M32 13.4 C33 11.6 34.6 10.8 35.4 11.4 C34.6 12.2 34.4 13 34.6 13.6 C46 14.6 54.8 21.6 56.2 31.4 C56.8 36 56.6 39.6 55.2 42.6 L58.2 43.4 L55.6 45 L57.4 46.6 L53.6 47.4 C50.2 53.4 42.4 57 32 57 C21.6 57 13.8 53.4 10.4 47.4 L6.6 46.6 L8.4 45 L5.8 43.4 L8.8 42.6 C7.4 39.6 7.2 36 7.8 31.4 C9.2 21.2 18.6 13.8 32 13.4 Z";
  const earPath = (m: 1 | -1) => {
    const x = (v: number) => (m === 1 ? v : 64 - v);
    return {
      outer: `M${x(12.6)} 23 C${x(11)} 16 ${x(10.8)} 9.4 ${x(12.4)} 5 C${x(12.8)} 4 ${x(13.8)} 3.8 ${x(14.6)} 4.4 C${x(19.8)} 7.6 ${x(24.6)} 11.4 ${x(28.6)} 15.6 Z`,
      inner: `M${x(14.8)} 19.6 C${x(14)} 15 ${x(14)} 11 ${x(15)} 8 C${x(18.4)} 10.2 ${x(21.4)} 12.8 ${x(24.2)} 15.8 Z`,
      tuft: `M${x(16.6)} 18.4 Q${x(17.8)} 14.2 ${x(16.4)} 10.6`,
    };
  };
  const l = earPath(1);
  const r = earPath(-1);
  // A big round anime eye: a deep iris glowing from below, a darker pupil, a lash line thin at
  // the nose and thick at the outer corner with two little lashes, two sparkles and a star.
  const eye = (cx: number) => {
    const out = cx < 32 ? -1 : 1; // the outer side
    const cy = 35.6;
    return (
      <g>
        <ellipse cx={cx} cy={cy} rx="6" ry="6.8" fill={`url(#${iris})`} />
        <ellipse cx={cx} cy={cy + 0.6} rx="2.9" ry="3.6" fill="#1c1428" opacity="0.55" />
        <path d={`M${cx - 4.4} ${cy + 3} Q${cx} ${cy + 7.2} ${cx + 4.4} ${cy + 3} Q${cx} ${cy + 5.2} ${cx - 4.4} ${cy + 3} Z`} fill="#c4a6ff" opacity="0.8" />
        <path
          d={`M${cx - out * 5.4} ${cy - 3.4} C${cx - out * 3.6} ${cy - 7.6} ${cx + out * 3.8} ${cy - 8.2} ${cx + out * 6.4} ${cy - 3.2}`}
          stroke={LINE}
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />
        <path d={`M${cx + out * 6.2} ${cy - 3.6} l${out * 1.8} -1.4 M${cx + out * 5.4} ${cy - 5.2} l${out * 1.4} -1.8`} stroke={LINE} strokeWidth="1.3" strokeLinecap="round" />
        <g className="mc-face-glint">
          <ellipse cx={cx + 2} cy={cy - 2.6} rx="2.2" ry="2.5" fill="#fff" />
          <circle cx={cx - 2.4} cy={cy + 2.6} r="1" fill="#fff" opacity="0.9" />
          <path d={`M${cx + 3.6} ${cy + 1.4} l0.5 1 1 0.5 -1 0.5 -0.5 1 -0.5 -1 -1 -0.5 1 -0.5 z`} fill="#fff" opacity="0.85" />
        </g>
      </g>
    );
  };
  return (
    <g className="mc-face mc-face--cat">
      <defs>
        <radialGradient id={fur} cx="40%" cy="28%" r="78%">
          <stop offset="0" stopColor="#fffdf8" />
          <stop offset="0.55" stopColor="#fff4e6" />
          <stop offset="1" stopColor="#f3d9bb" />
        </radialGradient>
        <linearGradient id={ear} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff94c2" />
          <stop offset="1" stopColor="#ffd0e2" />
        </linearGradient>
        <radialGradient id={iris} cx="50%" cy="75%" r="72%">
          <stop offset="0" stopColor="#8e6ad0" />
          <stop offset="0.5" stopColor="#4a3470" />
          <stop offset="1" stopColor="#2a1e40" />
        </radialGradient>
        <radialGradient id={blush} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ff8fbf" stopOpacity="0.8" />
          <stop offset="1" stopColor="#ff8fbf" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={shade} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#e0b48c" stopOpacity="0.55" />
          <stop offset="1" stopColor="#e0b48c" stopOpacity="0" />
        </radialGradient>
        <clipPath id={clip}>
          <path d={HEAD} />
        </clipPath>
      </defs>
      {/* Breathing, and a tilt of the head now and then (inner groups: still where faces keep still). */}
      <g className="mc-face-breathe">
        <g className="mc-face-tilt">
          <g className="mc-face-ear mc-face-ear--l">
            <path d={l.outer} fill={`url(#${fur})`} stroke={LINE} strokeWidth="1.9" strokeLinejoin="round" />
            <path d={l.inner} fill={`url(#${ear})`} />
            <path d={l.tuft} stroke="#fffaf2" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.9" />
          </g>
          <g className="mc-face-ear mc-face-ear--r">
            <path d={r.outer} fill={`url(#${fur})`} stroke={LINE} strokeWidth="1.9" strokeLinejoin="round" />
            <path d={r.inner} fill={`url(#${ear})`} />
            <path d={r.tuft} stroke="#fffaf2" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.9" />
          </g>
          <path d={HEAD} fill={`url(#${fur})`} stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
          <g clipPath={`url(#${clip})`}>
            <ellipse cx="32" cy="58" rx="21" ry="8.5" fill={`url(#${shade})`} />
            {/* A rim of light along the top, inside the line. */}
            <path d="M15 24 Q22 15.6 32 15.4 Q42 15.6 49 24" stroke="#fff" strokeWidth="1.4" opacity="0.6" fill="none" />
          </g>
          <path d="M20.6 20.6 Q26 16.6 31 16.4" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.85" fill="none" />
          {closed ? (
            <path d="M16.6 36.4 q5 3.8 10 0 M37.4 36.4 q5 3.8 10 0" stroke={LINE} strokeWidth="2.1" fill="none" strokeLinecap="round" />
          ) : (
            <g className="mc-face-eyes">
              <g className="mc-face-look">
                {eye(21.6)}
                {eye(42.4)}
              </g>
            </g>
          )}
          <ellipse cx="13.6" cy="44" rx="5.6" ry="3.4" fill={`url(#${blush})`} />
          <ellipse cx="50.4" cy="44" rx="5.6" ry="3.4" fill={`url(#${blush})`} />
          {/* The little blush strokes of chibi drawings. */}
          <path d="M11.6 44.6 l1.2 -1.8 M13.8 44.6 l1.2 -1.8 M16 44.6 l1.2 -1.8 M48 44.6 l1.2 -1.8 M50.2 44.6 l1.2 -1.8 M52.4 44.6 l1.2 -1.8" stroke="#f47aa8" strokeWidth="0.8" strokeLinecap="round" opacity="0.7" />
          <path d="M30.6 42.2 C30.6 41.1 31.7 40.8 32 41.7 C32.3 40.8 33.4 41.1 33.4 42.2 C33.4 43.1 32.6 43.7 32 44.1 C31.4 43.7 30.6 43.1 30.6 42.2 Z" fill={PINK} />
          <path d="M28.9 45.3 Q30.45 47 32 45.3 Q33.55 47 35.1 45.3" stroke={LINE} strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <g className="mc-face-whiskers mc-face-whiskers--l">
            <path d="M10.6 40.6 C7 39.8 4 39.8 1.4 40.4 M10.8 43 C7.4 43.4 4.4 44.4 2.2 45.8" stroke={LINE} strokeWidth="1" strokeLinecap="round" opacity="0.75" fill="none" />
          </g>
          <g className="mc-face-whiskers mc-face-whiskers--r">
            <path d="M53.4 40.6 C57 39.8 60 39.8 62.6 40.4 M53.2 43 C56.6 43.4 59.6 44.4 61.8 45.8" stroke={LINE} strokeWidth="1" strokeLinecap="round" opacity="0.75" fill="none" />
          </g>
        </g>
      </g>
    </g>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
/** `eyesClosed`: asleep (the living companions nap). Cat and wolf blink and twitch (styles/companions.css). */
export function AnimalFace({ species, eyesClosed = false }: { species: Species; eyesClosed?: boolean }) {
  switch (species) {
    case "cat":
      return <ChibiCat closed={eyesClosed} />;

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
