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
const CONFETTI_COLORS = ["#ff4f7b", "#ffd45e", "#7cc6e8", "#9fe0a4", "#b18cff"];
const BURSTS = [
  { left: 25, top: 30, delay: 0, color: "#ffd45e" },
  { left: 70, top: 22, delay: 0.9, color: "#ff4f7b" },
  { left: 50, top: 55, delay: 1.7, color: "#7cc6e8" },
  { left: 80, top: 60, delay: 2.4, color: "#b18cff" },
];

/**
 * Plays a photo's animated effect around whatever it wraps (the photo itself,
 * or the studio preview). Pure CSS; paused off screen and for reduced motion.
 */
export function EffectLayer({ effect, children, className = "" }: { effect?: string | null; children: ReactNode; className?: string }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const particle = particleOf(effect);
  const whole = effect && !particle && !["confetti", "stars", "fireworks"].includes(effect) ? `fx-${effect}` : undefined;
  // Same element structure with or without an effect, so switching effects
  // never remounts the photo (e.g. the studio's canvas).
  return (
    <div ref={ref} className={`relative overflow-hidden ${inView ? "" : "mc-paused"} ${className}`}>
      <div className={whole}>{children}</div>
      {particle && (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {/* Each particle rides a full-height column, so % moves scale with the photo. */}
          {SPOTS.map((s, i) => (
            <span
              key={i}
              className={`fx-col fx-col--${particle.motion}`}
              style={{ left: `${s.left}%`, fontSize: s.size, animationDelay: `${s.delay}s`, animationDuration: `${particle.motion === "rain" ? s.duration / 3 : s.duration}s` }}
            >
              <span className={`block ${particle.motion === "sway" ? "fx-sway" : ""}`}>{particle.char}</span>
            </span>
          ))}
        </div>
      )}
      {effect === "confetti" && (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {SPOTS.concat(SPOTS.map((s) => ({ ...s, left: (s.left + 11) % 100, delay: s.delay + 1.3 }))).map((s, i) => (
            <span key={i} className="fx-col fx-col--fall" style={{ left: `${s.left}%`, animationDelay: `${s.delay}s`, animationDuration: `${s.duration}s` }}>
              <span className="fx-confetti block" style={{ background: CONFETTI_COLORS[i % CONFETTI_COLORS.length], animationDelay: `${s.delay}s` }} />
            </span>
          ))}
        </div>
      )}
      {effect === "stars" && (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span key={i} className="fx-shoot" style={{ top: `${10 + i * 22}%`, left: `${30 + i * 25}%`, animationDelay: `${i * 1.4}s` }} />
          ))}
        </div>
      )}
      {effect === "fireworks" && (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {BURSTS.map((b, i) => (
            <span key={i} className="fx-burst" style={{ left: `${b.left}%`, top: `${b.top}%`, color: b.color, animationDelay: `${b.delay}s` }} />
          ))}
        </div>
      )}
    </div>
  );
}
