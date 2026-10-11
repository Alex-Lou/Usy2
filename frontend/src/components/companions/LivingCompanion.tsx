import { useEffect, useRef, useState, type RefObject } from "react";
import { CompanionBody } from "./bodies";
import { BUBBLE_LIFE, CompanionBrain, DUST_LIFE, type Bubble, type Kind } from "./brain";

/** Overshoots a little then settles: the pop of a bubble appearing. */
const popIn = (t: number) => {
  const c = 1.70158;
  const u = Math.min(1, t) - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
};

/**
 * What a companion says, drawn: a heart, a note, a « z » that float up wobbling and fade; the
 * wolf's howl in a speech bubble; puffs of dust at its feet when it lands.
 */
function BubbleShape({ bub, ground, head, dir }: { bub: Bubble; ground: number; head: number; dir: number }) {
  const a = bub.age;
  if (bub.kind === "dust") {
    const p = a / DUST_LIFE;
    return <circle cx={bub.x + bub.dx * (4 + p * 14)} cy={ground - 1 - p * 5} r={1.6 + p * 4} fill="#e2d3bf" opacity={0.75 * (1 - p)} />;
  }
  const life = a / BUBBLE_LIFE;
  const fade = life < 0.6 ? 1 : 1 - (life - 0.6) / 0.4;
  const scale = popIn(a / 0.22);
  const y = ground - head - a * 22;
  if (bub.kind === "howl") {
    return (
      <g transform={`translate(${bub.x + dir * 22} ${ground - head - 4 - a * 6}) scale(${scale})`} opacity={fade}>
        <path d="M-20 -9 h40 a6 6 0 0 1 6 6 v6 a6 6 0 0 1 -6 6 h-26 l-6 6 l1 -6 h-9 a6 6 0 0 1 -6 -6 v-6 a6 6 0 0 1 6 -6 z" fill="#fff" stroke="#a9b8ff" strokeWidth="1.4" />
        <text y="3.4" fontSize="9.5" fontWeight="700" fontStyle="italic" fill="#6f7fd6" textAnchor="middle">
          Aouuu ♪
        </text>
      </g>
    );
  }
  const x = bub.x + (bub.kind === "z" ? 10 + a * 9 : Math.sin(a * 5) * 4);
  return (
    <g transform={`translate(${x} ${y}) scale(${scale * (bub.kind === "z" ? 0.9 + a * 0.35 : 1)})`} opacity={fade}>
      {bub.kind === "heart" && (
        <>
          <path d="M0 4 C-5 0.4 -7.4 -3.4 -4.6 -6 C-2.6 -7.6 -0.8 -6.6 0 -5.2 C0.8 -6.6 2.6 -7.6 4.6 -6 C7.4 -3.4 5 0.4 0 4 Z" fill="#ff7aa8" stroke="#d0507f" strokeWidth="0.9" strokeLinejoin="round" />
          <ellipse cx="-2.8" cy="-4" rx="1.3" ry="0.8" fill="#fff" opacity="0.85" transform="rotate(-30 -2.8 -4)" />
        </>
      )}
      {bub.kind === "note" && (
        <g stroke="#7d5bd6" strokeWidth="0.9" strokeLinejoin="round">
          <path d="M1.2 2.4 V-6.4 Q4.8 -5.4 5.4 -2.2" fill="none" strokeWidth="1.6" strokeLinecap="round" />
          <ellipse cx="-1" cy="2.6" rx="2.6" ry="2" fill="#b18cff" transform="rotate(-20 -1 2.6)" />
        </g>
      )}
      {bub.kind === "z" && (
        <text fontSize="11" fontWeight="800" fill="#7cc6e8" stroke="#fff" strokeWidth="2.4" paintOrder="stroke" strokeLinejoin="round" textAnchor="middle">
          z
        </text>
      )}
    </g>
  );
}
// The feet sink a little into the ground (and its shadow) so they touch it.
const SINK = 1.5;
const HEAD_TOP: Record<Kind, number> = { penguin: 66, wolf: 58, cat: 58, otter: 48, siamese: 62 };
/** Relative sizes, so the wolf stands a little taller than the kitten and the penguin. */
const SIZE: Record<Kind, number> = { penguin: 1, wolf: 1.2, cat: 1.05, otter: 1.05, siamese: 1.05 };
const LABEL: Record<Kind, string> = { penguin: "le pingouin", wolf: "le loup", cat: "le chat", otter: "la loutre", siamese: "le siamois" };

/** Where a companion lives: the house (same 400×300 box as Room) or a side-menu tile. */
export const SCENES = {
  house: { width: 400, height: 300, ground: 262, minX: 60, maxX: 345, scale: 0.8 },
  tile: { width: 200, height: 96, ground: 88, minX: 40, maxX: 160, scale: 0.85 }, // room for the big chibi heads at the edges
} as const;

/** The companions that can live in the house or a side-menu tile. */
export const LIVING_KINDS: Kind[] = ["penguin", "wolf", "cat", "otter", "siamese"];
export const isLivingKind = (v: string): v is Kind => (LIVING_KINDS as string[]).includes(v);
/** The living body for a companion choice: the otter without its fish walks as the otter. */
export const livingKindOf = (v: string): Kind | null => (v === "otter-plain" ? "otter" : isLivingKind(v) ? v : null);

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

const isNight = () => {
  const h = new Date().getHours();
  return h >= 20 || h < 7;
};

/**
 * A companion, alive (see brain.ts): it wanders, naps, does its trick and, in
 * the house, visits Moka (`friendRef`: the cat's shape in the same scene). A
 * tap makes it hop with a note or a heart. The loop sleeps off screen and in
 * the background.
 */
export function LivingCompanion({
  kind,
  scene,
  friendRef,
  start = 0.3,
}: {
  kind: Kind;
  scene: keyof typeof SCENES;
  friendRef?: RefObject<SVGGElement>;
  /** Where it first stands, 0 (left) … 1 (right), so several don't pile up. */
  start?: number;
}) {
  const box = SCENES[scene];
  const svgRef = useRef<SVGSVGElement>(null);
  const brainRef = useRef<CompanionBrain | null>(null);
  if (!brainRef.current || brainRef.current.kind !== kind) brainRef.current = new CompanionBrain(kind, box.minX + (box.maxX - box.minX) * start);
  const [, redraw] = useState(0);

  useEffect(() => {
    const reduced = prefersReducedMotion();
    let raf = 0;
    let last = 0;
    let visible = true;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      // Every frame, for smooth motion (a long gap, e.g. back from another tab, counts as one frame).
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      const friend = friendRef?.current?.getBBox();
      brainRef.current!.update(dt, {
        minX: box.minX,
        maxX: box.maxX,
        night: isNight(),
        reduced,
        scale: box.scale * SIZE[kind],
        friend: friend && friend.width > 0 ? { left: friend.x, right: friend.x + friend.width } : null,
      });
      redraw((n) => (n + 1) % 1_000_000);
    };
    const start = () => {
      if (!raf && visible && document.visibilityState === "visible") {
        last = 0;
        raf = requestAnimationFrame(tick);
      }
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const onVisibility = () => (document.visibilityState === "visible" ? start() : stop());
    document.addEventListener("visibilitychange", onVisibility);
    const io =
      typeof IntersectionObserver !== "undefined" && svgRef.current
        ? new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            if (visible) start();
            else stop();
          })
        : null;
    if (io && svgRef.current) io.observe(svgRef.current);
    start();
    return () => {
      stop();
      io?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [box, friendRef, kind]);

  const b = brainRef.current;
  const s = box.scale * SIZE[kind];
  const poke = () => b.poke();

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${box.width} ${box.height}`}
      preserveAspectRatio={scene === "house" ? "xMidYMax slice" : "xMidYMid meet"}
      className={scene === "house" ? "pointer-events-none absolute inset-0 h-full w-full" : "block h-auto w-full"}
      data-companion={kind}
      data-state={b.state}
    >
      {scene === "tile" &&
        (kind === "otter" ? (
          // …a little pond for the otter…
          <path d={`M10 ${box.ground - 2} q90 -8 180 0 l-3 7 q-87 6 -174 0 z`} fill="#bfe6f5" stroke="#86c6e0" strokeWidth="1.5" />
        ) : kind === "penguin" ? (
          // A little ice floe to waddle on…
          <path d={`M8 ${box.ground - 2} q92 -9 184 0 l-4 7 q-88 6 -176 0 z`} fill="#dff3ff" stroke="#a9d8f0" strokeWidth="1.5" />
        ) : (
          // …or a patch of grass, with a moon for the wolf.
          <>
            {kind === "wolf" && <circle cx="170" cy="18" r="9" fill="#fff6c9" opacity="0.9" />}
            <path d={`M6 ${box.ground - 1} q94 -8 188 0 l-3 7 q-91 5 -182 0 z`} fill="#bfe3a8" stroke="#8cc279" strokeWidth="1.5" />
          </>
        ))}
      {/* The shadow shrinks and fades as it leaves the ground. */}
      <ellipse
        cx={b.x}
        cy={box.ground + 1}
        rx={((kind === "penguin" ? 16 : 22) + b.lying * 8) * s * (1 + b.lift / 70)}
        ry={3 * s * (1 + b.lift / 70)}
        fill="#000"
        opacity={0.14 * (1 + b.lift / 50)}
      />
      <g
        transform={`translate(${b.x} ${box.ground + SINK + b.lift}) scale(${b.facing * s} ${s})`}
        onClick={poke}
        role="button"
        tabIndex={0}
        aria-label={`Toucher ${LABEL[kind]}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            poke();
          }
        }}
        style={{ cursor: "pointer", outline: "none", pointerEvents: "auto" }}
      >
        <CompanionBody kind={kind} b={b} />
      </g>
      {b.bubbles.map((bub) => (
        <BubbleShape key={bub.id} bub={bub} ground={box.ground} head={HEAD_TOP[kind] * s} dir={b.dir} />
      ))}
    </svg>
  );
}
