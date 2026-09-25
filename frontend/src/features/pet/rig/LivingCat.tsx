import { useEffect, useRef, useState, type Ref } from "react";
import type { CatPose } from "../CatSprite";
import { CatBrain, type CatEnv, type CatEvent } from "./brain";
import { CatRig } from "./CatRig";
import { catSound } from "./sound";

/** The house scene's layout (same 400×300 box as Room.tsx). */
export const HOUSE = { width: 400, height: 300, ground: 262, minX: 70, maxX: 336, bowlX: 104, bedX: 330, bedLift: 15, scale: 0.8 };

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Moka, alive: runs the brain at up to 60 frames a second and draws it. The
 * loop sleeps while the cat is off screen or the app is in the background.
 * "house": fills the room (same box as Room) and walks around; "stage": a
 * small cat in place (Messages card).
 */
export function LivingCat({
  mode,
  pose,
  wearing,
  pointer = null,
  sound = false,
  size = 104,
  catRef,
  onTap,
  label,
}: {
  mode: "house" | "stage";
  pose: CatPose;
  wearing: string[];
  /** Laser dot, in scene coordinates (house). */
  pointer?: { x: number; y: number } | null;
  /** Play the cat's sounds (only where the person turned them on). */
  sound?: boolean;
  /** Stage mode width in px. */
  size?: number;
  /** The cat's own shape, e.g. to know whether a finger is rubbing it. */
  catRef?: Ref<SVGGElement>;
  onTap?: () => void;
  label: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const brainRef = useRef<CatBrain | null>(null);
  if (!brainRef.current) brainRef.current = new CatBrain(mode === "house" ? (HOUSE.minX + HOUSE.maxX) / 2 : 80);
  const env = useRef<CatEnv>();
  env.current = {
    mode,
    pose,
    pointer,
    minX: mode === "house" ? HOUSE.minX : 80,
    maxX: mode === "house" ? HOUSE.maxX : 80,
    ground: mode === "house" ? HOUSE.ground : 131,
    scale: mode === "house" ? HOUSE.scale : 1,
    bowlX: mode === "house" ? HOUSE.bowlX : null,
    bedX: mode === "house" ? HOUSE.bedX : null,
    bedLift: mode === "house" ? HOUSE.bedLift : 0,
    reduced: prefersReducedMotion(),
  };
  const soundOn = useRef(sound);
  soundOn.current = sound;
  const [, redraw] = useState(0);

  // Sounds follow what the cat does.
  useEffect(() => {
    const brain = brainRef.current!;
    brain.onEvent = (e: CatEvent) => {
      if (!soundOn.current) return;
      if (e === "meow") catSound.meow();
      else if (e === "chirp") catSound.chirp();
      else if (e === "purr-start") catSound.purr(true);
      else if (e === "purr-stop") catSound.purr(false);
    };
    return () => {
      brain.onEvent = () => {};
      catSound.purr(false);
    };
  }, []);
  useEffect(() => {
    if (!sound) catSound.purr(false);
  }, [sound]);

  // The animation loop: paused off screen and in the background.
  useEffect(() => {
    let raf = 0;
    let last = 0;
    let visible = true;
    const minStep = mode === "stage" ? 1 / 40 : 0; // the small card doesn't need 60 fps
    let acc = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      acc += dt;
      if (acc < minStep) return;
      brainRef.current!.update(acc, env.current!);
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
  }, [mode]);

  const f = brainRef.current.frame;
  const cat = (
    <g
      ref={catRef}
      onClick={onTap}
      role={onTap ? "button" : "img"}
      tabIndex={onTap ? 0 : undefined}
      aria-label={label}
      onKeyDown={(e) => {
        if (onTap && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onTap();
        }
      }}
      style={{ cursor: onTap ? "pointer" : undefined, outline: "none" }}
    >
      <CatRig f={f} wearing={wearing} ground={env.current.ground} scale={env.current.scale} />
    </g>
  );

  if (mode === "house") {
    return (
      <svg
        ref={svgRef}
        viewBox={`0 0 ${HOUSE.width} ${HOUSE.height}`}
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-0 h-full w-full"
      >
        <Bowl x={HOUSE.bowlX} ground={HOUSE.ground} />
        {cat}
        {/* In the basket: its front rim passes in front of the cat. */}
        {f.lift < -4 && Math.abs(f.x - HOUSE.bedX) < 30 && (
          <path d="M283 246 q47 7 94 0 l-6 16 q-41 11 -82 0 z" fill="#c98f5f" stroke="#4a3b33" strokeWidth="2.6" strokeLinejoin="round" />
        )}
      </svg>
    );
  }
  return (
    <svg ref={svgRef} width={size} height={size * 0.875} viewBox="0 0 160 140" overflow="visible">
      {cat}
    </svg>
  );
}

/** The food bowl on the floor of the house. */
function Bowl({ x, ground }: { x: number; ground: number }) {
  return (
    <g transform={`translate(${x} ${ground})`} aria-hidden="true">
      <ellipse cx="0" cy="1" rx="22" ry="4" fill="#000" opacity="0.14" />
      <path d="M-20 -12 h40 l-5 12 h-30 z" fill="#7cc6e8" stroke="#4a3b33" strokeWidth="2.2" strokeLinejoin="round" />
      <g fill="#c07a3e" stroke="#4a3b33" strokeWidth="1">
        <circle cx="-8" cy="-14" r="2.8" />
        <circle cx="0" cy="-15" r="2.8" />
        <circle cx="8" cy="-14" r="2.6" />
      </g>
    </g>
  );
}
