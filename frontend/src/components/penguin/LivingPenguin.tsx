import { useEffect, useRef, useState, type RefObject } from "react";
import { PenguinHead } from "../ui/animals";
import { PenguinBrain, type BubbleKind } from "./brain";

const OUTLINE = "#4a3b33";
const NAVY = "#2b2d42";
const CREAM = "#fffaf2";
const ORANGE = "#f4a93b";
const BUBBLE: Record<BubbleKind, string> = { z: "z", note: "♪", heart: "♥" };
const BUBBLE_COLOR: Record<BubbleKind, string> = { z: "#7cc6e8", note: "#b18cff", heart: "#ff86b8" };

/** Where the penguin lives: the house (same 400×300 box as Room) or a side-menu tile. */
export const PENGUIN_SCENES = {
  house: { width: 400, height: 300, ground: 262, minX: 60, maxX: 345, scale: 0.8 },
  tile: { width: 200, height: 96, ground: 88, minX: 26, maxX: 174, scale: 0.85 },
} as const;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

const isNight = () => {
  const h = new Date().getHours();
  return h >= 20 || h < 7;
};

/**
 * The penguin, alive: it waddles, belly-slides, flaps, naps and, in the house,
 * visits Moka (`friendRef`: the cat's shape in the same scene). A tap makes it
 * hop with a note or a heart. The loop sleeps off screen and in the background.
 */
export function LivingPenguin({ scene, friendRef }: { scene: keyof typeof PENGUIN_SCENES; friendRef?: RefObject<SVGGElement> }) {
  const box = PENGUIN_SCENES[scene];
  const svgRef = useRef<SVGSVGElement>(null);
  const brainRef = useRef<PenguinBrain | null>(null);
  if (!brainRef.current) brainRef.current = new PenguinBrain(box.minX + (box.maxX - box.minX) * 0.3);
  const [, redraw] = useState(0);

  useEffect(() => {
    const brain = brainRef.current!;
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
      if (acc < 1 / 30) return; // 30 fps is plenty for a penguin
      const friend = friendRef?.current?.getBBox();
      brain.update(acc, {
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
  }, [box, friendRef]);

  const b = brainRef.current;
  const s = box.scale;
  // Lying down: the body turns forward around its middle, then rests on the floor.
  const lie = b.lying * 80;
  const drop = b.lying * 10;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${box.width} ${box.height}`}
      preserveAspectRatio={scene === "house" ? "xMidYMax slice" : "xMidYMid meet"}
      className={scene === "house" ? "pointer-events-none absolute inset-0 h-full w-full" : "block h-auto w-full"}
      data-penguin=""
      data-state={b.state}
    >
      {scene === "tile" && (
        // A little ice floe to waddle on.
        <path d={`M8 ${box.ground - 2} q92 -9 184 0 l-4 7 q-88 6 -176 0 z`} fill="#dff3ff" stroke="#a9d8f0" strokeWidth="1.5" />
      )}
      <ellipse cx={b.x} cy={box.ground + 1} rx={16 * s + b.lying * 10 * s} ry={3 * s} fill="#000" opacity="0.14" />
      <g
        transform={`translate(${b.x} ${box.ground + b.lift}) scale(${b.dir * s} ${s})`}
        onClick={() => b.poke()}
        role="button"
        tabIndex={0}
        aria-label="Toucher le pingouin"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            b.poke();
          }
        }}
        style={{ cursor: "pointer", outline: "none", pointerEvents: "auto" }}
      >
        <g transform={`translate(0 ${drop}) rotate(${b.tilt + lie} 0 -22)`}>
          <ellipse cx="-7" cy="-1" rx="6.5" ry="3" fill={ORANGE} stroke={OUTLINE} strokeWidth="1.4" />
          <ellipse cx="7" cy="-1" rx="6.5" ry="3" fill={ORANGE} stroke={OUTLINE} strokeWidth="1.4" />
          <ellipse cx="0" cy="-24" rx="17" ry="22" fill={NAVY} stroke={OUTLINE} strokeWidth="2" />
          <ellipse cx="0" cy="-21" rx="11" ry="15" fill={CREAM} />
          <path transform={`rotate(${-b.flap} -15 -34)`} d="M-15 -36 q-10 7 -9 22 q7 -3 11 -15 z" fill={NAVY} stroke={OUTLINE} strokeWidth="1.6" strokeLinejoin="round" />
          <path transform={`rotate(${b.flap} 15 -34)`} d="M15 -36 q10 7 9 22 q-7 -3 -11 -15 z" fill={NAVY} stroke={OUTLINE} strokeWidth="1.6" strokeLinejoin="round" />
          <g transform="translate(-19 -78) scale(0.59)">
            <PenguinHead eyesClosed={b.eyesClosed} />
          </g>
        </g>
      </g>
      {b.bubbles.map((bub) => (
        <text
          key={bub.id}
          x={bub.x + (bub.kind === "z" ? 10 + bub.age * 8 : Math.sin(bub.age * 5) * 4)}
          y={box.ground - 62 * s - bub.age * 22}
          fontSize={bub.kind === "z" ? 12 + bub.age * 4 : 14}
          fontWeight="bold"
          fill={BUBBLE_COLOR[bub.kind]}
          opacity={Math.max(0, 1 - bub.age / 1.6)}
          textAnchor="middle"
          aria-hidden="true"
        >
          {BUBBLE[bub.kind]}
        </text>
      ))}
    </svg>
  );
}
