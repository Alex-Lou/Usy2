import { AnimalFace } from "../ui/animals";
import penguinUrl from "./PnguinoBody.svg";
import type { CompanionBrain, Kind } from "./brain";

// Whole-body companions, side on, feet at y = 0, facing right (the caller flips
// them). The heads are the companion faces themselves, so they blink too.
const OUTLINE = "#4a3b33";

export function CompanionBody({ kind, b }: { kind: Kind; b: CompanionBrain }) {
  return kind === "penguin" ? <PenguinBody b={b} /> : <FourLegs kind={kind} b={b} />;
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

const COLORS = {
  wolf: { body: "#aab2be", far: "#8f97a3", light: "#eef1f5" },
  otter: { body: "#9f8275", far: "#86695d", light: "#f4efec" },
  cat: { body: "#fff4e6", far: "#efdcc6", light: "#f2c9a0" },
} as const;

/** One leg: swings around its top while walking, tucks in when lying down. */
function Leg({ x, color, swing, tuck, long = false }: { x: number; color: string; swing: number; tuck: number; long?: boolean }) {
  const h = long ? 17.5 : 13.5;
  const top = -h + 0.5;
  return (
    <g transform={`rotate(${swing} ${x + 3} ${top + 1}) translate(0 ${top + 1}) scale(1 ${tuck}) translate(0 ${-(top + 1)})`}>
      <rect x={x} y={top} width={long ? 7 : 6.5} height={h} rx="3.2" fill={color} stroke={OUTLINE} strokeWidth="1.6" />
    </g>
  );
}

function FourLegs({ kind, b }: { kind: "wolf" | "cat" | "otter"; b: CompanionBrain }) {
  const c = COLORS[kind];
  const walking = b.stride !== 0;
  const swing = (phase: number) => (walking ? Math.sin(b.stride * 2 + phase) * 24 : 0);
  const tuck = Math.max(0.08, 1 - b.lying * 1.3);
  const wolf = kind === "wolf";
  const up = wolf ? 4 : 0; // the wolf stands taller, on longer legs
  return (
    <g transform={`translate(0 ${b.lying * (8 + up)}) rotate(${b.tilt} 0 -10) scale(1 ${b.squash})`}>
      {/* Far legs first, a shade darker. */}
      <Leg x={-14} color={c.far} swing={swing(Math.PI)} tuck={tuck} long={wolf} />
      <Leg x={9} color={c.far} swing={swing(0)} tuck={tuck} long={wolf} />
      <g transform={`rotate(${b.wag} -20 ${-21 - up})`}>
        {kind === "otter" ? (
          // A thick tail, tapering to a point.
          <path d="M-20 -23 q-14 2 -26 10 q-3 3 1 3 q13 -3 25 -5 z" fill={c.far} stroke={OUTLINE} strokeWidth="1.8" strokeLinejoin="round" />
        ) : wolf ? (
          // A big bushy tail with a pale tip.
          <>
            <path d="M-20 -25 q-12 -12 -27 -7 q-7 4 -4 11 q8 -3 13 1 q9 1 18 -5 z" fill="#8f97a3" stroke={OUTLINE} strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M-47 -32 q-7 4 -4 11 q5 -3 8 -2 q-3 -5 -4 -9 z" fill={c.light} />
          </>
        ) : (
          <>
            <path d="M-19 -20 q-13 -2 -15 -16 q-1 -6 4 -7" stroke={OUTLINE} strokeWidth="7" fill="none" strokeLinecap="round" />
            <path d="M-19 -20 q-13 -2 -15 -16 q-1 -6 4 -7" stroke={c.body} strokeWidth="4.2" fill="none" strokeLinecap="round" />
          </>
        )}
      </g>
      <ellipse cx="-1" cy={-17 - up} rx={wolf ? 24 : kind === "otter" ? 25 : 21} ry={kind === "otter" ? 10.5 : 12} fill={c.body} stroke={OUTLINE} strokeWidth="2" />
      {kind === "otter" ? (
        // A pale throat and belly.
        <path d="M6 -24 q10 1 13 7 q-10 4 -20 3 q2 -6 7 -10 z" fill={c.light} />
      ) : wolf ? (
        <>
          {/* Darker saddle on the back, a fluffy ruff at the chest. */}
          <path d="M-20 -26 q20 -13 38 -2 q-18 -5 -38 2 z" fill="#7f8794" />
          <path d="M8 -28 q9 2 12 9 l-3 1 l3 3 l-4 1 l2 4 l-6 -1 q-6 -6 -4 -17 z" fill={c.light} stroke={OUTLINE} strokeWidth="1.4" strokeLinejoin="round" />
        </>
      ) : (
        <path d="M-10 -28 q2 5 0 9 M-3 -29 q2 5 0 9 M4 -28.5 q2 5 0 9" stroke={c.light} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      )}
      <Leg x={-10} color={c.body} swing={swing(0)} tuck={tuck} long={wolf} />
      <Leg x={13} color={c.body} swing={swing(Math.PI)} tuck={tuck} long={wolf} />
      <g transform={`rotate(${-b.raise * 30} 14 ${-26 - up})`}>
        <g transform={`translate(${wolf ? -2 : kind === "otter" ? -1 : -4.2} ${-56.4 - up}) scale(0.6)`}>
          <AnimalFace species={kind} eyesClosed={b.eyesClosed} />
        </g>
      </g>
    </g>
  );
}
