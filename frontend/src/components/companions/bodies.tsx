import { useId } from "react";
import { AnimalFace } from "../ui/animals";
import siameseBodyUrl from "./chatBody.svg";
import penguinUrl from "./PnguinoBody.svg";
import type { Species } from "../../app/companion";
import { STANCE, strideOf, type CompanionBrain, type Kind } from "./brain";

// Whole-body companions, side on, feet at y = 0, facing right (the caller flips
// them). The heads are the companion faces themselves, so they blink too.

export function CompanionBody({ kind, b }: { kind: Kind; b: CompanionBrain }) {
  if (kind === "penguin") return <PenguinBody b={b} />;
  if (kind === "siamese") return <SiameseBody b={b} />;
  return <FourLegs kind={kind} b={b} />;
}

// Lou's partner's whole-body penguin, used as is (the file is never edited): the
// whole drawing sways, hops, breathes and belly-slides; eyelids drawn on top of
// its eyes blink. Its own coordinates: 2100 box, feet at y 1654, centre x 1049.5.
const PENGUIN_SCALE = 66 / 1411; // the drawing's height (1411) → 66 units, like the others
const EYES = [891.5, 1209] as const; // eye centres (x), at y 658
const LID = "#EAF3FE"; // the face white around the eyes

function PenguinLids({ closed }: { closed: boolean }) {
  return (
    <g className={closed ? undefined : "mc-pingu-lids"}>
      {EYES.map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="658" rx="50" ry="60" fill={LID} />
          <path d={`M${x - 44} 664 q44 34 88 0`} stroke="#121629" strokeWidth="14" strokeLinecap="round" fill="none" />
        </g>
      ))}
    </g>
  );
}

// Its flippers are cut out of the drawing to flap on their own, each around its shoulder; a
// patch of the body's own navy behind each cut fills the gap a raised flipper leaves.
const NAVY = "#121629";
const FLIPPERS = [
  { side: "l", shoulder: [702, 862], cut: "706,820 380,820 380,1340 600,1340 600,1198", fill: "706,845 660,950 625,1080 600,1198 640,1198 672,1060 700,940 712,845" },
  { side: "r", shoulder: [1397, 862], cut: "1393,820 1719,820 1719,1340 1499,1340 1499,1198", fill: "1393,845 1439,950 1474,1080 1499,1198 1459,1198 1427,1060 1399,940 1387,845" },
] as const;

/** A piece of the penguin drawing (clipped to {@code points}) that turns around {@code pivot}. */
function PenguinPiece({ clipId, pivot: [px, py], points, angle, className }: { clipId: string; pivot: readonly [number, number]; points: string; angle: number; className: string }) {
  return (
    <g transform={`translate(${px} ${py}) rotate(${angle})`}>
      <clipPath id={clipId}>
        <polygon points={points} transform={`translate(${-px} ${-py})`} />
      </clipPath>
      <g className={className}>
        <image href={penguinUrl} x={-px} y={-py} width="2100" height="2100" clipPath={`url(#${clipId})`} />
      </g>
    </g>
  );
}

function PenguinBody({ b }: { b: CompanionBrain }) {
  const id = useId().replace(/:/g, "");
  const lie = b.lying * 80;
  // A little taller in the air, never stretched out of shape.
  const stretch = 1 + Math.min(0.08, Math.max(0, -b.lift) / 150);
  // The flippers (on a spring in the brain): out for balance as it waddles, flapping when happy,
  // along its sides on a belly slide; never folded into the body.
  const flap = Math.max(0, Math.min(42, b.flap * (1 - Math.min(1, b.lying))));
  const cuts = FLIPPERS.map(({ cut }) => `M${cut.replace(/ /g, " L")} Z`).join(" ");
  return (
    // It rocks on its feet as it waddles; it flops over onto its side (resting on the ground) to slide.
    <g transform={`rotate(${b.tilt} 0 -2) rotate(${lie} 0 -27) scale(${1 / Math.sqrt(stretch)} ${stretch})`}>
      {/* Speed lines behind it on a belly slide. */}
      {b.whoosh && (
        <g className="mc-pingu-whoosh" transform={`rotate(${-lie} 0 -27)`}>
          <path d="M-30 -6 h-12 M-28 -11 h-16 M-31 -16 h-10" stroke="#a9d8f0" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      )}
      <g transform={`scale(${PENGUIN_SCALE}) translate(-1049.5 -1654)`}>
        <g className="mc-pingu-breathe">
          <clipPath id={`${id}-body`}>
            <path clipRule="evenodd" d={`M0 0 H2100 V2100 H0 Z ${cuts}`} />
          </clipPath>
          {FLIPPERS.map(({ side, fill }) => (
            <polygon key={side} points={fill} fill={NAVY} />
          ))}
          <image href={penguinUrl} x="0" y="0" width="2100" height="2100" clipPath={`url(#${id}-body)`} />
          {FLIPPERS.map(({ side, shoulder, cut }) => (
            <PenguinPiece
              key={side}
              clipId={`${id}-flip-${side}`}
              pivot={shoulder}
              points={cut}
              angle={side === "l" ? flap : -flap}
              className={`mc-pingu-flipper mc-pingu-flipper--${side}`}
            />
          ))}
          <PenguinLids closed={b.eyesClosed} />
        </g>
      </g>
    </g>
  );
}

// Lou's partner's whole-body Siamese (chatBody.svg, used as is): drawn three
// quarters facing left, so it is mirrored. It trots, hops, breathes, crouches
// before a pounce, flattens for a nap; its tail (cut out of the same drawing)
// swings around its root; eyelids drawn over its eyes blink. Its own
// coordinates: 2100 box, feet at y 2001, centre x 1060.
const SIAMESE_SCALE = 62 / 1700; // the drawing's height (1700) → 62 units
const SIAMESE_EYES = [
  [634, 738],
  [950, 735],
] as const;
// The tail, above the back; the piece reaches a little lower than the cut so it
// still covers the join while it swings. It turns around its root.
const SIAMESE_TAIL = { cut: "1430,500 1790,500 1790,960 1430,960", points: "1430,500 1790,500 1790,985 1430,985", pivot: [1590, 975] } as const;

function SiameseBody({ b }: { b: CompanionBrain }) {
  const id = useId().replace(/:/g, "");
  const stretch = 1 + Math.min(0.08, Math.max(0, -b.lift) / 150);
  const trot = 1 + Math.sin(b.stride * Math.PI * 4) * 0.025 * b.gait;
  const flat = 1 - b.lying * 0.22;
  const [px, py] = SIAMESE_TAIL.pivot;
  const cut = `M${SIAMESE_TAIL.cut.replace(/ /g, " L")} Z`;
  return (
    <g transform={`translate(0 ${b.lying * 4}) rotate(${b.tilt} 0 -14) scale(${(1 / stretch) * (1 + b.lying * 0.08)} ${stretch * flat * trot * b.squash})`}>
      <g transform={`scale(${-SIAMESE_SCALE} ${SIAMESE_SCALE}) translate(-1060 -2001)`}>
        <g className="mc-siamese-body">
          <clipPath id={`${id}-body`}>
            <path clipRule="evenodd" d={`M0 0 H2100 V2100 H0 Z ${cut}`} />
          </clipPath>
          <clipPath id={`${id}-tail`}>
            <polygon points={SIAMESE_TAIL.points} />
          </clipPath>
          <g transform={`rotate(${b.tail * 0.6 + b.wag * 0.5} ${px} ${py})`}>
            <image href={siameseBodyUrl} x="0" y="0" width="2100" height="2100" clipPath={`url(#${id}-tail)`} />
          </g>
          <image href={siameseBodyUrl} x="0" y="0" width="2100" height="2100" clipPath={`url(#${id}-body)`} />
          <g className={b.eyesClosed ? undefined : "mc-siamese-body-lids"}>
            {SIAMESE_EYES.map(([x, y]) => (
              <g key={x}>
                <ellipse cx={x} cy={y} rx="80" ry="74" fill="#f4cda1" />
                <path d={`M${x - 68} ${y + 8} q68 40 136 0`} stroke="#5d4c36" strokeWidth="18" strokeLinecap="round" fill="none" />
              </g>
            ))}
          </g>
        </g>
      </g>
    </g>
  );
}

type Quad = "cat" | "wolf" | "otter";
type Grad = readonly [string, string, string];

/**
 * The chibi bodies, to go with their faces: a big head on a small soft bean of a body. The cat, the
 * wolf, and the otter (the face Lou's partner drew, on a long low body with its thick tail).
 */
const QUAD: Record<
  Quad,
  {
    face: Species;
    line: string;
    fur: Grad;
    legs: Grad; // near legs
    far: Grad; // far legs, a shade darker
    belly: string;
    head: number; // the face's scale
    chin: number; // where the chin is, in the face's 64 box
    leg: number; // hip to paw
    body: { w: number; h: number }; // half sizes
    tail: "curl" | "bushy" | "otter";
    back: "tabby" | "saddle" | null;
    chest: "tuft" | "ruff" | null;
    lie: number; // how far it sinks lying down
    sitAngle: number; // how far up its front goes, sitting (the otter stands up)
  }
> = {
  cat: {
    face: "cat",
    line: "#6e5242",
    fur: ["#fffdf8", "#fff4e6", "#ecd2b2"],
    legs: ["#fffdf8", "#fff4e6", "#ecd2b2"],
    far: ["#f6e6d2", "#efdcc6", "#dcc2a4"],
    belly: "#fffaf2",
    head: 0.66,
    chin: 57,
    leg: 8,
    body: { w: 17, h: 11 },
    tail: "curl",
    back: "tabby",
    chest: "tuft",
    lie: 7,
    sitAngle: 32,
  },
  wolf: {
    face: "wolf",
    line: "#4b4f5c",
    fur: ["#d8dde5", "#b4bcc8", "#8e97a5"],
    legs: ["#d8dde5", "#b4bcc8", "#8e97a5"],
    far: ["#a4acb8", "#959dab", "#7c8494"],
    belly: "#f1f4f8",
    head: 0.62,
    chin: 57,
    leg: 11,
    body: { w: 19, h: 11.5 },
    tail: "bushy",
    back: "saddle",
    chest: "ruff",
    lie: 10,
    sitAngle: 30,
  },
  otter: {
    face: "otter-plain",
    line: "#4a3830",
    fur: ["#b9a093", "#9f8275", "#83665a"],
    legs: ["#a88b7e", "#927468", "#7a5e52"],
    far: ["#8a6e62", "#7a6054", "#654c42"],
    belly: "#fdf8f2",
    head: 0.56,
    chin: 52,
    leg: 8.5,
    body: { w: 17, h: 11.5 },
    tail: "otter",
    back: null,
    chest: null,
    lie: 9,
    sitAngle: 50,
  },
};

// ---- A little 2D geometry: the body's pose as one affine matrix, to place legs and head. ----

type M = [number, number, number, number, number, number]; // a b c d e f, as SVG's matrix()
const mul = (m: M, n: M): M => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];
const translate = (x: number, y: number): M => [1, 0, 0, 1, x, y];
const rotateAt = (deg: number, x: number, y: number): M => {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return mul(mul(translate(x, y), [c, s, -s, c, 0, 0]), translate(-x, -y));
};
const scaleAt = (sx: number, sy: number, x: number, y: number): M => mul(mul(translate(x, y), [sx, 0, 0, sy, 0, 0]), translate(-x, -y));
const apply = (m: M, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

/**
 * A leg from its hip to its paw, wherever they are: one soft stub ending in a round paw (toes
 * forward), drawn as one shape (an outline under the fur). Too short to show (tucked in), nothing.
 */
function Leg({ hip: [hx, hy], foot: [fx, fy], fill, line }: { hip: [number, number]; foot: [number, number]; fill: string; line: string }) {
  if (Math.hypot(fx - hx, fy - hy) < 2.5) return null;
  const paw = (extra: number, color: string) => <ellipse cx={fx + 0.9} cy={fy - 2.1} rx={3.9 + extra} ry={2.3 + extra} fill={color} />;
  return (
    <g>
      <line x1={hx} y1={hy} x2={fx} y2={fy - 2.4} stroke={line} strokeWidth="8.8" strokeLinecap="round" />
      {paw(1.5, line)}
      <line x1={hx} y1={hy} x2={fx} y2={fy - 2.4} stroke={fill} strokeWidth="5.8" strokeLinecap="round" />
      {paw(0, fill)}
      <path d={`M${fx + 1.6} ${fy - 3} v1.5 M${fx + 3.3} ${fy - 2.8} v1.3`} stroke={line} strokeWidth="0.8" strokeLinecap="round" opacity="0.55" />
    </g>
  );
}

/** The cat's tail, a question mark that sways like a whip: its tip lags behind the wag. */
function catTail(wag: number) {
  const k = wag / 30;
  return `M1 0 C-8 0 ${-12 + k * 2} -6 ${-11 + k * 3.5} -13 C${-10 + k * 5} -19 ${-5 + k * 6} ${-21 + Math.abs(k)} ${-2.6 + k * 6.5} ${-18.6 + Math.abs(k) * 1.5}`;
}

/** The otter's thick tail, tapering to a point; it sways from side to side along the ground. */
function otterTail(wag: number) {
  const k = wag / 30;
  return `M1 -4.4 C-6 -4.6 -13 ${-1.6 + k * 2} -20 ${4.6 + k * 3} C-21.4 ${5.8 + k * 3} -20.8 ${7.6 + k * 3} -19 ${7.2 + k * 3} C-12 ${6 + k * 2} -6 6.2 1 5 Z`;
}

function gradient(id: string, c: Grad) {
  return (
    <radialGradient id={id} cx="40%" cy="25%" r="80%">
      <stop offset="0" stopColor={c[0]} />
      <stop offset="0.55" stopColor={c[1]} />
      <stop offset="1" stopColor={c[2]} />
    </radialGradient>
  );
}

/**
 * Where a paw is in its step: on the ground and sliding back under the body as it moves on (so it
 * never skates), then lifted in an arc to the front. {@code a}: half its reach.
 */
function step(phase: number, a: number): [number, number] {
  const p = phase - Math.floor(phase);
  if (p < STANCE) return [a - (2 * a * p) / STANCE, 0];
  const u = (p - STANCE) / (1 - STANCE);
  const e = u * u * (3 - 2 * u); // ease in and out
  return [-a + 2 * a * e, Math.sin(Math.PI * u) * 3.6];
}

function FourLegs({ kind, b }: { kind: Quad; b: CompanionBrain }) {
  const id = useId().replace(/:/g, "");
  const q = QUAD[kind];
  const { w, h } = q.body;
  const hip = -q.leg; // where the legs join the body, standing
  const cy = hip - h + 3.5; // the body's centre
  const bottom = cy + h;
  const rear = -w + 7; // hips along the body
  const front = w - 4.5;
  const fur = `url(#${id}-fur)`;
  // The body: a soft bean, a little higher at the shoulders.
  const BODY = `M${-w} ${cy + 1} C${-w} ${cy - h + 1} ${-w * 0.4} ${cy - h - 0.6} ${w * 0.15} ${cy - h} C${w * 0.75} ${cy - h + 0.4} ${w} ${cy - h * 0.4} ${w} ${cy + 1} C${w} ${cy + h * 0.8} ${w * 0.5} ${cy + h} 0 ${cy + h} C${-w * 0.6} ${cy + h} ${-w} ${cy + h * 0.7} ${-w} ${cy + 1} Z`;

  // The body's pose: it sinks lying down or sitting, its front goes up to sit (around the back
  // hips) or down in a stretch, it leans into its steps, and squashes on landing.
  const sit = Math.min(1, b.sit);
  const lying = Math.min(1, b.lying);
  const pitch = b.tilt - sit * q.sitAngle + b.bow * 16;
  const sink = lying * q.lie + sit * q.leg * 0.55 - b.bow * 3; // the back end up in a stretch
  const squash = Math.max(0.7, b.squash);
  // Flat out on its belly (a slide, a nap): longer and lower.
  const flat = Math.max(0, lying - 0.7) / 0.3;
  const body = mul(mul(translate(0, sink), rotateAt(pitch, rear, hip)), scaleAt((1 / Math.sqrt(squash)) * (1 + flat * 0.2), squash * (1 - flat * 0.25), 0, bottom));

  // The paws: in step while it walks (diagonal pairs together, as a trot), reaching out in a jump,
  // tucked under it lying down, folded under the haunch sitting, stretched forward in a bow.
  const reach = (strideOf(kind) * STANCE) / 2;
  const legLen = q.leg;
  const paw = (x: number, phase: number, isFront: boolean): { hip: [number, number]; foot: [number, number] } => {
    const hw = apply(body, x, hip);
    if (b.airborne) {
      return { hip: hw, foot: [hw[0] + (isFront ? 5 : -5), hw[1] + legLen * 0.8] };
    }
    if (lying > 0.8) return { hip: hw, foot: hw }; // all tucked in under it
    if (lying > 0.05) {
      const k = 1 - lying;
      return { hip: hw, foot: [hw[0] + (isFront ? 3 : -2) * lying, Math.min(0, hw[1] + legLen * k + 2)] };
    }
    const [sx, lift] = step(phase, reach);
    let footX = x + sx * b.gait;
    if (!isFront) footX += sit * 6; // folded under the haunch
    if (isFront) footX += (hw[0] + 1 - footX) * sit + b.bow * 6; // straight under the chest sitting, forward in a stretch
    const footY = -lift * b.gait;
    // The otter, standing up, holds its front paws at its chest.
    if (isFront && q.tail === "otter" && sit > 0.4) return { hip: hw, foot: [hw[0] + 3, hw[1] + 5.5] };
    // Never a leg longer than it can stretch, nor one pushed up into the body.
    const dy = Math.max(2.4, Math.min(legLen * 1.7, footY - hw[1]));
    return { hip: hw, foot: [footX, hw[1] + dy] };
  };
  const g = b.stride;
  const legs = [
    { ...paw(rear + 1.5, g + 0.5, false), near: false },
    { ...paw(front - 1.5, g, true), near: false },
    { ...paw(rear + 3.5, g, false), near: true },
    { ...paw(front + 1, g + 0.5, true), near: true },
  ];

  // The tail trails behind (its spring) on top of a wag; the head stays fairly level while the
  // body pitches, bobs a beat behind it, tilts when curious, goes up to howl or down to sniff.
  const tailRoot = apply(body, -w + 2.5, cy - h * 0.35 + flat * h * 0.2);
  // Lifted off the ground sitting; asleep, the curly tail lies down along the floor.
  const nap = Math.min(1, lying / 0.7) * (1 - flat);
  const tailAngle = b.tail + b.wag * (q.tail === "bushy" ? 1 : 0.4) + sit * 18 - (q.tail === "curl" ? nap * 62 : 0);
  const neck = apply(body, w * 0.72, cy - h * 0.55);
  const headRot = pitch * 0.35 + b.headTilt - b.raise * 28 + nap * 8; // asleep, the head rests
  const sniff = Math.max(0, -b.raise); // nose down to the ground
  const s = q.head;
  return (
    <g>
      <defs>
        {gradient(`${id}-fur`, q.fur)}
        <clipPath id={`${id}-body`}>
          <path d={BODY} />
        </clipPath>
      </defs>
      {/* Speed lines behind it on a belly slide. */}
      {b.whoosh && (
        <path className="mc-pingu-whoosh" d={`M${-w - 2} -12 h-12 M${-w} -17 h-15 M${-w - 3} -22 h-9`} stroke="#a9d8f0" strokeWidth="1.6" strokeLinecap="round" />
      )}
      {/* Far legs first, a shade darker; then the near ones; all behind the body. */}
      {legs.map((l, i) => (
        <Leg key={i} hip={l.hip} foot={l.foot} fill={l.near ? q.legs[1] : q.far[1]} line={q.line} />
      ))}
      {/* The tail flattens with the body on a belly slide, so it stays joined to it. */}
      <g transform={`translate(${tailRoot[0]} ${tailRoot[1]}) rotate(${tailAngle}) scale(1 ${1 - flat * 0.25})`}>
        {q.tail === "bushy" ? (
          // A big bushy tail with a pale tip, hanging low.
          <>
            <path d="M1 -1 C-6 -4 -14 -2 -19 4 C-22 8 -21 12 -18 13 C-15 9 -11 8 -7 8 C-3 7 1 4 2 1 Z" fill={fur} stroke={q.line} strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M-19 4 C-22 8 -21 12 -18 13 C-16.6 11 -15 9.8 -13 9.4 C-15.2 8 -17 6 -19 4 Z" fill={q.belly} />
            <path d="M-6 1 Q-11 1 -14 4 M-4 4 Q-8 4.6 -10 6.4" stroke="#fff" strokeWidth="0.9" strokeLinecap="round" opacity="0.6" fill="none" />
          </>
        ) : q.tail === "otter" ? (
          <path d={otterTail(b.wag)} fill={fur} stroke={q.line} strokeWidth="1.6" strokeLinejoin="round" />
        ) : (
          // A long tail curling up into a question mark.
          <>
            <path d={catTail(b.wag + b.tail * 0.5)} stroke={q.line} strokeWidth="6.4" fill="none" strokeLinecap="round" />
            <path d={catTail(b.wag + b.tail * 0.5)} stroke={fur} strokeWidth="3.8" fill="none" strokeLinecap="round" />
          </>
        )}
      </g>
      <g transform={`matrix(${body.join(" ")})`}>
        <path d={BODY} fill={fur} stroke={q.line} strokeWidth="1.9" strokeLinejoin="round" />
        <g clipPath={`url(#${id}-body)`}>
          {/* Pale belly, and the markings of the back. */}
          <ellipse cx={w * 0.1} cy={cy + h} rx={w * 0.7} ry={h * 0.55} fill={q.belly} opacity="0.85" />
          {q.back === "saddle" && (
            <path d={`M${-w} ${cy - h * 0.2} C${-w * 0.4} ${cy - h * 1.3} ${w * 0.5} ${cy - h * 1.3} ${w} ${cy - h * 0.4} L${w} ${cy - h * 2} L${-w} ${cy - h * 2} Z`} fill="#7f8794" opacity="0.75" />
          )}
          {q.back === "tabby" && (
            // Faint tabby stripes on the back, as ever.
            <path
              d={`M${-w * 0.55} ${cy - h + 0.6} q1.6 3.6 0 7 M${-w * 0.15} ${cy - h} q1.6 3.6 0 7 M${w * 0.25} ${cy - h + 0.2} q1.6 3.4 0 6.6`}
              stroke="#f0c9a0"
              strokeWidth="2.2"
              fill="none"
              strokeLinecap="round"
              opacity="0.8"
            />
          )}
        </g>
        {/* A shine along the back. */}
        <path d={`M${-w * 0.6} ${cy - h + 2.4} Q${-w * 0.1} ${cy - h - 0.2} ${w * 0.4} ${cy - h + 1.2}`} stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" fill="none" />
        {q.chest === "tuft" && (
          // A soft tuft at the chest, under the chin.
          <path d={`M${w - 7} ${cy - h + 5} q6 -1 8.6 4.6 l-2 0.6 l1.4 2.4 l-3 0.2 l0.6 2.6 l-3.6 -1.4 q-3.6 -4 -2 -9 z`} fill={q.belly} stroke={q.line} strokeWidth="1.2" strokeLinejoin="round" />
        )}
        {q.chest === "ruff" && (
          // A fluffy ruff at the chest.
          <path d={`M${w - 6} ${cy - h + 4} q8 0 9 7 l-2.6 0.6 l2 2.6 l-3.4 0.4 l1 3.2 l-4.4 -1.4 q-4.6 -5 -1.6 -12.4 z`} fill={q.belly} stroke={q.line} strokeWidth="1.3" strokeLinejoin="round" />
        )}
      </g>
      <g transform={`translate(${neck[0] + sniff * 2 + flat * 3 + nap * 1.5} ${neck[1] + b.headBob + sniff * 6 + flat * 3 + nap * 4}) rotate(${headRot})`}>
        <g transform={`translate(${-32 * s} ${4 - q.chin * s}) scale(${s})`}>
          <AnimalFace species={q.face} eyesClosed={b.eyesClosed} />
        </g>
      </g>
    </g>
  );
}
