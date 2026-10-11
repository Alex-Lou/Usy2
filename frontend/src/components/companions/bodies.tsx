import { useId } from "react";
import { AnimalFace } from "../ui/animals";
import siameseBodyUrl from "./chatBody.svg";
import penguinUrl from "./PnguinoBody.svg";
import type { Species } from "../../app/companion";
import type { CompanionBrain, Kind } from "./brain";

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

function PenguinBody({ b }: { b: CompanionBrain }) {
  const lie = b.lying * 80;
  // Squash and stretch: taller in the air, a wiggle when the flippers would flap.
  const stretch = 1 - b.lift / 50;
  const wiggle = 1 + Math.abs(b.wag) / 400;
  return (
    <g transform={`translate(0 ${b.lying * 10}) rotate(${b.tilt + lie} 0 -22) scale(${wiggle / stretch} ${stretch})`}>
      <g transform={`scale(${PENGUIN_SCALE}) translate(-1049.5 -1654)`}>
        <g className="mc-pingu-breathe">
          <image href={penguinUrl} x="0" y="0" width="2100" height="2100" />
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
  const stretch = 1 - b.lift / 50;
  const trot = b.stride !== 0 ? 1 + Math.sin(b.stride * 4) * 0.025 : 1;
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
          <g transform={`rotate(${b.wag * 0.5} ${px} ${py})`}>
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
    lie: 6,
  },
};

/**
 * A leg: one soft stub ending in a round paw (toes forward), swinging around the hip while it walks
 * and tucked in when lying down. Drawn behind the body, which hides where it joins.
 */
function Leg({ x, hip, len, fill, line, swing, tuck }: { x: number; hip: number; len: number; fill: string; line: string; swing: number; tuck: number }) {
  if (tuck <= 0.12) return null; // all tucked in under the body
  const top = hip - 3;
  const y = hip + len; // the ground
  return (
    <g transform={`rotate(${swing} ${x} ${hip}) translate(0 ${hip}) scale(1 ${tuck}) translate(0 ${-hip})`}>
      <path
        d={`M${x - 3} ${top} V${y - 2.4} C${x - 3} ${y - 0.2} ${x - 1.4} ${y} ${x + 1} ${y} C${x + 3.8} ${y} ${x + 5.2} ${y - 0.6} ${x + 5.2} ${y - 2.2} C${x + 5.2} ${y - 3.6} ${x + 4} ${y - 4.2} ${x + 2.9} ${y - 4.4} V${top} Z`}
        fill={fill}
        stroke={line}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d={`M${x + 1.4} ${y - 2.6} v1.6 M${x + 3.3} ${y - 2.4} v1.4`} stroke={line} strokeWidth="0.8" strokeLinecap="round" opacity="0.55" />
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

function FourLegs({ kind, b }: { kind: Quad; b: CompanionBrain }) {
  const id = useId().replace(/:/g, "");
  const q = QUAD[kind];
  const walking = b.stride !== 0;
  // Diagonal pairs move together, as a real trot.
  const swing = (phase: number) => (walking ? Math.sin(b.stride * 2 + phase) * 26 : 0);
  const tuck = Math.max(0.1, 1 - b.lying * 1.3);
  // In the air (a hop, a pounce): front paws reach forward, back paws push behind.
  const air = Math.min(1, Math.max(0, -b.lift / 10)) * 38;
  const front = (phase: number) => swing(phase) - air;
  const back = (phase: number) => swing(phase) + air;
  const { w, h } = q.body;
  const hip = -q.leg; // where the legs join the body
  const cy = hip - h + 3.5; // the body's centre
  const fur = `url(#${id}-fur)`;
  // The body: a soft bean, a little higher at the shoulders.
  const BODY = `M${-w} ${cy + 1} C${-w} ${cy - h + 1} ${-w * 0.4} ${cy - h - 0.6} ${w * 0.15} ${cy - h} C${w * 0.75} ${cy - h + 0.4} ${w} ${cy - h * 0.4} ${w} ${cy + 1} C${w} ${cy + h * 0.8} ${w * 0.5} ${cy + h} 0 ${cy + h} C${-w * 0.6} ${cy + h} ${-w} ${cy + h * 0.7} ${-w} ${cy + 1} Z`;
  const tailRoot = [-w + 1.5, cy - h * 0.35] as const;
  // The face's chin sits on the front of the body.
  const neck = [w * 0.72, cy - h * 0.55] as const;
  const s = q.head;
  const legs = (fill: string, x0: number, x1: number, p: number) => (
    <>
      <Leg x={x0} hip={hip} len={q.leg} fill={fill} line={q.line} swing={back(p)} tuck={tuck} />
      <Leg x={x1} hip={hip} len={q.leg} fill={fill} line={q.line} swing={front(p + Math.PI)} tuck={tuck} />
    </>
  );
  return (
    <g transform={`translate(0 ${b.lying * q.lie}) rotate(${b.tilt} 0 -10)`}>
      <defs>
        {gradient(`${id}-fur`, q.fur)}
        {gradient(`${id}-legs`, q.legs)}
        {gradient(`${id}-far`, q.far)}
        <clipPath id={`${id}-body`}>
          <path d={BODY} />
        </clipPath>
      </defs>
      {/* The body crouches (squash) from the ground up; the head only follows it down. */}
      <g transform={`scale(1 ${b.squash})`}>
        {/* Far legs first, a shade darker. */}
        {legs(`url(#${id}-far)`, -w + 5.5, w - 6.5, 0)}
        <g transform={`rotate(${q.tail === "bushy" ? b.wag : b.wag * 0.4} ${tailRoot[0]} ${tailRoot[1]})`}>
          <g transform={`translate(${tailRoot[0]} ${tailRoot[1]})`}>
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
                <path d={catTail(b.wag)} stroke={q.line} strokeWidth="6.4" fill="none" strokeLinecap="round" />
                <path d={catTail(b.wag)} stroke={fur} strokeWidth="3.8" fill="none" strokeLinecap="round" />
              </>
            )}
          </g>
        </g>
        {legs(`url(#${id}-legs)`, -w + 8.5, w - 3, Math.PI)}
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
      <g transform={`translate(0 ${neck[1] * (b.squash - 1)}) rotate(${-b.raise * 30} ${neck[0]} ${neck[1]})`}>
        <g transform={`translate(${neck[0] - 32 * s} ${neck[1] + 4 - q.chin * s}) scale(${s})`}>
          <AnimalFace species={q.face} eyesClosed={b.eyesClosed} />
        </g>
      </g>
    </g>
  );
}
