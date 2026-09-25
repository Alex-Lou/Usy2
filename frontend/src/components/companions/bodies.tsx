import { AnimalFace, PenguinHead } from "../ui/animals";
import type { CompanionBrain, Kind } from "./brain";

// Whole-body companions, side on, feet at y = 0, facing right (the caller flips
// them). The heads are the companion faces themselves, so they blink too.
const OUTLINE = "#4a3b33";

export function CompanionBody({ kind, b }: { kind: Kind; b: CompanionBrain }) {
  return kind === "penguin" ? <PenguinBody b={b} /> : <FourLegs kind={kind} b={b} />;
}

function PenguinBody({ b }: { b: CompanionBrain }) {
  const lie = b.lying * 80;
  const NAVY = "#2b2d42";
  return (
    <g transform={`translate(0 ${b.lying * 10}) rotate(${b.tilt + lie} 0 -22)`}>
      <ellipse cx="-7" cy="-1" rx="6.5" ry="3" fill="#f4a93b" stroke={OUTLINE} strokeWidth="1.4" />
      <ellipse cx="7" cy="-1" rx="6.5" ry="3" fill="#f4a93b" stroke={OUTLINE} strokeWidth="1.4" />
      <ellipse cx="0" cy="-24" rx="17" ry="22" fill={NAVY} stroke={OUTLINE} strokeWidth="2" />
      <ellipse cx="0" cy="-21" rx="11" ry="15" fill="#fffaf2" />
      <path transform={`rotate(${-b.wag} -15 -34)`} d="M-15 -36 q-10 7 -9 22 q7 -3 11 -15 z" fill={NAVY} stroke={OUTLINE} strokeWidth="1.6" strokeLinejoin="round" />
      <path transform={`rotate(${b.wag} 15 -34)`} d="M15 -36 q10 7 9 22 q-7 -3 -11 -15 z" fill={NAVY} stroke={OUTLINE} strokeWidth="1.6" strokeLinejoin="round" />
      <g transform="translate(-19 -78) scale(0.59)">
        <PenguinHead eyesClosed={b.eyesClosed} />
      </g>
    </g>
  );
}

const COLORS = {
  wolf: { body: "#b7bdc7", far: "#9aa1ad", light: "#e7ebf1" },
  cat: { body: "#fff4e6", far: "#efdcc6", light: "#f2c9a0" },
} as const;

/** One leg: swings around its top while walking, tucks in when lying down. */
function Leg({ x, color, swing, tuck }: { x: number; color: string; swing: number; tuck: number }) {
  return (
    <g transform={`rotate(${swing} ${x + 3} -12) translate(0 -12) scale(1 ${tuck}) translate(0 12)`}>
      <rect x={x} y="-13" width="6.5" height="13.5" rx="3.2" fill={color} stroke={OUTLINE} strokeWidth="1.6" />
    </g>
  );
}

function FourLegs({ kind, b }: { kind: "wolf" | "cat"; b: CompanionBrain }) {
  const c = COLORS[kind];
  const walking = b.stride !== 0;
  const swing = (phase: number) => (walking ? Math.sin(b.stride * 2 + phase) * 24 : 0);
  const tuck = Math.max(0.08, 1 - b.lying * 1.3);
  return (
    <g transform={`translate(0 ${b.lying * 8}) rotate(${b.tilt} 0 -10) scale(1 ${b.squash})`}>
      {/* Far legs first, a shade darker. */}
      <Leg x={-14} color={c.far} swing={swing(Math.PI)} tuck={tuck} />
      <Leg x={9} color={c.far} swing={swing(0)} tuck={tuck} />
      <g transform={`rotate(${b.wag} -18 -19)`}>
        {kind === "wolf" ? (
          <>
            <path d="M-18 -21 q-15 -4 -23 7 q9 6 21 -1 z" fill={c.body} stroke={OUTLINE} strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M-36 -16 q-4 1 -5 2 q4 3 8 1 z" fill={c.light} />
          </>
        ) : (
          <>
            <path d="M-19 -20 q-13 -2 -15 -16 q-1 -6 4 -7" stroke={OUTLINE} strokeWidth="7" fill="none" strokeLinecap="round" />
            <path d="M-19 -20 q-13 -2 -15 -16 q-1 -6 4 -7" stroke={c.body} strokeWidth="4.2" fill="none" strokeLinecap="round" />
          </>
        )}
      </g>
      <ellipse cx="-1" cy="-17" rx="21" ry="12" fill={c.body} stroke={OUTLINE} strokeWidth="2" />
      {kind === "wolf" ? (
        <ellipse cx="11" cy="-14" rx="8" ry="7.5" fill={c.light} />
      ) : (
        <path d="M-10 -28 q2 5 0 9 M-3 -29 q2 5 0 9 M4 -28.5 q2 5 0 9" stroke={c.light} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      )}
      <Leg x={-10} color={c.body} swing={swing(0)} tuck={tuck} />
      <Leg x={13} color={c.body} swing={swing(Math.PI)} tuck={tuck} />
      <g transform={`rotate(${-b.raise * 30} 14 -26)`}>
        <g transform="translate(-4.2 -56.4) scale(0.6)">
          <AnimalFace species={kind} eyesClosed={b.eyesClosed} />
        </g>
      </g>
    </g>
  );
}
