import { useId, type ReactNode } from "react";
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

function Blush() {
  return (
    <>
      <ellipse cx="16" cy="40" rx="3.6" ry="2.2" fill={BLUSH} opacity="0.7" />
      <ellipse cx="48" cy="40" rx="3.6" ry="2.2" fill={BLUSH} opacity="0.7" />
    </>
  );
}

// ---- The chibi kit: what every chibi face shares (see ChibiCat, the model). ----

/** Ids of one face's gradients and clips, its own (several faces on a page). */
function useFaceIds() {
  const id = useId().replace(/:/g, "");
  return (name: string) => `${name}-${id}`;
}

/** The left-hand half of a face mirrored onto the right (absolute M L C Q, relative l q). */
function mirror(d: string): string {
  const flip = (n: string) => String(+(64 - Number(n)).toFixed(2));
  const neg = (n: string) => String(+(-Number(n)).toFixed(2));
  return d.replace(/([MLCQZlqz])([^MLCQZlqz]*)/g, (_, cmd: string, args: string) => {
    const nums = args.trim() ? args.trim().split(/[\s,]+/) : [];
    const abs = cmd === cmd.toUpperCase();
    return cmd + " " + nums.map((n, i) => (i % 2 === 0 ? (abs ? flip(n) : neg(n)) : n)).join(" ") + " ";
  });
}

/** Fur in a soft light from the top left: light, mid, shade. */
function Fur({ id, c }: { id: string; c: readonly [string, string, string] }) {
  return (
    <radialGradient id={id} cx="40%" cy="28%" r="78%">
      <stop offset="0" stopColor={c[0]} />
      <stop offset="0.55" stopColor={c[1]} />
      <stop offset="1" stopColor={c[2]} />
    </radialGradient>
  );
}

/** A deep iris that glows from below: glow, mid, deep. */
function Iris({ id, c }: { id: string; c: readonly [string, string, string] }) {
  return (
    <radialGradient id={id} cx="50%" cy="75%" r="72%">
      <stop offset="0" stopColor={c[0]} />
      <stop offset="0.5" stopColor={c[1]} />
      <stop offset="1" stopColor={c[2]} />
    </radialGradient>
  );
}

/** A soft spot of {@code color} fading out to its edge (blush, shade, glow). */
function Glow({ id, color, o }: { id: string; color: string; o: number }) {
  return (
    <radialGradient id={id} cx="50%" cy="50%" r="50%">
      <stop offset="0" stopColor={color} stopOpacity={o} />
      <stop offset="1" stopColor={color} stopOpacity="0" />
    </radialGradient>
  );
}

/** Top to bottom. */
function Fade({ id, c }: { id: string; c: readonly [string, string] }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={c[0]} />
      <stop offset="1" stopColor={c[1]} />
    </linearGradient>
  );
}

/**
 * A big round anime eye (the cat's, {@code s} its size): a deep iris glowing from below, a darker
 * pupil, a lash line thin at the nose and thick at the outer corner ({@code lash}) with two little
 * lashes ({@code lashes}), two sparkles and a star that twinkle.
 */
function AnimeEye({ cx, cy, iris, glow, line, s = 1, lash = true, lashes = true }: {
  cx: number; cy: number; iris: string; glow: string; line: string; s?: number; lash?: boolean; lashes?: boolean;
}) {
  const out = cx < 32 ? -1 : 1; // the outer side
  return (
    <g transform={`translate(${cx} ${cy}) scale(${s})`}>
      <ellipse rx="6" ry="6.8" fill={`url(#${iris})`} />
      <ellipse cy="0.6" rx="2.9" ry="3.6" fill="#1c1428" opacity="0.55" />
      <path d="M-4.4 3 Q0 7.2 4.4 3 Q0 5.2 -4.4 3 Z" fill={glow} opacity="0.8" />
      {lash && (
        <path d={`M${-out * 5.4} -3.4 C${-out * 3.6} -7.6 ${out * 3.8} -8.2 ${out * 6.4} -3.2`} stroke={line} strokeWidth="2.2" strokeLinecap="round" fill="none" />
      )}
      {lash && lashes && (
        <path d={`M${out * 6.2} -3.6 l${out * 1.8} -1.4 M${out * 5.4} -5.2 l${out * 1.4} -1.8`} stroke={line} strokeWidth="1.3" strokeLinecap="round" />
      )}
      <g className="mc-face-glint">
        <ellipse cx="2" cy="-2.6" rx="2.2" ry="2.5" fill="#fff" />
        <circle cx="-2.4" cy="2.6" r="1" fill="#fff" opacity="0.9" />
        <path d="M3.6 1.4 l0.5 1 1 0.5 -1 0.5 -0.5 1 -0.5 -1 -1 -0.5 1 -0.5 z" fill="#fff" opacity="0.85" />
      </g>
    </g>
  );
}

/** Two eyes that blink, the gaze wandering (styles/companions.css); asleep, two smiling lines. */
function ChibiEyes({ closed, l, r, cy, s = 1, line, ...eye }: {
  closed: boolean; l: number; r: number; cy: number; s?: number; line: string; iris: string; glow: string; lash?: boolean; lashes?: boolean;
}) {
  if (closed) {
    const shut = (cx: number) => `M${cx - 5 * s} ${cy + 0.8} q${5 * s} ${3.8 * s} ${10 * s} 0`;
    return <path d={`${shut(l)} ${shut(r)}`} stroke={line} strokeWidth="2.1" fill="none" strokeLinecap="round" />;
  }
  return (
    <g className="mc-face-eyes">
      <g className="mc-face-look">
        <AnimeEye cx={l} cy={cy} s={s} line={line} {...eye} />
        <AnimeEye cx={r} cy={cy} s={s} line={line} {...eye} />
      </g>
    </g>
  );
}

/** Melting blush on both cheeks ({@code x} the left one), with the little strokes of chibi drawings. */
function Cheeks({ id, x, y, hatch = "#f47aa8" }: { id: string; x: number; y: number; hatch?: string | null }) {
  const strokes = (cx: number) => [-2, 0.2, 2.4].map((dx) => `M${cx + dx} ${y + 0.6} l1.2 -1.8`).join(" ");
  return (
    <>
      <ellipse cx={x} cy={y} rx="5.6" ry="3.4" fill={`url(#${id})`} />
      <ellipse cx={64 - x} cy={y} rx="5.6" ry="3.4" fill={`url(#${id})`} />
      {hatch && <path d={`${strokes(x)} ${strokes(64 - x - 2.4)}`} stroke={hatch} strokeWidth="0.8" strokeLinecap="round" opacity="0.7" />}
    </>
  );
}

/** Three little stars around the head that twinkle in turn, a touch of magic (hidden when still). */
const SPARKLES = [
  [5.4, 14, 1],
  [59, 24, 0.75],
  [57.6, 58, 0.9],
] as const;

function Sparkles() {
  return (
    <>
      {SPARKLES.map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
          <g className={`mc-face-sparkle mc-face-sparkle--${i}`}>
            <path d="M0 -3.4 C0.4 -0.9 0.9 -0.4 3.4 0 C0.9 0.4 0.4 0.9 0 3.4 C-0.4 0.9 -0.9 0.4 -3.4 0 C-0.9 -0.4 -0.4 -0.9 0 -3.4 Z" fill="#ffd66b" />
            <circle r="0.9" fill="#fffbe8" />
          </g>
        </g>
      ))}
    </>
  );
}

/** A chibi face: breathing, and a tilt of the head now and then (still where faces keep still). */
function Chibi({ kind, defs, children }: { kind: string; defs: ReactNode; children: ReactNode }) {
  return (
    <g className={`mc-face mc-face--${kind}`}>
      <defs>{defs}</defs>
      <g className="mc-face-breathe">
        <g className="mc-face-tilt">{children}</g>
      </g>
      <Sparkles />
    </g>
  );
}

/** The light on a head: a shade under the chin and a rim along the top (clipped to the head), a shine. */
function HeadLight({ clip, shade, rim = "M15 24 Q22 15.6 32 15.4 Q42 15.6 49 24", shine = "M20.6 20.6 Q26 16.6 31 16.4" }: {
  clip: string; shade: string; rim?: string; shine?: string;
}) {
  return (
    <>
      <g clipPath={`url(#${clip})`}>
        <ellipse cx="32" cy="58" rx="21" ry="8.5" fill={`url(#${shade})`} />
        <path d={rim} stroke="#fff" strokeWidth="1.4" opacity="0.6" fill="none" />
      </g>
      <path d={shine} stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.85" fill="none" />
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
    <g className="mc-face mc-face--otter">
      {/* Her drawing, untouched: it only breathes, tilts its head, and its eyes twinkle. */}
      <g className="mc-face-breathe">
        <g className="mc-face-tilt">
          <g transform={OTTER_FIT}>
            <image href={otterUrl} x="0" y="0" width="2100" height="2100" />
            {fish && (
              <g transform={`translate(${FISH_PIVOT[0]} ${FISH_PIVOT[1]})`}>
                <g className="mc-otter-fish">
                  <image href={otterFishUrl} x={-FISH_PIVOT[0]} y={-FISH_PIVOT[1]} width="2100" height="2100" />
                </g>
              </g>
            )}
            {OTTER_EYES.map(([x, y]) => (
              <DrawingGlint key={x} x={x - 30} y={y - 30} />
            ))}
            <g className={eyesClosed ? undefined : "mc-otter-lids"}>
              {OTTER_EYES.map(([x, y]) => (
                <g key={x}>
                  <ellipse cx={x} cy={y - 2} rx="178" ry="140" fill="#9f8275" />
                  <path d={`M${x - 150} ${y + 30} q150 90 300 0`} stroke="#2f241f" strokeWidth="34" strokeLinecap="round" fill="none" />
                </g>
              ))}
            </g>
          </g>
        </g>
      </g>
      {/* Little bubbles rising, as if it had just come out of the water. */}
      {[
        [8.4, 50, 2.2],
        [56.6, 48, 1.7],
        [52, 57, 1.3],
      ].map(([x, y, r], i) => (
        <circle key={i} className={`mc-face-bubble mc-face-bubble--${i}`} cx={x} cy={y} r={r} fill="#dff4ff" fillOpacity="0.3" stroke="#a9dcff" strokeWidth="0.8" />
      ))}
      <Sparkles />
    </g>
  );
}

/** A twinkle in the eye of a drawing (its 2100 box), drawn under the eyelids. */
function DrawingGlint({ x, y }: { x: number; y: number }) {
  return (
    <g className="mc-face-glint">
      <ellipse cx={x} cy={y} rx="46" ry="52" fill="#fff" />
      <circle cx={x + 84} cy={y + 96} r="20" fill="#fff" opacity="0.85" />
      <path d={`M${x + 104} ${y - 8} l12 26 26 12 -26 12 -12 26 -12 -26 -26 -12 26 -12 z`} fill="#fff" opacity="0.9" />
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
    <g className="mc-face mc-face--siamese">
      {/* Her drawing, untouched: it breathes, tilts its head, and its eyes twinkle. */}
      <g className="mc-face-breathe">
        <g className="mc-face-tilt">
          <g transform={SIAMESE_FIT}>
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
            {SIAMESE_EYES.map(([x, y]) => (
              <DrawingGlint key={x} x={x - 34} y={y - 36} />
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
        </g>
      </g>
      <Sparkles />
    </g>
  );
}

/**
 * The cat, chibi finish (same cream cat, same place for the eyes, ears and whiskers as before):
 * a soft « mochi » head with fluffy cheeks, cream fur in a gentle light, a shine on top and a
 * shade under the chin; rounded ears with a pink inside and a tuft; big anime eyes (a deep iris
 * that glows from below, two sparkles); heart nose, « ω » mouth, melting blush. Alive by the same
 * hooks as the others (blink, gaze, ears, whiskers: styles/companions.css), plus breathing, a
 * head tilt now and then and twinkling eyes. Every chibi face below is drawn the same way.
 */
function ChibiCat({ closed }: { closed: boolean }) {
  const ids = useFaceIds();
  const LINE = "#6e5242"; // a warm brown line, lighter than black: the soft look of chibi art
  // The head: a soft « mochi », wider at the cheeks, two fluffy tufts on each cheek and one on top.
  const HEAD =
    "M32 13.4 C33 11.6 34.6 10.8 35.4 11.4 C34.6 12.2 34.4 13 34.6 13.6 C46 14.6 54.8 21.6 56.2 31.4 C56.8 36 56.6 39.6 55.2 42.6 L58.2 43.4 L55.6 45 L57.4 46.6 L53.6 47.4 C50.2 53.4 42.4 57 32 57 C21.6 57 13.8 53.4 10.4 47.4 L6.6 46.6 L8.4 45 L5.8 43.4 L8.8 42.6 C7.4 39.6 7.2 36 7.8 31.4 C9.2 21.2 18.6 13.8 32 13.4 Z";
  const EAR = "M12.6 23 C11 16 10.8 9.4 12.4 5 C12.8 4 13.8 3.8 14.6 4.4 C19.8 7.6 24.6 11.4 28.6 15.6 Z";
  const INNER = "M14.8 19.6 C14 15 14 11 15 8 C18.4 10.2 21.4 12.8 24.2 15.8 Z";
  const TUFT = "M16.6 18.4 Q17.8 14.2 16.4 10.6";
  const WHISKERS = "M10.6 40.6 C7 39.8 4 39.8 1.4 40.4 M10.8 43 C7.4 43.4 4.4 44.4 2.2 45.8";
  const ear = (side: "l" | "r", m: (d: string) => string) => (
    <g className={`mc-face-ear mc-face-ear--${side}`}>
      <path d={m(EAR)} fill={`url(#${ids("fur")})`} stroke={LINE} strokeWidth="1.9" strokeLinejoin="round" />
      <path d={m(INNER)} fill={`url(#${ids("ear")})`} />
      <path d={m(TUFT)} stroke="#fffaf2" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.9" />
    </g>
  );
  return (
    <Chibi
      kind="cat"
      defs={
        <>
          <Fur id={ids("fur")} c={["#fffdf8", "#fff4e6", "#f3d9bb"]} />
          <Fade id={ids("ear")} c={["#ff94c2", "#ffd0e2"]} />
          <Iris id={ids("iris")} c={["#8e6ad0", "#4a3470", "#2a1e40"]} />
          <Glow id={ids("blush")} color="#ff8fbf" o={0.8} />
          <Glow id={ids("shade")} color="#e0b48c" o={0.55} />
          <clipPath id={ids("clip")}>
            <path d={HEAD} />
          </clipPath>
        </>
      }
    >
      {ear("l", (d) => d)}
      {ear("r", mirror)}
      <path d={HEAD} fill={`url(#${ids("fur")})`} stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
      <HeadLight clip={ids("clip")} shade={ids("shade")} />
      <ChibiEyes closed={closed} l={21.6} r={42.4} cy={35.6} line={LINE} iris={ids("iris")} glow="#c4a6ff" />
      <Cheeks id={ids("blush")} x={13.6} y={44} />
      <path d="M30.6 42.2 C30.6 41.1 31.7 40.8 32 41.7 C32.3 40.8 33.4 41.1 33.4 42.2 C33.4 43.1 32.6 43.7 32 44.1 C31.4 43.7 30.6 43.1 30.6 42.2 Z" fill={PINK} />
      <path d="M28.9 45.3 Q30.45 47 32 45.3 Q33.55 47 35.1 45.3" stroke={LINE} strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <g className="mc-face-whiskers mc-face-whiskers--l">
        <path d={WHISKERS} stroke={LINE} strokeWidth="1" strokeLinecap="round" opacity="0.75" fill="none" />
      </g>
      <g className="mc-face-whiskers mc-face-whiskers--r">
        <path d={mirror(WHISKERS)} stroke={LINE} strokeWidth="1" strokeLinecap="round" opacity="0.75" fill="none" />
      </g>
    </Chibi>
  );
}

/** A shiny dark nose that sniffs now and then (its path, and where its shine sits). */
function Nose({ id, d, shine: [x, y] }: { id: string; d: string; shine: readonly [number, number] }) {
  return (
    <g className="mc-face-nose">
      <path d={d} fill={`url(#${id})`} />
      <ellipse cx={x} cy={y} rx="1.3" ry="0.6" fill="#fff" opacity="0.85" />
    </g>
  );
}

/** The dog: the same tan pup with its floppy brown ears and cream muzzle; it pants now and then. */
function ChibiDog({ closed }: { closed: boolean }) {
  const ids = useFaceIds();
  const LINE = "#6b4a33";
  const HEAD =
    "M28.4 13.1 C29 10.6 30.8 9.2 32.8 9.6 C31.9 10.5 31.7 11.5 32.2 12.5 C33.2 11.2 34.9 10.9 36.2 11.6 C35.4 12.1 35 12.8 35 13.5 C46.6 15 55.4 23.2 55.8 33.6 C56.2 46.6 46 56.6 32 56.6 C18 56.6 7.8 46.6 8.2 33.6 C8.6 22 17.4 14 28.4 13.1 Z";
  // Floppy ears, hanging over the sides of the head; they swing around where they are attached.
  const EAR =
    "M21.6 16.2 C15.6 14.8 9.2 17.4 6.6 23.6 C4.4 29 4.6 37.6 7 43.6 C8.2 46.6 11.6 46.8 12.8 43.8 C14 40.4 13.6 35.8 14.6 31.8 C15.6 27.4 18.6 22.8 23.6 19.4 C23.4 18 22.8 16.8 21.6 16.2 Z";
  const EAR_SHINE = "M18 18.4 C13.8 18.4 10.6 20.8 9.2 25";
  const ear = (side: "l" | "r", m: (d: string) => string) => (
    <g className={`mc-face-ear mc-face-ear--${side}`}>
      <path d={m(EAR)} fill={`url(#${ids("ear")})`} stroke={LINE} strokeWidth="1.9" strokeLinejoin="round" />
      <path d={m(EAR_SHINE)} stroke="#fff" strokeWidth="1.2" strokeLinecap="round" opacity="0.45" fill="none" />
    </g>
  );
  return (
    <Chibi
      kind="dog"
      defs={
        <>
          <Fur id={ids("fur")} c={["#f8dcb6", "#e9c49a", "#cf9f6e"]} />
          <Fur id={ids("ear")} c={["#ddb07e", "#c9975f", "#a2703f"]} />
          <Fur id={ids("muzzle")} c={["#fffdf9", "#fff7ee", "#f1dcc4"]} />
          <Fur id={ids("nose")} c={["#5a4038", "#2e201a", "#140c08"]} />
          <Iris id={ids("iris")} c={["#c98a4a", "#6a3c1c", "#2e1a0e"]} />
          <Glow id={ids("blush")} color="#ff8fbf" o={0.75} />
          <Glow id={ids("shade")} color="#c08a58" o={0.5} />
          <clipPath id={ids("clip")}>
            <path d={HEAD} />
          </clipPath>
        </>
      }
    >
      <path d={HEAD} fill={`url(#${ids("fur")})`} stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
      <HeadLight clip={ids("clip")} shade={ids("shade")} />
      <Cheeks id={ids("blush")} x={16.4} y={43.6} />
      <path d="M32 37.6 C37.4 37.6 41 40.6 41 44.4 C41 48.4 37 50.8 32 50.8 C27 50.8 23 48.4 23 44.4 C23 40.6 26.6 37.6 32 37.6 Z" fill={`url(#${ids("muzzle")})`} stroke={LINE} strokeWidth="1" opacity="0.98" strokeOpacity="0.35" />
      <g className="mc-face-tongue">
        <path d="M30.4 45.4 C30.4 48.6 31.2 49.6 32 49.6 C32.8 49.6 33.6 48.6 33.6 45.4 Z" fill="#ff7fa3" stroke={LINE} strokeWidth="0.9" strokeLinejoin="round" />
        <path d="M32 46.4 V48" stroke="#e0607f" strokeWidth="0.7" strokeLinecap="round" />
      </g>
      <path d="M32 43.2 V45 M28.4 44.6 Q30.2 46.8 32 45 Q33.8 46.8 35.6 44.6" stroke={LINE} strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Nose id={ids("nose")} d="M28.4 40.2 C28.4 38.6 35.6 38.6 35.6 40.2 C35.6 41.9 33.4 43.3 32 43.3 C30.6 43.3 28.4 41.9 28.4 40.2 Z" shine={[30.6, 39.8]} />
      {ear("l", (d) => d)}
      {ear("r", mirror)}
      <ChibiEyes closed={closed} l={21.4} r={42.6} cy={34} s={0.92} line={LINE} iris={ids("iris")} glow="#ffc98a" lashes={false} />
    </Chibi>
  );
}

/**
 * The wolf, not a kitten: the same tall ears, fluffy cheek ruffs, darker mask with its brows and
 * long pale muzzle; amber eyes and a tiny fang. The liveliest face (styles/companions.css).
 */
function ChibiWolf({ closed }: { closed: boolean }) {
  const ids = useFaceIds();
  const LINE = "#4b4f5c";
  const HEAD = "M32 12.4 C45.4 12.4 55.6 21.4 55.8 33.2 C56 46.2 45.6 56.4 32 56.4 C18.4 56.4 8 46.2 8.2 33.2 C8.4 21.4 18.6 12.4 32 12.4 Z";
  const EAR = "M15.4 21.4 C12.2 14.4 10.6 7.4 11 1.8 C11.1 0.6 12.3 0.1 13.3 0.8 C19 4.8 24.8 9.6 29.8 14.2 Z";
  const INNER = "M16.8 16.8 C15 12 14.4 7.6 14.8 4.4 C18.6 7.2 22 10.4 25.2 13.4 Z";
  const FLUFF = "M17.4 16.6 Q19.6 13.2 18.4 9.4 M20.6 15.2 Q22 12.6 21.2 10.4";
  const RUFF = "M13 30 Q6.4 29.6 2 32.6 Q5.6 33.8 7.4 35.6 Q2.6 38.4 1.4 42.4 Q5.4 41.8 8.4 42.6 Q5.6 45.8 6 49.6 Q10.6 46.8 15 46.4 Z";
  const WHISKERS = "M24 44 C20.4 43 16.6 42.8 13.4 43.4 M24.2 46.4 C20.8 46.6 17.6 47.6 15 49";
  const ear = (side: "l" | "r", m: (d: string) => string) => (
    <g className={`mc-face-ear mc-face-ear--${side}`}>
      <path d={m(EAR)} fill={`url(#${ids("ear")})`} stroke={LINE} strokeWidth="1.9" strokeLinejoin="round" />
      <path d={m(INNER)} fill={`url(#${ids("inner")})`} />
      <path d={m(FLUFF)} stroke="#fff" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.9" />
    </g>
  );
  return (
    <Chibi
      kind="wolf"
      defs={
        <>
          <Fur id={ids("fur")} c={["#d8dde5", "#b4bcc8", "#8e97a5"]} />
          <Fur id={ids("mask")} c={["#9aa3b1", "#7f8794", "#646c79"]} />
          <Fur id={ids("pale")} c={["#ffffff", "#f1f4f8", "#d9dee6"]} />
          <Fur id={ids("nose")} c={["#4a4e5a", "#25272e", "#121318"]} />
          <Fade id={ids("ear")} c={["#6c7584", "#a7afbb"]} />
          <Fade id={ids("inner")} c={["#e4cfd4", "#f6eef0"]} />
          <Iris id={ids("iris")} c={["#ffd36a", "#d98a1e", "#5e330c"]} />
          <Glow id={ids("blush")} color="#ff8fbf" o={0.6} />
          <Glow id={ids("shade")} color="#7d8696" o={0.45} />
          <clipPath id={ids("clip")}>
            <path d={HEAD} />
          </clipPath>
        </>
      }
    >
      {ear("l", (d) => d)}
      {ear("r", mirror)}
      {[RUFF, mirror(RUFF)].map((d) => (
        <path key={d} d={d} fill={`url(#${ids("pale")})`} stroke={LINE} strokeWidth="1.8" strokeLinejoin="round" />
      ))}
      <path d={HEAD} fill={`url(#${ids("fur")})`} stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
      <g clipPath={`url(#${ids("clip")})`}>
        {/* The darker mask, coming down between the eyes to the nose. */}
        <path d="M9.4 29.6 C11.6 18 20.6 11 32 11 C43.4 11 52.4 18 54.6 29.6 C50 26.4 44.8 25.8 40 27 C36.6 27.8 34 30.8 32 35 C30 30.8 27.4 27.8 24 27 C19.2 25.8 14 26.4 9.4 29.6 Z" fill={`url(#${ids("mask")})`} />
      </g>
      <HeadLight clip={ids("clip")} shade={ids("shade")} />
      <path d="M17.6 28.4 Q20.8 27.4 24.4 28.8 M46.4 28.4 Q43.2 27.4 39.6 28.8" stroke={LINE} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M19.4 44.2 C19.4 38.6 25 35.6 32 35.6 C39 35.6 44.6 38.6 44.6 44.2 C44.6 50.8 39 55.4 32 55.4 C25 55.4 19.4 50.8 19.4 44.2 Z" fill={`url(#${ids("pale")})`} />
      <Cheeks id={ids("blush")} x={15.8} y={44.6} />
      <ChibiEyes closed={closed} l={21.4} r={42.6} cy={35.2} s={0.93} line={LINE} iris={ids("iris")} glow="#ffe9a8" lashes={false} />
      <g className="mc-face-whiskers mc-face-whiskers--l">
        <path d={WHISKERS} stroke={LINE} strokeWidth="1" strokeLinecap="round" opacity="0.7" fill="none" />
      </g>
      <g className="mc-face-whiskers mc-face-whiskers--r">
        <path d={mirror(WHISKERS)} stroke={LINE} strokeWidth="1" strokeLinecap="round" opacity="0.7" fill="none" />
      </g>
      <path d="M34.6 46.9 L35.3 48.6 L36 46.7" fill="#fff" stroke={LINE} strokeWidth="0.6" strokeLinejoin="round" />
      <path d="M32 43.8 V45.6 M32 45.6 Q29.4 48 26.8 46.6 M32 45.6 Q34.6 48 37.2 46.6" stroke={LINE} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <Nose id={ids("nose")} d="M27.8 40.2 C27.8 38.4 36.2 38.4 36.2 40.2 C36.2 42.2 33.8 43.8 32 43.8 C30.2 43.8 27.8 42.2 27.8 40.2 Z" shine={[30.4, 39.6]} />
    </Chibi>
  );
}

/** The rabbit: the same white bunny with long pink-lined ears; two front teeth, a twitching nose. */
function ChibiRabbit({ closed }: { closed: boolean }) {
  const ids = useFaceIds();
  const LINE = "#7a5656";
  const HEAD =
    "M29.6 15.8 C30.2 13.6 31.6 12.4 33.4 12.6 C32.6 13.4 32.4 14.6 33 15.7 C45.2 16.4 55 24.4 55.6 34.6 C56 41 54.4 46 50.4 49.8 L52.8 51 L49 51.8 C44.8 55 38.8 56.6 32 56.6 C25.2 56.6 19.2 55 15 51.8 L11.2 51 L13.6 49.8 C9.6 46 8 41 8.4 34.6 C9 24 18.2 16.4 29.6 15.8 Z";
  const EAR = "M20.8 20.6 C16.6 16.6 14 10.4 14.4 5 C14.6 2 16.4 0.6 18.6 1 C22 1.8 25.6 6.6 27.4 12 C28.4 15 28.6 18 28 20.4 Z";
  const INNER = "M21.6 17.6 C18.6 14.2 16.8 9.6 17 5.8 C17.2 4.4 18.2 3.8 19.4 4.4 C21.8 5.8 24.2 9.6 25.2 13.4 C25.6 15 25.6 16.6 25.2 17.8 Z";
  const ear = (side: "l" | "r", m: (d: string) => string) => (
    <g className={`mc-face-ear mc-face-ear--${side}`}>
      <path d={m(EAR)} fill={`url(#${ids("fur")})`} stroke={LINE} strokeWidth="1.9" strokeLinejoin="round" />
      <path d={m(INNER)} fill={`url(#${ids("ear")})`} />
      <path d={m("M16.6 6.4 Q16.4 10 18 13")} stroke="#fff" strokeWidth="1" strokeLinecap="round" opacity="0.8" fill="none" />
    </g>
  );
  return (
    <Chibi
      kind="rabbit"
      defs={
        <>
          <Fur id={ids("fur")} c={["#ffffff", "#fdf4ee", "#ecd9cf"]} />
          <Fade id={ids("ear")} c={["#ff9cc6", "#ffd6e6"]} />
          <Iris id={ids("iris")} c={["#d27a9a", "#6a2c48", "#2c1420"]} />
          <Glow id={ids("blush")} color="#ff8fbf" o={0.8} />
          <Glow id={ids("shade")} color="#d9b8ac" o={0.5} />
          <clipPath id={ids("clip")}>
            <path d={HEAD} />
          </clipPath>
        </>
      }
    >
      {ear("l", (d) => d)}
      {ear("r", mirror)}
      <path d={HEAD} fill={`url(#${ids("fur")})`} stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
      <HeadLight clip={ids("clip")} shade={ids("shade")} rim="M15.6 26 Q22 18.4 32 18 Q42 18.4 48.4 26" shine="M20.8 23 Q26 19 31 18.8" />
      <ChibiEyes closed={closed} l={21.8} r={42.2} cy={36.2} s={0.94} line={LINE} iris={ids("iris")} glow="#ffb3d0" />
      <Cheeks id={ids("blush")} x={14.6} y={44.4} />
      <path d="M30.9 45.5 H33.1 V47.2 Q33.1 47.8 32.5 47.8 H31.5 Q30.9 47.8 30.9 47.2 Z M32 45.6 V47.6" fill="#fff" stroke={LINE} strokeWidth="0.6" strokeLinejoin="round" />
      <path d="M32 43.9 V45 M29.2 44.8 Q30.6 46.4 32 45 Q33.4 46.4 34.8 44.8" stroke={LINE} strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <g className="mc-face-nose">
        <path d="M30 42 C30 41 34 41 34 42 C34 42.9 32.9 43.7 32 43.9 C31.1 43.7 30 42.9 30 42 Z" fill={PINK} />
        <ellipse cx="31.2" cy="41.8" rx="0.8" ry="0.4" fill="#fff" opacity="0.8" />
      </g>
    </Chibi>
  );
}

/** The lizard: the same green head and spiky crest, big golden eyes, a smile; its tongue flicks. */
function ChibiLizard({ closed }: { closed: boolean }) {
  const ids = useFaceIds();
  const LINE = "#2f5f2c";
  const HEAD = "M32 14.6 C46 14.6 56.4 22.6 56.6 34.4 C56.8 46.8 45.8 55.6 32 55.6 C18.2 55.6 7.2 46.8 7.4 34.4 C7.6 22.6 18 14.6 32 14.6 Z";
  const SPOTS: [number, number, number][] = [[16, 26, 1.6], [19.4, 22.6, 1.1], [13.4, 31, 1], [46.4, 25, 1.5], [44, 21.4, 1], [50.4, 30, 1.2], [32, 20, 1.2]];
  return (
    <Chibi
      kind="lizard"
      defs={
        <>
          <Fur id={ids("fur")} c={["#c4ee98", "#8fd070", "#5c9f48"]} />
          <Fade id={ids("crest")} c={["#9ad86e", "#3f8a34"]} />
          <Iris id={ids("iris")} c={["#ffe27a", "#e09a24", "#7a4a0a"]} />
          <Glow id={ids("jaw")} color="#eefac0" o={0.85} />
          <Glow id={ids("blush")} color="#ff8fa8" o={0.7} />
          <Glow id={ids("shade")} color="#4c8a3c" o={0.4} />
          <clipPath id={ids("clip")}>
            <path d={HEAD} />
          </clipPath>
        </>
      }
    >
      <g className="mc-face-crest">
        <path d="M25.4 16 Q25.6 10 28 7.6 Q29.6 11.4 30.4 15.2 Z M29.8 15 Q30.6 7.6 33.4 5.4 Q35 9.8 35 15 Z M34.6 15.2 Q36.2 9.6 39 8.2 Q39.6 12 39 15.8 Z" fill={`url(#${ids("crest")})`} stroke={LINE} strokeWidth="1.4" strokeLinejoin="round" />
      </g>
      <path d={HEAD} fill={`url(#${ids("fur")})`} stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
      <g clipPath={`url(#${ids("clip")})`}>
        <ellipse cx="32" cy="52" rx="18" ry="7.4" fill={`url(#${ids("jaw")})`} />
      </g>
      <HeadLight clip={ids("clip")} shade={ids("shade")} rim="M14 25 Q21.6 17 32 16.8 Q42.4 17 50 25" shine="M20.4 21.8 Q26 18.2 30.6 18" />
      {SPOTS.map(([x, y, r]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#4c8a3c" opacity="0.35" />
      ))}
      <Cheeks id={ids("blush")} x={14.4} y={41.6} hatch={null} />
      {closed ? (
        <path d="M16.6 33.4 q5.4 4 10.8 0 M36.6 33.4 q5.4 4 10.8 0" stroke={LINE} strokeWidth="2.1" fill="none" strokeLinecap="round" />
      ) : (
        <g className="mc-face-eyes">
          {[22, 42].map((cx) => (
            <g key={cx}>
              <circle cx={cx} cy={32.6} r="6.8" fill="#fff" stroke={LINE} strokeWidth="1.4" />
              <path d={`M${cx - 5.6} ${34.8} Q${cx} ${40.4} ${cx + 5.6} ${34.8}`} stroke="#d9ecd0" strokeWidth="1.6" fill="none" />
            </g>
          ))}
          <g className="mc-face-look">
            <AnimeEye cx={22} cy={32.8} s={0.7} line={LINE} iris={ids("iris")} glow="#fff0a0" lash={false} />
            <AnimeEye cx={42} cy={32.8} s={0.7} line={LINE} iris={ids("iris")} glow="#fff0a0" lash={false} />
          </g>
          <path d="M15.4 31 C16.6 25.4 27.4 25.4 28.6 31 M35.4 31 C36.6 25.4 47.4 25.4 48.6 31" stroke={LINE} strokeWidth="2" strokeLinecap="round" fill="none" />
        </g>
      )}
      <ellipse cx="29.2" cy="41.2" rx="0.9" ry="0.7" fill={LINE} />
      <ellipse cx="34.8" cy="41.2" rx="0.9" ry="0.7" fill={LINE} />
      <path d="M21.6 44 Q32 51.4 42.4 44" stroke={LINE} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {/* Hidden in its mouth; flicks out now and then (styles/companions.css). */}
      <path className="mc-face-tongue" d="M32 47.6 V51.2 M32 51.2 L30.8 52.8 M32 51.2 L33.2 52.8" stroke="#ff5c7c" strokeWidth="1.2" strokeLinecap="round" fill="none" />
    </Chibi>
  );
}

/** The raccoon: the same grey face, black mask and white-edged round ears; white brows and cheeks. */
function ChibiRaccoon({ closed }: { closed: boolean }) {
  const ids = useFaceIds();
  const LINE = "#3e4350";
  const HEAD =
    "M32 13.6 C45 13.6 54.6 21.4 55.8 31.8 C56.4 36.4 56 40.2 54.6 43 L59 44.2 L55.4 46 L58 48 L52.8 48.4 C49 53.8 41.6 56.6 32 56.6 C22.4 56.6 15 53.8 11.2 48.4 L6 48 L8.6 46 L5 44.2 L9.4 43 C8 40.2 7.6 36.4 8.2 31.8 C9.4 21.4 19 13.6 32 13.6 Z";
  const ear = (side: "l" | "r", x: number) => (
    <g className={`mc-face-ear mc-face-ear--${side}`}>
      <circle cx={x} cy="17" r="7.2" fill={`url(#${ids("fur")})`} stroke={LINE} strokeWidth="1.9" />
      <circle cx={x} cy="17.4" r="4.8" fill="#f4f6f8" />
      <circle cx={x} cy="17.8" r="3.2" fill="#4a505c" />
    </g>
  );
  return (
    <Chibi
      kind="raccoon"
      defs={
        <>
          <Fur id={ids("fur")} c={["#dfe3e8", "#c4cbd4", "#9fa7b3"]} />
          <Fur id={ids("mask")} c={["#4a505c", "#2b2f38", "#1c1f26"]} />
          <Fur id={ids("white")} c={["#ffffff", "#f6f7f9", "#e2e5ea"]} />
          <Fur id={ids("nose")} c={["#4a4e5a", "#25272e", "#121318"]} />
          <Iris id={ids("iris")} c={["#b88a5a", "#5a3a20", "#22150c"]} />
          <Glow id={ids("blush")} color="#ff8fbf" o={0.75} />
          <Glow id={ids("shade")} color="#8d95a3" o={0.45} />
          <clipPath id={ids("clip")}>
            <path d={HEAD} />
          </clipPath>
        </>
      }
    >
      {ear("l", 15.6)}
      {ear("r", 48.4)}
      <path d={HEAD} fill={`url(#${ids("fur")})`} stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
      <g clipPath={`url(#${ids("clip")})`}>
        <path d="M32 15 C30.2 20.4 30.2 25.6 32 31 C33.8 25.6 33.8 20.4 32 15 Z" fill="#8d95a1" opacity="0.8" />
        <path d="M8 42 C12.6 37.6 21.6 38.8 25.6 41.4 C28.4 43.2 30.4 43.8 32 43.8 C33.6 43.8 35.6 43.2 38.4 41.4 C42.4 38.8 51.4 37.6 56 42 L60 60 L4 60 Z" fill={`url(#${ids("white")})`} />
      </g>
      <HeadLight clip={ids("clip")} shade={ids("shade")} />
      <path d="M10.6 33.6 C12.6 27.6 18.6 25.8 24.6 28 C27.6 29.2 29.6 31.4 32 31.4 C34.4 31.4 36.4 29.2 39.4 28 C45.4 25.8 51.4 27.6 53.4 33.6 C52.6 39.6 47.8 42 42.6 41.2 C38.6 40.6 35.4 37.6 32 37.6 C28.6 37.6 25.4 40.6 21.4 41.2 C16.2 42 11.4 39.6 10.6 33.6 Z" fill={`url(#${ids("mask")})`} />
      <path d="M14.6 27.2 Q19.6 23.2 25.6 25.4 M49.4 27.2 Q44.4 23.2 38.4 25.4" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" opacity="0.95" fill="none" />
      {!closed && (
        <>
          <ellipse cx="21.6" cy="34.2" rx="6" ry="6.4" fill="#f6f7fa" />
          <ellipse cx="42.4" cy="34.2" rx="6" ry="6.4" fill="#f6f7fa" />
        </>
      )}
      <ChibiEyes closed={closed} l={21.6} r={42.4} cy={34.2} s={0.78} line={closed ? "#f6f7fa" : LINE} iris={ids("iris")} glow="#ffd9a8" lashes={false} />
      <Cheeks id={ids("blush")} x={15.4} y={47} />
      <path d="M32 45 V46.2 M29.6 46 Q30.8 47.6 32 46.2 Q33.2 47.6 34.4 46" stroke={LINE} strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Nose id={ids("nose")} d="M29.2 42.2 C29.2 40.8 34.8 40.8 34.8 42.2 C34.8 43.6 33.2 44.8 32 45 C30.8 44.8 29.2 43.6 29.2 42.2 Z" shine={[30.8, 41.8]} />
    </Chibi>
  );
}

/** The capybara: the same calm brown head with its eyes shut in bliss, big muzzle, little ears. */
function ChibiCapybara() {
  const ids = useFaceIds();
  const LINE = "#5c3b24";
  const HEAD = "M32 14.6 C44 14.6 53.4 17.6 54.8 27.6 C55.8 35 55.4 43.6 52.4 49 C49 55 41.4 57 32 57 C22.6 57 15 55 11.6 49 C8.6 43.6 8.2 35 9.2 27.6 C10.6 17.6 20 14.6 32 14.6 Z";
  const ear = (side: "l" | "r", x: number) => (
    <g className={`mc-face-ear mc-face-ear--${side}`}>
      <ellipse cx={x} cy="17.6" rx="4.6" ry="4.2" fill={`url(#${ids("ear")})`} stroke={LINE} strokeWidth="1.8" />
      <ellipse cx={x} cy="18.2" rx="2.2" ry="1.9" fill="#5e3b22" />
    </g>
  );
  return (
    <Chibi
      kind="capybara"
      defs={
        <>
          <Fur id={ids("fur")} c={["#d7a57a", "#b07a4f", "#87583a"]} />
          <Fur id={ids("muzzle")} c={["#ecc8a6", "#d4a47c", "#b8855c"]} />
          <Fur id={ids("ear")} c={["#9a6a46", "#7a4f30", "#5e3b22"]} />
          <Glow id={ids("blush")} color="#ff8f9f" o={0.7} />
          <Glow id={ids("shade")} color="#6e4428" o={0.4} />
          <clipPath id={ids("clip")}>
            <path d={HEAD} />
          </clipPath>
        </>
      }
    >
      {ear("l", 16.4)}
      {ear("r", 47.6)}
      <path d={HEAD} fill={`url(#${ids("fur")})`} stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
      <path d="M28.6 14.8 Q29.2 12.2 31 11.4 M32 14.6 Q32.6 11.6 34.6 10.8 M35.2 14.8 Q36.4 12.8 38 12.6" stroke={LINE} strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <HeadLight clip={ids("clip")} shade={ids("shade")} rim="M14 23.4 Q20 17 32 16.6 Q44 17 50 23.4" shine="M19.8 20 Q25.6 17.4 31 17.2" />
      {/* Eyes shut in bliss, as ever. */}
      <path d="M17 29.6 Q21.6 34 26.2 29.6 M47 29.6 Q42.4 34 37.8 29.6" stroke={LINE} strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M17 29.6 L15.4 28.6 M47 29.6 L48.6 28.6" stroke={LINE} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M16.4 44.4 C16.4 38 23.4 35.6 32 35.6 C40.6 35.6 47.6 38 47.6 44.4 C47.6 51.4 41 55.6 32 55.6 C23 55.6 16.4 51.4 16.4 44.4 Z" fill={`url(#${ids("muzzle")})`} stroke={LINE} strokeWidth="1.2" strokeOpacity="0.45" />
      <path d="M21.6 39.4 Q26 37.4 30.4 37.6" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity="0.55" fill="none" />
      <Cheeks id={ids("blush")} x={14.2} y={36.8} hatch="#e8708a" />
      <g className="mc-face-nose">
        <ellipse cx="28.8" cy="42" rx="1.5" ry="0.9" fill={LINE} transform="rotate(-25 28.8 42)" />
        <ellipse cx="35.2" cy="42" rx="1.5" ry="0.9" fill={LINE} transform="rotate(25 35.2 42)" />
      </g>
      <path d="M32 44.6 V47 M32 47 Q29.8 49 27.6 47.8 M32 47 Q34.2 49 36.4 47.8" stroke={LINE} strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </Chibi>
  );
}

/** The robin: the same brown head and orange-red face, a little yellow beak that chirps. */
function ChibiRobin({ closed }: { closed: boolean }) {
  const ids = useFaceIds();
  const LINE = "#4a3222";
  const HEAD =
    "M32 12.6 C33 10 35.4 8.8 37.2 9.6 C35.8 10.4 35.2 11.6 35.4 12.8 C47.2 14.4 55.8 23.2 55.8 34 C55.8 46.8 45.4 56.6 32 56.6 C18.6 56.6 8.2 46.8 8.2 34 C8.2 22.6 18.4 13 32 12.6 Z";
  const BREAST = "M10.6 45 C10.4 35.4 17.8 30 24.6 30.6 C27.8 30.9 30 31.8 32 31.8 C34 31.8 36.2 30.9 39.4 30.6 C46.2 30 53.6 35.4 53.4 45";
  return (
    <Chibi
      kind="robin"
      defs={
        <>
          <Fur id={ids("fur")} c={["#a8805f", "#7f5c44", "#5c412f"]} />
          <Fur id={ids("breast")} c={["#ffb072", "#f07b3e", "#c85a2a"]} />
          <Fur id={ids("beak")} c={["#ffe08a", "#f4b53f", "#d68a1e"]} />
          <Iris id={ids("iris")} c={["#6a5048", "#2a1c18", "#100a08"]} />
          <Glow id={ids("blush")} color="#ff6f6a" o={0.6} />
          <Glow id={ids("shade")} color="#a8461e" o={0.45} />
          <clipPath id={ids("clip")}>
            <path d={HEAD} />
          </clipPath>
        </>
      }
    >
      <path d={HEAD} fill={`url(#${ids("fur")})`} stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
      <g clipPath={`url(#${ids("clip")})`}>
        <path d={`${BREAST} L52 60 L12 60 Z`} fill={`url(#${ids("breast")})`} />
        <path d={BREAST} stroke="#c9ccd4" strokeWidth="1.4" opacity="0.9" fill="none" />
      </g>
      <HeadLight clip={ids("clip")} shade={ids("shade")} />
      {!closed && (
        <>
          <ellipse cx="21.8" cy="35" rx="5.6" ry="6.2" stroke="#fff1e0" strokeWidth="0.9" opacity="0.8" />
          <ellipse cx="42.2" cy="35" rx="5.6" ry="6.2" stroke="#fff1e0" strokeWidth="0.9" opacity="0.8" />
        </>
      )}
      <ChibiEyes closed={closed} l={21.8} r={42.2} cy={35} s={0.82} line={LINE} iris={ids("iris")} glow="#a08070" lash={false} />
      <Cheeks id={ids("blush")} x={15.6} y={42.6} hatch="#d85a40" />
      <ellipse cx="32" cy="42" rx="2.4" ry="1.2" fill="#5a2a1a" />
      <path className="mc-face-beak" d="M29.6 41.4 Q32 42.6 34.4 41.4 Q33.2 43.8 32 45 Q30.8 43.8 29.6 41.4 Z" fill={`url(#${ids("beak")})`} stroke={LINE} strokeWidth="0.9" strokeLinejoin="round" />
      <path d="M28.4 40.2 Q32 37.6 35.6 40.2 Q33.8 41.9 32 42.2 Q30.2 41.9 28.4 40.2 Z" fill={`url(#${ids("beak")})`} stroke={LINE} strokeWidth="0.9" strokeLinejoin="round" />
      <path d="M30.2 39.6 Q31.6 38.8 33 39" stroke="#fff" strokeWidth="0.7" strokeLinecap="round" opacity="0.7" />
    </Chibi>
  );
}

/** The parrot: the same green head, yellow crest, red cheeks and white eye patches; a hooked beak. */
function ChibiParrot({ closed }: { closed: boolean }) {
  const ids = useFaceIds();
  const LINE = "#1f4d2e";
  const HEAD = "M32 13.4 C45.4 13.4 55.6 22.6 55.8 34 C56 46.6 45.8 56.4 32 56.4 C18.2 56.4 8 46.6 8.2 34 C8.4 22.6 18.6 13.4 32 13.4 Z";
  return (
    <Chibi
      kind="parrot"
      defs={
        <>
          <Fur id={ids("fur")} c={["#9be3a2", "#4fb868", "#2c8046"]} />
          <Fur id={ids("crest")} c={["#fff0a0", "#f8c64a", "#e8902a"]} />
          <Fur id={ids("beak")} c={["#8a8a98", "#4a4a55", "#2a2a33"]} />
          <Iris id={ids("iris")} c={["#8a6a3a", "#3a2a14", "#140e06"]} />
          <Glow id={ids("cheek")} color="#ff5a50" o={0.95} />
          <Glow id={ids("shade")} color="#1e6a36" o={0.45} />
          <clipPath id={ids("clip")}>
            <path d={HEAD} />
          </clipPath>
        </>
      }
    >
      <g className="mc-face-crest">
        <path d="M28.4 15 C24.6 11.4 24 6.2 26.4 2.8 C28 6.6 29.8 10.4 31.2 14 Z M30.6 14 C29.6 8.6 31 3.6 34.6 1.2 C35 5.6 34.4 10 33.8 14.2 Z M33.4 14.4 C35.6 9.6 39.2 6.8 42.8 6.8 C40.8 9.8 38.4 12.8 36.4 15.4 Z" fill={`url(#${ids("crest")})`} stroke={LINE} strokeWidth="1.3" strokeLinejoin="round" />
      </g>
      <path d={HEAD} fill={`url(#${ids("fur")})`} stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
      <HeadLight clip={ids("clip")} shade={ids("shade")} />
      <ellipse cx="19" cy="42.6" rx="6.6" ry="4.8" fill={`url(#${ids("cheek")})`} />
      <ellipse cx="45" cy="42.6" rx="6.6" ry="4.8" fill={`url(#${ids("cheek")})`} />
      <ellipse cx="22.6" cy="33.4" rx="6.6" ry="6.8" fill="#fff" stroke={LINE} strokeWidth="1.1" />
      <ellipse cx="41.4" cy="33.4" rx="6.6" ry="6.8" fill="#fff" stroke={LINE} strokeWidth="1.1" />
      <ChibiEyes closed={closed} l={22.6} r={41.4} cy={33.6} s={0.66} line={LINE} iris={ids("iris")} glow="#d8b070" lashes={false} />
      <path className="mc-face-beak" d="M28 41.8 C29.6 43.4 31.4 43.8 32.8 43.2 C33.6 44.8 33 46.6 31.6 46.8 C29.6 46.8 28.2 44.6 28 41.8 Z" fill="#33333c" stroke={LINE} strokeWidth="0.9" strokeLinejoin="round" />
      <path d="M26.8 39 C26.8 36.2 29.4 35 32 35 C35.6 35 38 37.6 38 41.2 C38 44.6 36 47.6 33.6 48.6 C34.4 46.4 34.2 44.2 32.8 43 C30.6 42.8 26.8 42 26.8 39 Z" fill={`url(#${ids("beak")})`} stroke={LINE} strokeWidth="1" strokeLinejoin="round" />
      <path d="M29 37.6 Q31.4 36.2 34 36.8" stroke="#fff" strokeWidth="1" strokeLinecap="round" opacity="0.5" fill="none" />
    </Chibi>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
/** `eyesClosed`: asleep (the living companions nap). Each face blinks and twitches (styles/companions.css). */
export function AnimalFace({ species, eyesClosed = false }: { species: Species; eyesClosed?: boolean }) {
  switch (species) {
    case "cat":
      return <ChibiCat closed={eyesClosed} />;
    case "dog":
      return <ChibiDog closed={eyesClosed} />;
    case "wolf":
      return <ChibiWolf closed={eyesClosed} />;
    case "rabbit":
      return <ChibiRabbit closed={eyesClosed} />;
    case "lizard":
      return <ChibiLizard closed={eyesClosed} />;
    case "raccoon":
      return <ChibiRaccoon closed={eyesClosed} />;
    case "capybara":
      return <ChibiCapybara />;
    case "robin":
      return <ChibiRobin closed={eyesClosed} />;
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
      return <ChibiParrot closed={eyesClosed} />;
  }
}

/** Below this size (avatars in the feed, the chat…) faces keep still: only the big ones come alive. */
const STILL_BELOW = 48;

// Standalone cute face.
/** `still`: no moves of its own (the default below 48 px); the avatar badge sets it false and plays its "hello" instead. */
export function Animal({ species, size = 64, className = "", still = size < STILL_BELOW }: { species: Species; size?: number; className?: string; still?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" overflow="visible" className={(still ? "mc-still " : "") + className} aria-hidden="true">
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
