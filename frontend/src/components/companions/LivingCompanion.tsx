import { useEffect, useRef, useState, type RefObject } from "react";
import { CompanionBody } from "./bodies";
import { BUBBLE_LIFE, CompanionBrain, type BubbleKind, type Kind } from "./brain";

const BUBBLE: Record<BubbleKind, string> = { z: "z", note: "♪", heart: "♥", howl: "Aouuu" };
const BUBBLE_COLOR: Record<BubbleKind, string> = { z: "#7cc6e8", note: "#b18cff", heart: "#ff86b8", howl: "#a9b8ff" };
// The feet sink a little into the ground (and its shadow) so they touch it.
const SINK = 1.5;
const HEAD_TOP: Record<Kind, number> = { penguin: 66, wolf: 58, cat: 58, otter: 48 };
/** Relative sizes, so the wolf stands a little taller than the kitten and the penguin. */
const SIZE: Record<Kind, number> = { penguin: 1, wolf: 1.2, cat: 1.05, otter: 1.05 };
const LABEL: Record<Kind, string> = { penguin: "le pingouin", wolf: "le loup", cat: "le chat", otter: "la loutre" };

/** Where a companion lives: the house (same 400×300 box as Room) or a side-menu tile. */
export const SCENES = {
  house: { width: 400, height: 300, ground: 262, minX: 60, maxX: 345, scale: 0.8 },
  tile: { width: 200, height: 96, ground: 88, minX: 30, maxX: 170, scale: 0.85 },
} as const;

/** The companions that can live in the house or a side-menu tile. */
export const LIVING_KINDS: Kind[] = ["penguin", "wolf", "cat", "otter"];
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
    let acc = 0;
    let visible = true;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 30;
      last = now;
      acc += dt;
      if (acc < 1 / 30) return; // 30 fps is plenty
      const friend = friendRef?.current?.getBBox();
      brainRef.current!.update(acc, {
        minX: box.minX,
        maxX: box.maxX,
        night: isNight(),
        reduced,
        friend: friend && friend.width > 0 ? { left: friend.x, right: friend.x + friend.width } : null,
      });
      acc = 0;
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
      <ellipse cx={b.x} cy={box.ground + 1} rx={(kind === "penguin" ? 16 : 22) * s + b.lying * 8 * s} ry={3 * s} fill="#000" opacity="0.14" />
      <g
        transform={`translate(${b.x} ${box.ground + SINK + b.lift}) scale(${b.dir * s} ${s})`}
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
        <text
          key={bub.id}
          x={bub.x + (bub.kind === "z" ? 10 + bub.age * 8 : bub.kind === "howl" ? b.dir * 18 : Math.sin(bub.age * 5) * 4)}
          y={box.ground - HEAD_TOP[kind] * s - bub.age * 22}
          fontSize={bub.kind === "z" ? 12 + bub.age * 4 : bub.kind === "howl" ? 11 : 14}
          fontWeight="bold"
          fontStyle={bub.kind === "howl" ? "italic" : undefined}
          fill={BUBBLE_COLOR[bub.kind]}
          opacity={Math.max(0, 1 - bub.age / BUBBLE_LIFE)}
          textAnchor="middle"
          aria-hidden="true"
        >
          {BUBBLE[bub.kind]}
        </text>
      ))}
    </svg>
  );
}
