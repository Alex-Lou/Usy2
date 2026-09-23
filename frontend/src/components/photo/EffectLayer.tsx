import type { ReactNode } from "react";
import { useInView } from "../../hooks/useInView";
import { particleOf } from "./effects";

// Fixed pseudo-random layout so particles look scattered but never jump between renders.
const SPOTS = [8, 22, 37, 51, 64, 78, 90, 15, 44, 70].map((left, i) => ({
  left,
  delay: (i * 0.53) % 3,
  duration: 3.2 + (i % 4) * 0.6,
  size: 14 + (i % 3) * 6,
}));

/**
 * Plays a photo's animated effect around whatever it wraps (the photo itself,
 * or the studio preview). Pure CSS; paused off screen and for reduced motion.
 */
export function EffectLayer({ effect, children, className = "" }: { effect?: string | null; children: ReactNode; className?: string }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const particle = particleOf(effect);
  // Same element structure with or without an effect, so switching effects
  // never remounts the photo (e.g. the studio's canvas).
  return (
    <div ref={ref} className={`relative overflow-hidden ${inView ? "" : "mc-paused"} ${className}`}>
      <div className={effect ? `fx-${effect}` : undefined}>{children}</div>
      {particle && (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {/* Each particle rides a full-height column, so % moves scale with the photo. */}
          {SPOTS.map((s, i) => (
            <span
              key={i}
              className={`fx-col fx-col--${effect}`}
              style={{ left: `${s.left}%`, fontSize: s.size, animationDelay: `${s.delay}s`, animationDuration: `${s.duration}s` }}
            >
              <span className="block">{particle}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
